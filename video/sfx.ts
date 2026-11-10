/**
 * Sound effects for the showreel: synthesised here, plus the three in assets/audio. Mono, 48 kHz, float.
 */
import { execFileSync } from "node:child_process";
import { join } from "node:path";

export const SR = 48_000;

function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let r = Math.imul(a ^ (a >>> 15), 1 | a);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function make(seconds: number, fn: (t: number, i: number) => number): Float32Array {
  const out = new Float32Array(Math.ceil(seconds * SR));
  for (let i = 0; i < out.length; i++) out[i] = fn(i / SR, i);
  return out;
}

function onePole(input: Float32Array, cutoff: (t: number) => number): Float32Array {
  const out = new Float32Array(input.length);
  let y = 0;
  for (let i = 0; i < input.length; i++) {
    const a = 1 - Math.exp((-2 * Math.PI * cutoff(i / SR)) / SR);
    y += a * ((input[i] ?? 0) - y);
    out[i] = y;
  }
  return out;
}

function noise(seconds: number, seed: number): Float32Array {
  const r = rng(seed);
  return make(seconds, () => r() * 2 - 1);
}

/** A sine whose frequency glides along f(t), with phase kept continuous. */
function glide(seconds: number, f: (t: number) => number, env: (t: number) => number): Float32Array {
  let phase = 0;
  return make(seconds, (t) => {
    phase += (2 * Math.PI * f(t)) / SR;
    return Math.sin(phase) * env(t);
  });
}

function mix(...parts: Array<[Float32Array, number]>): Float32Array {
  const len = Math.max(...parts.map(([p]) => p.length));
  const out = new Float32Array(len);
  for (const [p, g] of parts) for (let i = 0; i < p.length; i++) out[i] = (out[i] ?? 0) + (p[i] ?? 0) * g;
  return out;
}

const fadeOut = (s: Float32Array, ms = 8) => {
  const n = Math.floor((ms / 1000) * SR);
  for (let i = 0; i < n && i < s.length; i++) s[s.length - 1 - i] = (s[s.length - 1 - i] ?? 0) * (i / n);
  return s;
};

function synth(): Record<string, Float32Array> {
  const tick = mix([glide(0.04, () => 2600, (t) => Math.exp(-t / 0.008)), 0.5], [make(0.004, (t) => (rng(3)() * 2 - 1) * (1 - t / 0.004)), 0.4]);
  const type = (() => {
    const n = noise(0.03, 11);
    const hp = onePole(n, () => 2500);
    const body = make(0.03, (t, i) => ((n[i] ?? 0) - (hp[i] ?? 0) * 0.6) * Math.exp(-t / 0.005));
    return mix([body, 0.6], [glide(0.03, () => 1900, (t) => Math.exp(-t / 0.004)), 0.25]);
  })();
  const impact = (() => {
    const sub = glide(1.1, (t) => 38 + 70 * Math.exp(-t / 0.08), (t) => Math.exp(-t / 0.32));
    const crack = onePole(noise(0.12, 5), (t) => 3000 * Math.exp(-t / 0.03) + 200);
    const crackEnv = make(0.12, (t, i) => (crack[i] ?? 0) * Math.exp(-t / 0.025));
    return make(1.1, (_, i) => Math.tanh(((sub[i] ?? 0) * 1.4 + (crackEnv[i] ?? 0) * 1.6) * 1.2) * 0.9);
  })();
  const riser = (() => {
    const d = 2.2;
    const n = onePole(noise(d, 8), (t) => 300 + 7000 * (t / d) ** 2);
    const tone = glide(d, (t) => 180 + 700 * (t / d) ** 2, (t) => (t / d) ** 3);
    return fadeOut(make(d, (t, i) => (n[i] ?? 0) * 0.9 * (t / d) ** 2.2 + (tone[i] ?? 0) * 0.18), 30);
  })();
  const coin = mix([glide(0.07, () => 1318, (t) => Math.exp(-t / 0.05)), 0.35], [make(0.6, (t) => (t < 0.07 ? 0 : Math.sin(2 * Math.PI * 1976 * t) * Math.exp(-(t - 0.07) / 0.14))), 0.4], [make(0.6, (t) => (t < 0.07 ? 0 : Math.sin(2 * Math.PI * 3952 * t) * Math.exp(-(t - 0.07) / 0.06))), 0.12]);
  const swish = (() => {
    const d = 0.28;
    const n = noise(d, 4);
    const lp = onePole(n, (t) => 900 + 5000 * (t / d));
    const lp2 = onePole(n, (t) => 300 + 1600 * (t / d));
    return make(d, (t, i) => ((lp[i] ?? 0) - (lp2[i] ?? 0)) * Math.sin(Math.PI * (t / d)) ** 2 * 1.6);
  })();
  const blip = glide(0.1, (t) => 760 + 500 * (t / 0.1), (t) => Math.exp(-t / 0.035) * Math.min(1, t / 0.003));
  const shimmer = (() => {
    const notes = [1046.5, 1318.5, 1568, 2093];
    return make(1.6, (t) =>
      notes.reduce((acc, f, k) => {
        const on = t - k * 0.045;
        if (on < 0) return acc;
        return acc + Math.sin(2 * Math.PI * f * on + Math.sin(2 * Math.PI * 5 * on) * 0.6) * Math.exp(-on / 0.45) * Math.min(1, on / 0.004) * 0.22;
      }, 0),
    );
  })();
  const thud = mix([glide(0.35, (t) => 60 + 90 * Math.exp(-t / 0.03), (t) => Math.exp(-t / 0.09)), 0.9], [tick, 0.25]);
  const glitch = (() => {
    const r = rng(17);
    let seg = 0;
    let f = 400;
    let kind = 0;
    let phase = 0;
    return make(0.32, (t, i) => {
      if (i >= seg) {
        seg = i + Math.floor((0.008 + r() * 0.02) * SR);
        f = 120 + r() * 2400;
        kind = Math.floor(r() * 3);
      }
      phase += (2 * Math.PI * f) / SR;
      const v = kind === 0 ? Math.sign(Math.sin(phase)) * 0.35 : kind === 1 ? (r() * 2 - 1) * 0.4 : 0;
      return v * (1 - t / 0.32);
    });
  })();
  return { tick, type, impact, riser, coin, swish, blip, shimmer, thud, glitch };
}

function decode(file: string): Float32Array {
  const buf = execFileSync("ffmpeg", ["-loglevel", "error", "-i", file, "-ac", "1", "-ar", String(SR), "-f", "f32le", "-"], { maxBuffer: 64 * 1024 * 1024 });
  return new Float32Array(buf.buffer, buf.byteOffset, buf.length / 4).slice();
}

export function library(root: string): Record<string, Float32Array> {
  const lib = synth();
  for (const name of ["pop", "whoosh", "ding"]) lib[name] = decode(join(root, "assets", "audio", `${name}.wav`));
  return lib;
}

/** Lays every cue on one track, then soft-limits it. */
export function mixCues(cues: Array<{ t: number; name: string; gain: number }>, seconds: number, lib: Record<string, Float32Array>, master = 0.55): Float32Array {
  const out = new Float32Array(Math.ceil(seconds * SR));
  for (const c of cues) {
    const s = lib[c.name];
    if (!s) throw new Error(`no sound named ${c.name}`);
    const at = Math.round(c.t * SR);
    for (let i = 0; i < s.length && at + i < out.length; i++) if (at + i >= 0) out[at + i] = (out[at + i] ?? 0) + (s[i] ?? 0) * c.gain * master;
  }
  for (let i = 0; i < out.length; i++) out[i] = Math.tanh((out[i] ?? 0) * 1.1);
  return out;
}
