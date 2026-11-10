/**
 * Real screens of the app for the showreel's montage. Start screens come from a local server on the live keys
 * in .env (read-only: opening the chat only recalls). Screens with data come from a local server in preview
 * mode, so no test data reaches mainnet. Writes video/.build/shots/*.png.
 *   node video/shots.ts
 */
import { type ChildProcess, spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium, type Page } from "playwright";

const ROOT = new URL("..", import.meta.url).pathname;
const OUT = join(ROOT, "video", ".build", "shots");
const PORT = 8794;
const LIVE_PORT = 8793;
const LIVE = `http://localhost:${LIVE_PORT}`;
const T = 15_000;

async function server(port: number, preview: boolean): Promise<ChildProcess> {
  const env = { ...process.env, PORT: String(port), LOG_LEVEL: "warn", ...(preview ? { MIRA_PREVIEW: "1" } : {}) };
  const child = spawn(process.execPath, ["server/src/index.ts"], { cwd: ROOT, env, stdio: "ignore" });
  for (let i = 0; i < 50; i++) {
    if (await fetch(`http://localhost:${port}/api/health`).then((r) => r.ok, () => false)) return child;
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error("server didn't start");
}

async function idle(page: Page) {
  await page.locator(".bubble.typing").waitFor({ state: "detached", timeout: T });
  await page.waitForFunction(() => !document.querySelector(".chip:disabled") && !document.querySelector(".trace li.run"), null, { timeout: T });
  await page.waitForTimeout(700);
}

async function send(page: Page, text: string) {
  await idle(page);
  await page.getByLabel("Message Mira").fill(text);
  await page.getByLabel("Send").click();
  await page.locator(".row.me .bubble", { hasText: text }).last().waitFor({ timeout: T });
  await idle(page);
}

async function shoot(page: Page, name: string, selector = ".screen") {
  await page.locator(selector).screenshot({ path: join(OUT, `${name}.png`) });
  console.log("  ✓", name);
}

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const phone = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true };
const desk = { viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 };

console.log("live keys (read-only)");
const live = await server(LIVE_PORT, false);
try {
  const p = await (await browser.newContext(phone)).newPage();
  await p.goto(`${LIVE}/#/chat`);
  await p.getByText("start with a budget").waitFor({ timeout: 30_000 });
  await idle(p);
  await shoot(p, "live-phone-start", "body");
  const d = await (await browser.newContext(desk)).newPage();
  await d.goto(`${LIVE}/#/chat`);
  await d.getByText("start with a budget").waitFor({ timeout: 30_000 });
  await idle(d);
  await d.screenshot({ path: join(OUT, "live-desktop-start.png") });
  console.log("  ✓ live-desktop-start");
  await d.goto(LIVE);
  await d.waitForTimeout(1500);
  await d.screenshot({ path: join(OUT, "live-landing.png") });
  console.log("  ✓ live-landing");
} finally {
  live.kill();
}

console.log("preview (local)");
const srv = await server(PORT, true);
try {
  const base = `http://localhost:${PORT}`;
  const p = await (await browser.newContext(phone)).newPage();
  await p.goto(`${base}/#/chat`);
  await p.getByText("start with a budget").waitFor({ timeout: T });
  for (const m of ["budget 400 a month", "saving 1200 for tokyo by march", "cap eating out at 60 a week"]) await send(p, m);
  for (const m of ["coffee 5.5", "uber 18", "ramen 24"]) await send(p, m);
  await shoot(p, "thread-receipts", ".thread");
  await send(p, "coffee counts as eating out");
  await send(p, "coffee 4");
  await shoot(p, "thread-rule", ".thread");
  await send(p, "should i buy the $48 serum?");
  await shoot(p, "thread-advice", ".thread");
  await p.locator(".chip", { hasText: "skip it, move $41 to tokyo" }).click();
  await idle(p);
  await p.waitForTimeout(800);
  await shoot(p, "thread-moved", ".thread");
  await send(p, "thinking about a 38 lipstick");
  await shoot(p, "thread-learned", ".thread");
  await p.locator(".chip", { hasText: "skip it" }).click();
  await idle(p);
  await send(p, "what do you know about me?");
  await p.waitForTimeout(800);
  await shoot(p, "thread-memory", ".thread");
  const code = await p.evaluate(() => JSON.parse(localStorage.getItem("mira.device.v1") ?? "{}").user as string);

  const d = await (await browser.newContext(desk)).newPage();
  await d.goto(`${base}/#/chat?me=${code}`);
  await d.getByText("i remember you").waitFor({ timeout: T });
  await idle(d);
  await d.screenshot({ path: join(OUT, "desktop-restored.png") });
  console.log("  ✓ desktop-restored");

  const p2 = await (await browser.newContext(phone)).newPage();
  await p2.goto(`${base}/#/chat?me=${code}`);
  await p2.getByText("i remember you").waitFor({ timeout: T });
  await idle(p2);
  await p2.locator(".thread").evaluate((el) => el.scrollTo({ top: 0 }));
  await p2.waitForTimeout(400);
  await shoot(p2, "thread-restored", ".thread");
} finally {
  await browser.close();
  srv.kill();
}
