// The showreel's timeline: fifty bars of the music bed, eleven scenes, and the cuts between them.
// The renderer calls window.FILM.render(t) for every frame and reads window.FILM.cues for the sound mix.
import { barAt, cues, ease, h, prog, rng, type Scene } from "./lib.ts";
import { coldOpen, problem, title } from "./scenes-open.ts";
import { learning, privacy } from "./scenes-memory.ts";
import { hood, montage, newDevice, outro } from "./scenes-end.ts";
import { phoneAct } from "./scenes-phone.ts";
import { threads } from "./ui.ts";

type Kind = "flash" | "wipe" | "iris" | "push" | "cut";
interface Cut {
  kind: Kind;
  color: string;
  x?: number;
  y?: number;
}

const stage = document.getElementById("stage") as HTMLElement;
const plan: Array<[(s: HTMLElement, a: number, b: number) => Scene, number, Cut]> = [
  [coldOpen, 3, { kind: "flash", color: "#ffffff" }],
  [title, 3, { kind: "wipe", color: "#0c0c0d" }],
  [problem, 4, { kind: "iris", color: "#f6f5f1", x: 960, y: 540 }],
  [phoneAct, 13, { kind: "iris", color: "#110a20", x: 640, y: 880 }],
  [learning, 7, { kind: "wipe", color: "#f3edff" }],
  [privacy, 5, { kind: "push", color: "" }],
  [newDevice, 4, { kind: "iris", color: "#08080a", x: 1460, y: 560 }],
  [montage, 4, { kind: "flash", color: "#d6e9ff" }],
  [hood, 4, { kind: "flash", color: "#ffffff" }],
  [outro, 3, { kind: "cut", color: "" }],
];

const scenes: Scene[] = [];
const cuts: Array<Cut & { at: number }> = [];
let bar = 0;
for (const [make, bars, cut] of plan) {
  const start = barAt(bar);
  bar += bars;
  const end = barAt(bar);
  const scene = make(stage, start, end);
  scene.root.style.zIndex = String(scenes.length + 1);
  scenes.push(scene);
  cuts.push({ ...cut, at: end });
}
const DURATION = barAt(bar);

const wipe = h("div", "wipe", stage);
const flash = h("div", "flash", stage);
const grain = h("div", "grain", stage);
h("div", "vignette", stage);

function noise(): string {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d");
  if (!ctx) return "";
  const img = ctx.createImageData(256, 256);
  const r = rng(99);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(r() * 255);
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return c.toDataURL();
}
grain.style.backgroundImage = `url(${noise()})`;

const IRIS = 0.65;
const PUSH = 0.6;

function render(t: number): void {
  scenes.forEach((sc, i) => {
    const before = i > 0 ? cuts[i - 1] : undefined;
    const after = cuts[i];
    const lingers = after && (after.kind === "iris" || after.kind === "push") ? (after.kind === "iris" ? IRIS : PUSH) : 0;
    const visible = t >= sc.start && t < sc.end + lingers;
    sc.root.style.display = visible ? "" : "none";
    sc.root.style.clipPath = "";
    sc.root.style.transform = "";
    if (!visible) return;
    if (before?.kind === "iris" && t < sc.start + IRIS) {
      const r = ease.inOutCubic(prog(t, sc.start, IRIS)) * 2300;
      sc.root.style.clipPath = `circle(${r.toFixed(1)}px at ${before.x ?? 960}px ${before.y ?? 540}px)`;
    }
    if (before?.kind === "push" && t < sc.start + PUSH) sc.root.style.transform = `translateX(${(1 - ease.inOutExpo(prog(t, sc.start, PUSH))) * 1920}px)`;
    if (after?.kind === "push" && t >= sc.end) sc.root.style.transform = `translateX(${-ease.inOutExpo(prog(t, sc.end, PUSH)) * 1920}px)`;
    sc.render(t);
  });

  let fo = 0;
  let fc = "#fff";
  let wx = 2400;
  let wc = "#000";
  for (const c of cuts) {
    if (c.kind === "flash" && t > c.at - 0.25 && t < c.at + 0.6) {
      fo = t < c.at ? ease.inCubic(prog(t, c.at - 0.25, 0.25)) : 1 - ease.outCubic(prog(t, c.at, 0.6));
      fc = c.color;
    }
    if (c.kind === "wipe" && t > c.at - 0.35 && t < c.at + 0.4) {
      wx = t < c.at ? (1 - ease.inCubic(prog(t, c.at - 0.35, 0.35))) * 2400 : -ease.outCubic(prog(t, c.at, 0.4)) * 2600;
      wc = c.color;
    }
  }
  flash.style.background = fc;
  flash.style.opacity = fo.toFixed(3);
  wipe.style.background = wc;
  wipe.style.display = wx > 2300 || wx < -2500 ? "none" : "";
  wipe.style.transform = `translateX(${wx.toFixed(1)}px) skewX(-14deg) scaleX(1.4)`;
  const dark = scenes.find((s) => t >= s.start && t < s.end)?.root.classList.contains("dark") ?? false;
  grain.classList.toggle("on-dark", dark);
  const f = Math.floor(t * 24);
  grain.style.backgroundPosition = `${(f * 73) % 256}px ${(f * 151) % 256}px`;
}

async function ready(): Promise<void> {
  const weights = ["400", "500", "600", "700", "800", "900"];
  await Promise.all([...weights.map((w) => document.fonts.load(`${w} 40px "Inter Tight"`)), document.fonts.load('700 40px "Caveat"'), document.fonts.load('600 40px "Caveat"')]);
  await document.fonts.ready;
  await Promise.all(Array.from(document.images).map((img) => (img.complete ? img.decode().catch(() => undefined) : new Promise((r) => img.addEventListener("load", r, { once: true })))));
  for (const sc of scenes) sc.root.style.display = "";
  for (const th of threads) th.measure();
  render(0);
}

declare global {
  interface Window {
    FILM: { duration: number; cues: typeof cues; ready: Promise<void>; render: (t: number) => void };
  }
}
window.FILM = { duration: DURATION, cues, ready: Promise.resolve(), render };
window.FILM.ready = ready();

const q = new URLSearchParams(location.search).get("t");
if (q) void window.FILM.ready.then(() => render(Number(q)));
