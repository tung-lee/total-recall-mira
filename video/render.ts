/**
 * Renders the showreel: bundles video/film, serves it, steps time frame by frame in headless Chromium, encodes
 * with ffmpeg, and mixes the music bed with the film's sound cues.
 *   node video/render.ts                   → artifacts/mira-showreel.mp4 (1080p60)
 *   node video/render.ts --stills 3,20.5   → video/.build/stills/*.png
 *   node video/render.ts --fps 30 --workers 6
 *   node video/render.ts --mux-only        → re-encode and re-mix from the last render's segments
 * Needs video/.build/shots (node video/shots.ts) and ffmpeg.
 */
import { type ChildProcess, spawn } from "node:child_process";
import { createReadStream, existsSync, mkdirSync, writeFileSync } from "node:fs";
import http from "node:http";
import { basename, extname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium, type Page } from "playwright";
import { library, mixCues, SR } from "./sfx.ts";

const ROOT = new URL("..", import.meta.url).pathname;
const BUILD = join(ROOT, "video", ".build");
const OUT = join(ROOT, "artifacts", "mira-showreel.mp4");
const args = process.argv.slice(2);
const opt = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const FPS = Number(opt("fps") ?? 60);
const WORKERS = Number(opt("workers") ?? 4);
const stills = opt("stills");
const muxOnly = args.includes("--mux-only");

type EsbuildApi = { build(o: Record<string, unknown>): Promise<{ outputFiles: Array<{ text: string }> }> };
const esbuild = (await import(pathToFileURL(join(ROOT, "web", "node_modules", "esbuild", "lib", "main.js")).href)) as EsbuildApi;
const bundle = await esbuild.build({
  entryPoints: [join(ROOT, "video", "film", "main.ts")],
  bundle: true,
  write: false,
  format: "iife",
  platform: "browser",
  target: "chrome120",
  nodePaths: [join(ROOT, "web", "node_modules")],
});
const js = bundle.outputFiles[0]?.text ?? "";

const FONT_DIRS = ["inter-tight", "caveat"].map((f) => join(ROOT, "web", "node_modules", "@fontsource", f, "files"));
const TYPES: Record<string, string> = { ".png": "image/png", ".woff2": "font/woff2", ".html": "text/html", ".js": "text/javascript" };
const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? "/", "http://x");
  const send = (file: string) => {
    if (!existsSync(file)) return void res.writeHead(404).end();
    res.writeHead(200, { "Content-Type": TYPES[extname(file)] ?? "application/octet-stream" });
    createReadStream(file).pipe(res);
  };
  if (url.pathname === "/") return send(join(ROOT, "video", "film", "index.html"));
  if (url.pathname === "/film.js") return void res.writeHead(200, { "Content-Type": "text/javascript" }).end(js);
  if (url.pathname.startsWith("/fonts/")) {
    const name = basename(url.pathname);
    const dir = FONT_DIRS.find((d) => existsSync(join(d, name)));
    return dir ? send(join(dir, name)) : void res.writeHead(404).end();
  }
  if (url.pathname.startsWith("/shots/")) return send(join(BUILD, "shots", basename(url.pathname)));
  res.writeHead(404).end();
});
await new Promise<void>((r) => server.listen(0, r));
const address = server.address();
const base = `http://localhost:${typeof address === "object" && address ? address.port : 0}/`;

const browser = await chromium.launch({ args: ["--force-color-profile=srgb", "--font-render-hinting=none"] });
async function openFilm(): Promise<Page> {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base);
  await page.waitForFunction(() => window.FILM !== undefined);
  await page.evaluate(() => window.FILM.ready);
  if (errors.length) throw new Error(`film errors: ${errors.join("; ")}`);
  return page;
}

function ffmpeg(argv: string[]): ChildProcess {
  return spawn("ffmpeg", ["-loglevel", "error", "-y", ...argv], { stdio: ["pipe", "inherit", "inherit"] });
}
const done = (p: ChildProcess) => new Promise<void>((res, rej) => p.on("close", (code) => (code === 0 ? res() : rej(new Error(`ffmpeg exited ${code}`)))));

try {
  const first = await openFilm();
  const { duration, cues } = await first.evaluate(() => ({ duration: window.FILM.duration, cues: window.FILM.cues }));

  if (stills) {
    const dir = join(BUILD, "stills");
    mkdirSync(dir, { recursive: true });
    for (const t of stills.split(",").map(Number)) {
      await first.evaluate((tt) => window.FILM.render(tt), t);
      await first.screenshot({ path: join(dir, `t-${t.toFixed(2).padStart(6, "0")}.png`) });
      console.log("still", t);
    }
  } else {
    const frames = Math.round(duration * FPS);
    console.log(`${duration.toFixed(2)} s, ${frames} frames at ${FPS} fps, ${WORKERS} workers, ${cues.length} sound cues`);
    mkdirSync(join(BUILD, "segments"), { recursive: true });
    const per = Math.ceil(frames / WORKERS);
    const started = Date.now();
    let rendered = 0;
    const segments = await Promise.all(
      Array.from({ length: WORKERS }, async (_, w) => {
        if (muxOnly) return join(BUILD, "segments", `seg-${w}.mp4`);
        const page = w === 0 ? first : await openFilm();
        const from = w * per;
        const to = Math.min(frames, from + per);
        const file = join(BUILD, "segments", `seg-${w}.mp4`);
        const enc = ffmpeg(["-f", "image2pipe", "-framerate", String(FPS), "-c:v", "mjpeg", "-i", "-", "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-pix_fmt", "yuv420p", "-r", String(FPS), file]);
        for (let f = from; f < to; f++) {
          await page.evaluate((tt) => window.FILM.render(tt), f / FPS);
          const jpg = await page.screenshot({ type: "jpeg", quality: 94 });
          if (!enc.stdin?.write(jpg)) await new Promise((r) => enc.stdin?.once("drain", r));
          rendered++;
          if (rendered % 300 === 0) console.log(`  ${rendered}/${frames} frames, ${((Date.now() - started) / 1000).toFixed(0)} s`);
        }
        enc.stdin?.end();
        await done(enc);
        return file;
      }),
    );
    writeFileSync(join(BUILD, "segments", "list.txt"), segments.map((f) => `file '${f}'`).join("\n"));

    const lib = library(ROOT);
    const fx = mixCues(cues, duration, lib);
    const fxFile = join(BUILD, "sfx.f32");
    writeFileSync(fxFile, Buffer.from(fx.buffer));
    mkdirSync(join(ROOT, "artifacts"), { recursive: true });
    const fadeAt = (duration - 3.5).toFixed(2);
    const mux = ffmpeg([
      "-f", "concat", "-safe", "0", "-i", join(BUILD, "segments", "list.txt"),
      "-i", join(ROOT, "assets", "audio", "bed.mp3"),
      "-f", "f32le", "-ar", String(SR), "-ac", "1", "-i", fxFile,
      "-filter_complex",
      `[1:a]atrim=0:${duration.toFixed(3)},afade=t=in:d=0.3,afade=t=out:st=${fadeAt}:d=3.5,volume=0.8[m];[2:a]aformat=channel_layouts=stereo[f];[m][f]amix=inputs=2:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[a]`,
      "-map", "0:v", "-map", "[a]",
      "-c:v", "libx264", "-preset", "slow", "-crf", "19", "-maxrate", "20M", "-bufsize", "40M", "-pix_fmt", "yuv420p", "-r", String(FPS),
      "-c:a", "aac", "-b:a", "256k", "-movflags", "+faststart", "-shortest", OUT,
    ]);
    mux.stdin?.end();
    await done(mux);
    console.log(`wrote ${OUT} in ${((Date.now() - started) / 1000).toFixed(0)} s`);
  }
} finally {
  await browser.close();
  server.close();
}
