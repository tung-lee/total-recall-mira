// Act one: the cold open, the title, and the problem.
import { BEAT, blobSvg, clamp, ease, h, lerp, mood, pose, prog, pulse, rng, type Scene, scramble, sfx, split, spring, typed } from "./lib.ts";

export function glows(root: HTMLElement, colors: Array<[string, number, number, number]>): (t: number) => void {
  const els = colors.map(([color, x, y, size]) => {
    const g = h("div", "glow c", root);
    g.style.background = color;
    g.style.width = g.style.height = `${size}px`;
    return { g, x, y };
  });
  return (t) => els.forEach(({ g, x, y }, i) => pose(g, { x: x + Math.sin(t * 0.4 + i) * 40, y: y + Math.cos(t * 0.33 + i * 2) * 30, o: 0.55 }));
}

/** Lines of big type whose words rise out of a mask, then leave the same way. */
export function kinetic(parent: HTMLElement, lines: string[], x: number, y: number, size: number, gap: number, cls = "head") {
  const rows = lines.map((text, i) => {
    const mask = h("div", `mask c ${cls}`, parent);
    mask.style.fontSize = `${size}px`;
    const inner = h("div", "", mask);
    const words = split(inner, text, "words");
    pose(mask, { x, y: y + i * gap, center: false });
    return { mask, words };
  });
  return {
    rows,
    render(t: number, inAt: number, outAt: number, stagger = 0.06) {
      let k = 0;
      for (const row of rows) {
        for (const w of row.words) {
          const pin = ease.outExpo(prog(t, inAt + k * stagger, 0.7));
          const pout = ease.inCubic(prog(t, outAt + k * stagger * 0.5, 0.35));
          w.style.transform = `translateY(${((1 - pin) * 110 - pout * 115).toFixed(2)}%)`;
          k++;
        }
        row.mask.style.visibility = t < inAt - 0.05 || t > outAt + 1.2 ? "hidden" : "";
      }
    },
  };
}

// ---------- 1. cold open ----------

export function coldOpen(stage: HTMLElement, start: number, end: number): Scene {
  const root = h("section", "scene dark", stage);
  const cam = h("div", "cam", root);
  const b = (n: number) => start + n * BEAT;
  const ask = "should i buy the $48 serum?";

  const composer = h("div", "composer-big c", cam);
  const ph = h("span", "ph", composer, "iMessage");
  const textEl = h("span", "", composer);
  const caret = h("span", "caret", composer);
  const send = h("div", "send-big", composer, "↑");
  const msg = h("div", "big-bubble me c", cam, ask);
  const typing = h("div", "big-bubble mira c", cam, '<div class="dots"><i></i><i></i><i></i></div>');
  const reply = h("div", "big-bubble mira c", cam);
  reply.innerHTML = 'hmm <span class="em">🤔</span><span class="rest"> think twice?</span>';
  const em = reply.querySelector(".em") as HTMLElement;
  const rest = reply.querySelector(".rest") as HTMLElement;
  const dots = Array.from(typing.querySelectorAll("i")) as HTMLElement[];
  const time = h("div", "kicker c", cam, "TODAY 9:41 PM");
  time.style.color = "#6a6a70";

  const typeFrom = b(1);
  const typeTo = b(4.4);
  for (let i = 0; i < ask.length; i += 2) sfx(lerp(typeFrom, typeTo, i / ask.length), "type", 0.55);
  sfx(b(5), "tick", 0.8);
  sfx(b(5), "whoosh", 0.7);
  sfx(b(6.5), "pop", 0.6);
  sfx(b(8), "pop", 0.8);
  sfx(b(9), "blip", 0.5);
  sfx(b(9.5), "riser", 0.9);

  let focus: [number, number] | null = null;
  return {
    name: "cold open",
    start,
    end,
    root,
    render(t) {
      const tt = typed(ask, prog(t, typeFrom, typeTo - typeFrom));
      const sent = t >= b(5);
      textEl.textContent = sent ? "" : tt;
      ph.style.display = tt && !sent ? "none" : "";
      caret.style.opacity = Math.floor(t / 0.45) % 2 === 0 || (t > typeFrom && t < typeTo) ? "1" : "0";
      send.style.transform = `scale(${t < b(4.5) ? 0 : spring(t, b(4.5), 2.5, 7) * (1 - 0.15 * pulse(t, b(5), 10))})`;
      const cin = ease.outExpo(prog(t, start + 0.15, 0.9));
      pose(composer, { x: 960, y: 900 + (1 - cin) * 120, o: cin });
      pose(time, { x: 960, y: 120, o: ease.outCubic(prog(t, start + 0.3, 0.8)) * 0.9 });

      const fly = ease.outExpo(prog(t, b(5), 0.75));
      pose(msg, { x: lerp(860, 1300, fly), y: lerp(900, 380, fly), s: lerp(0.75, 1, fly), o: sent ? 1 : 0 });
      const ty = t >= b(6.5) && t < b(8) ? spring(t, b(6.5), 2.4, 8) : 0;
      pose(typing, { x: 330, y: 600, s: ty, o: ty > 0 ? 1 : 0 });
      dots.forEach((d, i) => (d.style.transform = `translateY(${-Math.max(0, Math.sin((t - i * 0.15) * 9)) * 10}px)`));
      const rp = t >= b(8) ? spring(t, b(8), 2.2, 7) : 0;
      rest.style.opacity = t >= b(9) ? "1" : "0";
      rest.style.display = t >= b(9) ? "" : "none";
      pose(reply, { x: t >= b(9) ? 560 : 330, y: 600, s: rp, o: rp > 0 ? 1 : 0, center: true });

      if (!focus && t >= b(9.2) && t < b(9.6)) {
        const r = em.getBoundingClientRect();
        const s0 = stage.getBoundingClientRect();
        focus = [r.left + r.width / 2 - s0.left, r.top + r.height / 2 - s0.top];
      }
      const z = ease.inExpo(prog(t, b(9.8), b(12) - b(9.8)));
      const [fx, fy] = focus ?? [560, 600];
      cam.style.transformOrigin = `${fx}px ${fy}px`;
      cam.style.transform = `scale(${1 + z * 14})`;
      cam.style.filter = z > 0.02 ? `blur(${(z * 6).toFixed(2)}px)` : "";
    },
  };
}

// ---------- 2. title ----------

export function title(stage: HTMLElement, start: number, end: number): Scene {
  const root = h("section", "scene light", stage);
  const cam = h("div", "cam", root);
  const b = (n: number) => start + n * BEAT;
  const glow = glows(cam, [
    ["#ffd3ea", 260, 180, 700],
    ["#dff7c8", 1680, 900, 760],
    ["#d9ecff", 1600, 140, 520],
  ]);

  const r = rng(7);
  const snippets = ["coffee 5.5", "budget 400 a month", "skip it, move $41 to tokyo", "uber 18", "🧠 coffee → eating out", "saving 1200 for tokyo", "think twice?", "✓ Moved $41"];
  const floaters = snippets.map((text, i) => {
    const el = h("div", `pill c`, cam, text);
    const mine = !text.startsWith("🧠") && !text.startsWith("think") && !text.startsWith("✓");
    el.style.background = mine ? "#0b84fe" : "#e9e9eb";
    el.style.color = mine ? "#fff" : "#000";
    el.style.fontSize = "26px";
    const depth = 0.4 + r() * 0.6;
    const side = i % 2 === 0 ? -1 : 1;
    return { el, x: 960 + side * (420 + r() * 420), y: 120 + r() * 860, depth, at: b(2 + i * 0.5), sp: 18 + r() * 30 };
  });

  const ring = h("div", "c", cam);
  ring.style.cssText += "width:400px;height:400px;border-radius:50%;border:8px solid #9be15d;";
  const blob = blobSvg("#9BE15D", 330);
  const blobWrap = h("div", "c", cam);
  blobWrap.appendChild(blob.root);
  const word = h("div", "mega c", cam);
  word.style.fontSize = "300px";
  const letters = split(word, "Mira");
  const tag = h("div", "c", cam);
  tag.style.cssText += "font-size:54px;font-weight:600;letter-spacing:-0.03em;white-space:nowrap;";
  tag.innerHTML = '<span class="w">the</span> <span class="w">money</span> <span class="w">friend</span> <span class="w">you</span> <span class="w">text</span> <span class="hl"><span class="mark"></span><span class="w">before</span> <span class="w">you</span> <span class="w">buy</span></span>';
  const words = Array.from(tag.querySelectorAll(".w")) as HTMLElement[];
  words.forEach((w) => (w.style.display = "inline-block"));
  const mark = tag.querySelector(".mark") as HTMLElement;
  const kicker = h("div", "kicker c", cam);
  kicker.style.color = "#6c6c70";
  const kickerText = "WALRUS × TATUM · TOTAL RECALL · TRACK 3";

  sfx(start, "impact", 1);
  letters.forEach((_, i) => sfx(b(1 + i * 0.5), "pop", 0.55 + i * 0.1));
  sfx(b(3.5), "swish", 0.5);
  sfx(b(5.5), "blip", 0.6);
  sfx(b(10.5), "whoosh", 0.8);

  return {
    name: "title",
    start,
    end,
    root,
    render(t) {
      glow(t);
      const lt = t - start;
      const exit = ease.inOutCubic(prog(t, b(10.4), 1.6));
      cam.style.transform = `translateY(${-exit * 60}px) scale(${1 + lt * 0.006 - exit * 0.06})`;
      cam.style.opacity = String(1 - exit * 0.2);

      const rp = prog(t, start, 0.9);
      pose(ring, { x: 960, y: 360, s: 0.2 + ease.outExpo(rp) * 2.6, o: (1 - rp) * 0.9 });
      const sp = spring(t, start, 1.8, 6);
      const beatPulse = [4, 6, 8, 10].reduce((a, k) => a + pulse(t, b(k), 7) * 0.05, 0);
      pose(blobWrap, { x: 960, y: 360 + Math.sin(lt * 2) * 8, s: sp * (1 + beatPulse), r: (1 - Math.min(1, sp)) * -50 + Math.sin(lt * 1.3) * 3 });
      mood(blob, (t > b(6.9) && t < b(7.15)) || (t > b(9.4) && t < b(9.6)) ? "squint" : "happy");

      pose(word, { x: 960, y: 660 });
      letters.forEach((l, i) => {
        const at = b(1 + i * 0.5);
        const p = prog(t, at, 0.55);
        l.style.transform = `translateY(${((1 - ease.outBack(p, 2.2)) * 160).toFixed(1)}px) rotate(${((1 - ease.outCubic(p)) * (i % 2 ? 8 : -8)).toFixed(1)}deg)`;
        l.style.opacity = String(clamp(p * 3));
        l.style.filter = p < 1 ? `blur(${((1 - p) * 10).toFixed(1)}px)` : "";
      });

      pose(tag, { x: 960, y: 850 });
      words.forEach((w, i) => {
        const p = ease.outExpo(prog(t, b(3.5) + i * 0.07, 0.6));
        w.style.transform = `translateY(${(1 - p) * 40}px)`;
        w.style.opacity = String(p);
      });
      mark.style.transform = `scaleX(${ease.outExpo(prog(t, b(5.5), 0.6))})`;

      kicker.textContent = t < b(4) ? "" : scramble(kickerText, prog(t, b(4), 1.4), 3);
      pose(kicker, { x: 960, y: 110 });

      for (const f of floaters) {
        const a = ease.outCubic(prog(t, f.at, 1));
        pose(f.el, { x: f.x + Math.sin(lt * 0.5 + f.depth * 9) * 20, y: f.y - (t - f.at) * f.sp * f.depth, s: 0.5 + f.depth * 0.5, o: a * (0.35 + f.depth * 0.5), blur: (1 - f.depth) * 6 });
      }
    },
  };
}

// ---------- 3. the problem ----------

export function problem(stage: HTMLElement, start: number, end: number): Scene {
  const root = h("section", "scene dark", stage);
  const cam = h("div", "cam", root);
  const b = (n: number) => start + n * BEAT;
  const glow = glows(cam, [["#1d2b4a", 1500, 300, 700], ["#2a1640", 300, 900, 600]]);

  const kA = kinetic(cam, ["Budget apps make you", "categorise every coffee."], 150, 300, 118, 132);
  const strikeWord = kA.rows[1]?.words[0];
  const strike = h("div", "", strikeWord);
  strike.style.cssText = "position:absolute;left:-2%;right:-2%;top:52%;height:12px;background:#ff453a;transform-origin:0 50%;border-radius:6px;";
  if (strikeWord) strikeWord.style.position = "relative";
  const frags = ["Uncategorised (47)", "Food & Drink ▾", "Review transactions", "Split?", "Shopping ▾"].map((text, i) => {
    const el = h("div", "pill c", cam, text);
    el.style.cssText += `background:#1f1f23;color:#9a9aa0;border:1px solid #2e2e33;font-size:26px;`;
    return { el, x: 260 + i * 330, y: 720 + (i % 2) * 90 };
  });

  const kB = kinetic(cam, ["So you stop opening them", "by week two."], 150, 300, 118, 132);
  const dots = Array.from({ length: 14 }, (_, i) => {
    const d = h("div", "c", cam);
    d.style.cssText += "width:46px;height:46px;border-radius:14px;background:#26262b;";
    return { d, x: 175 + i * 66, y: 720 };
  });
  const app = h("div", "c", cam);
  app.style.cssText += "width:170px;height:170px;border-radius:40px;background:linear-gradient(135deg,#3a3a40,#202024);display:grid;place-items:center;font-size:80px;";
  app.textContent = "📊";
  const badge = h("div", "c", cam);
  badge.style.cssText += "min-width:76px;height:76px;padding:0 18px;border-radius:40px;background:#ff453a;color:#fff;font-weight:800;font-size:40px;display:grid;place-items:center;";

  const kC = kinetic(cam, ["The moment that matters", "is before you buy."], 150, 360, 140, 160);
  const last = kC.rows[1]?.words ?? [];
  last.slice(-3).forEach((w) => (w.style.color = "#9be15d"));
  const later = h("div", "sub c", cam, "not at the end of the month.");
  later.style.fontSize = "48px";
  const ask = h("div", "big-bubble me c", cam, "should i buy…?");
  ask.style.fontSize = "48px";

  sfx(start, "whoosh", 0.6);
  sfx(b(2.5), "glitch", 0.5);
  sfx(b(4), "whoosh", 0.6);
  for (let i = 0; i < 9; i++) sfx(b(5) + i * 0.16, "tick", 0.35);
  sfx(b(8), "whoosh", 0.7);
  sfx(b(10), "thud", 0.9);
  sfx(b(11), "pop", 0.8);
  sfx(b(14), "riser", 0.6);

  return {
    name: "problem",
    start,
    end,
    root,
    render(t) {
      glow(t);
      cam.style.transform = `scale(${1 + (t - start) * 0.004})`;
      kA.render(t, b(0.2), b(3.3));
      strike.style.transform = `scaleX(${ease.outExpo(prog(t, b(2.5), 0.4)) * (t < b(3.3) ? 1 : 1 - prog(t, b(3.3), 0.2))})`;
      frags.forEach((f, i) => {
        const a = window_(t, b(1.2 + i * 0.4), b(3.4));
        const jitter = Math.sin(t * 30 + i) * 2;
        pose(f.el, { x: f.x + jitter, y: f.y, o: a * 0.9, s: 0.9 + a * 0.1 });
      });

      kB.render(t, b(4.2), b(7.3));
      dots.forEach((d, i) => {
        const on = t >= b(5) + i * 0.16 && i < 9;
        const vis = window_(t, b(4.6) + i * 0.02, b(7.8));
        const fade = i >= 9 ? 0.25 : 1;
        d.d.style.background = on ? (t > b(6.8) ? "#3a3a40" : "#9be15d") : "#26262b";
        pose(d.d, { x: d.x, y: d.y, o: vis * fade, s: on ? 1 + pulse(t, b(5) + i * 0.16, 12) * 0.25 : 1 });
      });
      const av = window_(t, b(4.6), b(7.8));
      pose(app, { x: 1500, y: 620, o: av, r: Math.sin(t * 2) * 2 });
      const count = Math.floor(ease.outCubic(prog(t, b(5), b(7.4) - b(5))) * 47);
      badge.textContent = String(count);
      pose(badge, { x: 1580, y: 540, o: av * (count > 0 ? 1 : 0), s: 1 + pulse(t, b(5) + (count / 47) * 2.2, 10) * 0.1 });

      kC.render(t, b(8.2), b(15.2), 0.07);
      pose(later, { x: 150, y: 680, center: false, o: window_(t, b(12), b(15.2)) });
      const ap = spring(t, b(11), 2.2, 7);
      const zoom = ease.inExpo(prog(t, b(14), b(16) - b(14)));
      pose(ask, { x: lerp(1460, 960, zoom), y: lerp(820, 540, zoom), s: (t >= b(11) ? ap : 0) * (1 + zoom * 3), o: t >= b(11) ? 1 : 0 });
    },
  };
}

function window_(t: number, a: number, b: number): number {
  if (t < a || t > b + 0.4) return 0;
  return Math.min(ease.outCubic(prog(t, a, 0.4)), 1 - prog(t, b, 0.4));
}
