// The film's toolkit: time grid, easing, deterministic randomness, DOM builders, and the sound cue sheet.
// Everything is a pure function of time, so any frame renders the same way twice.

export const W = 1920;
export const H = 1080;

/** The music bed: 99.39 BPM, first beat at 10 ms (measured from assets/audio/bed.mp3). */
export const BEAT = 0.6037;
export const PHASE = 0.01;
export const beatAt = (n: number) => PHASE + n * BEAT;
export const barAt = (n: number) => beatAt(n * 4);

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
/** Progress through [start, start + dur], clamped to 0..1. */
export const prog = (t: number, start: number, dur: number) => (dur <= 0 ? (t >= start ? 1 : 0) : clamp((t - start) / dur));

export const ease = {
  linear: (p: number) => p,
  inCubic: (p: number) => p * p * p,
  outCubic: (p: number) => 1 - (1 - p) ** 3,
  inOutCubic: (p: number) => (p < 0.5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2),
  outQuint: (p: number) => 1 - (1 - p) ** 5,
  outExpo: (p: number) => (p >= 1 ? 1 : 1 - 2 ** (-10 * p)),
  inExpo: (p: number) => (p <= 0 ? 0 : 2 ** (10 * p - 10)),
  inOutExpo: (p: number) => (p <= 0 ? 0 : p >= 1 ? 1 : p < 0.5 ? 2 ** (20 * p - 10) / 2 : (2 - 2 ** (-20 * p + 10)) / 2),
  outBack: (p: number, s = 1.70158) => 1 + (s + 1) * (p - 1) ** 3 + s * (p - 1) ** 2,
  inBack: (p: number, s = 1.70158) => (s + 1) * p ** 3 - s * p * p,
};

/** A damped spring from 0 to 1 over seconds since `start` (overshoots, then settles). */
export function spring(t: number, start: number, freq = 2.2, decay = 7): number {
  const x = t - start;
  if (x <= 0) return 0;
  return 1 - Math.exp(-decay * x) * Math.cos(2 * Math.PI * freq * x);
}

/** 0..1 that rises over `inDur` from `a`, holds, and falls over `outDur` ending at `b`. */
export function window_(t: number, a: number, b: number, inDur = 0.3, outDur = 0.3, e = ease.outCubic): number {
  if (t < a || t > b) return 0;
  return Math.min(e(prog(t, a, inDur)), 1 - ease.inCubic(prog(t, b - outDur, outDur)));
}

/** A short bump at a beat: 1 at the hit, decaying. */
export const pulse = (t: number, at: number, decay = 8) => (t < at ? 0 : Math.exp(-decay * (t - at)));

export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let r = Math.imul(a ^ (a >>> 15), 1 | a);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

type Attrs = Record<string, string | number>;

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, cls = "", parent?: Element, html?: string): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (html !== undefined) el.innerHTML = html;
  parent?.appendChild(el);
  return el;
}

const SVGNS = "http://www.w3.org/2000/svg";
export function s<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Attrs = {}, parent?: Element): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  parent?.appendChild(el);
  return el;
}

export interface Pose {
  x?: number;
  y?: number;
  s?: number;
  sx?: number;
  sy?: number;
  r?: number;
  rx?: number;
  ry?: number;
  z?: number;
  o?: number;
  blur?: number;
  /** Anchor the element's centre at (x, y). Default true. */
  center?: boolean;
}

/** Places an absolutely positioned element. (x, y) is its centre unless `center` is false. */
export function pose(el: HTMLElement | SVGElement, p: Pose): void {
  const { x = 0, y = 0, s: sc = 1, sx = 1, sy = 1, r = 0, rx = 0, ry = 0, z = 0, o = 1, blur = 0, center = true } = p;
  const parts = [`translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, ${z.toFixed(1)}px)`];
  if (center) parts.push("translate(-50%, -50%)");
  if (rx) parts.push(`rotateX(${rx.toFixed(2)}deg)`);
  if (ry) parts.push(`rotateY(${ry.toFixed(2)}deg)`);
  if (r) parts.push(`rotate(${r.toFixed(2)}deg)`);
  parts.push(`scale(${(sc * sx).toFixed(4)}, ${(sc * sy).toFixed(4)})`);
  el.style.transform = parts.join(" ");
  el.style.opacity = o >= 0.999 ? "" : o.toFixed(3);
  el.style.filter = blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : "";
  el.style.visibility = o <= 0.001 ? "hidden" : "";
}

export const show = (el: HTMLElement | SVGElement, on: boolean) => {
  el.style.display = on ? "" : "none";
};

/** Wraps each character (or word) in a span for per-letter animation. */
export function split(el: HTMLElement, text: string, by: "chars" | "words" = "chars"): HTMLSpanElement[] {
  el.textContent = "";
  const parts = by === "chars" ? Array.from(text) : text.split(/(\s+)/);
  return parts.map((part) => {
    const span = h("span", part.trim() ? "piece" : "gap", el);
    span.textContent = part;
    return span;
  });
}

/** Characters of `text` revealed by progress p, with a blinking caret while typing. */
export function typed(text: string, p: number): string {
  const n = Math.round(clamp(p) * text.length);
  return Array.from(text).slice(0, n).join("");
}

const GLYPHS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz0123456789";
/** A string that resolves from noise into `text` as p goes 0 → 1. */
export function scramble(text: string, p: number, seed = 1): string {
  const r = rng(seed + Math.floor(p * 24));
  return Array.from(text)
    .map((ch, i) => (ch === " " || i / text.length < p ? ch : GLYPHS[Math.floor(r() * GLYPHS.length)]))
    .join("");
}

export const money = (cents: number, decimals = cents % 100 !== 0) =>
  `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: decimals ? 2 : 0, maximumFractionDigits: decimals ? 2 : 0 })}`;

// ---------- sound ----------

export type SoundName = "pop" | "whoosh" | "ding" | "tick" | "type" | "impact" | "riser" | "coin" | "swish" | "blip" | "shimmer" | "thud" | "glitch";
export interface Cue {
  t: number;
  name: SoundName;
  gain: number;
}
export const cues: Cue[] = [];
/** Schedules a sound effect at absolute time t. */
export function sfx(t: number, name: SoundName, gain = 1): void {
  cues.push({ t, name, gain });
}

// ---------- the mascot ----------

export function blobSvg(color = "#9BE15D", size = 120): { root: SVGSVGElement; happy: SVGGElement; squint: SVGGElement; wink: SVGGElement } {
  const root = s("svg", { viewBox: "0 0 100 100", width: size, height: size });
  const defs = s("defs", {}, root);
  const id = `g${color.replace("#", "")}${Math.floor(size)}`;
  const grad = s("radialGradient", { id, cx: ".35", cy: ".3", r: ".8" }, defs);
  s("stop", { offset: "0", "stop-color": "#fff", "stop-opacity": ".55" }, grad);
  s("stop", { offset: ".35", "stop-color": color }, grad);
  s("stop", { offset: "1", "stop-color": color, "stop-opacity": ".85" }, grad);
  const pts: string[] = [];
  for (let i = 0; i < 24; i++) {
    const a = (Math.PI * i) / 12;
    const r = i % 2 === 0 ? 48 : 38;
    pts.push(`${50 + r * Math.cos(a)},${50 + r * Math.sin(a)}`);
  }
  s("polygon", { points: pts.join(" "), fill: `url(#${id})`, stroke: color, "stroke-width": 6, "stroke-linejoin": "round" }, root);
  const face = { stroke: "#1b1b1f", "stroke-width": 4.5, fill: "none", "stroke-linecap": "round" };
  const happy = s("g", face, root);
  s("path", { d: "M33 52 Q38 44 43 52" }, happy);
  s("path", { d: "M57 52 Q62 44 67 52" }, happy);
  const squint = s("g", face, root);
  s("path", { d: "M32 45 L42 50 L32 55" }, squint);
  s("path", { d: "M68 45 L58 50 L68 55" }, squint);
  const wink = s("g", face, root);
  s("path", { d: "M33 52 Q38 44 43 52" }, wink);
  s("circle", { cx: 62, cy: 49, r: 2.5, fill: "#1b1b1f" }, wink);
  s("path", { d: "M44 62 Q50 67 56 62" }, wink);
  squint.style.display = "none";
  wink.style.display = "none";
  return { root, happy, squint, wink };
}

export function mood(b: ReturnType<typeof blobSvg>, m: "happy" | "squint" | "wink"): void {
  b.happy.style.display = m === "happy" ? "" : "none";
  b.squint.style.display = m === "squint" ? "" : "none";
  b.wink.style.display = m === "wink" ? "" : "none";
}

/** A path drawn by progress p (needs the path's length). */
export function draw(path: SVGPathElement | SVGLineElement | SVGCircleElement, length: number, p: number): void {
  path.style.strokeDasharray = `${length}`;
  path.style.strokeDashoffset = `${length * (1 - clamp(p))}`;
}

export interface Scene {
  name: string;
  start: number;
  end: number;
  root: HTMLElement;
  render(t: number): void;
}
