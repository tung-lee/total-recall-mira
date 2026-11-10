// Act four: a new phone, the real app, how it's built, and the end card.
import QRCode from "qrcode";
import { BEAT, blobSvg, clamp, draw, ease, h, lerp, mood, pose, prog, pulse, rng, type Scene, s, sfx, spring } from "./lib.ts";
import { glows, kinetic } from "./scenes-open.ts";
import { bubble, makePhone, traceCard } from "./ui.ts";

function appear(t: number, at: number, outAt = Infinity, dur = 0.5): number {
  if (t < at) return 0;
  return Math.min(ease.outExpo(prog(t, at, dur)), 1 - ease.inCubic(prog(t, outAt, 0.4)));
}

export function newDevice(stage: HTMLElement, start: number, end: number): Scene {
  const root = h("section", "scene light", stage);
  const cam = h("div", "cam", root);
  const b = (n: number) => start + n * BEAT;
  const glow = glows(cam, [["#e3f1ff", 1500, 300, 760], ["#e6f8d6", 400, 900, 700]]);
  const head = kinetic(cam, ["New phone.", "Same Mira."], 120, 70, 96, 100, "head");

  const laptop = h("div", "c", cam);
  laptop.style.cssText += "width:900px;";
  const screen = h("div", "", laptop);
  screen.style.cssText = "position:relative;height:540px;border-radius:24px 24px 0 0;border:14px solid #1c1c1f;border-bottom-width:20px;overflow:hidden;background:#fff;";
  const img = h("img", "", screen);
  img.src = "/shots/live-desktop-start.png";
  img.style.cssText = "width:100%;height:100%;object-fit:cover;object-position:center;filter:saturate(.9);";
  const dim = h("div", "", screen);
  dim.style.cssText = "position:absolute;inset:0;background:rgba(0,0,0,.35);";
  const modal = h("div", "", screen);
  modal.style.cssText = "position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:300px;background:#fff;border-radius:22px;padding:18px;text-align:center;box-shadow:0 20px 50px rgba(0,0,0,.3);";
  h("div", "", modal, '<div style="font-weight:700;font-size:17px">Continue on your phone</div><div style="font-size:12px;color:#8a8a8e;margin:4px 0 10px">Mira’s memory comes with you</div>');
  const canvas = h("canvas", "", modal);
  canvas.width = canvas.height = 232;
  canvas.style.cssText = "width:232px;height:232px;";
  const scan = h("div", "", modal);
  scan.style.cssText = "position:absolute;left:18px;right:18px;height:4px;background:#0b84fe;box-shadow:0 0 18px #0b84fe;";
  const base = h("div", "", laptop);
  base.style.cssText = "height:22px;margin:0 -60px;border-radius:0 0 22px 22px;background:linear-gradient(#d7d7dc,#a9a9b0);";

  const qr = QRCode.create("https://mira-flax.vercel.app/#/chat?me=fkygt5ngwq2c3lvd7hxe", { errorCorrectionLevel: "M" });
  const size = qr.modules.size;
  const r = rng(5);
  const order = Array.from({ length: size * size }, () => r());
  const ctx = canvas.getContext("2d");

  const phone = makePhone(cam, { strip: true, badge: "🧠 Walrus · Sui" });
  const tr = traceCard("Remembering you", [["Recall", "Walrus Memory, 4 namespaces"], ["Read your pockets", "Sui testnet, through Tatum"]], [b(7), b(8)]);
  phone.thread.add(b(6.8), "mira", tr.el, tr.tick);
  const lines = ["i remember you 🧠 pulled 9 lines from Walrus Memory:", "• budget about $400 a month", "• trip goal, about $1,200 by Mar 2027", "• coffee → eating out", "• i flag beauty from $30", "• about $85 spent this month"];
  const greet = bubble(lines.join("\n"));
  phone.thread.add(b(9), "mira", greet, (t) => {
    const k = 1 + Math.floor(clamp((t - b(9.3)) / (b(11.5) - b(9.3))) * (lines.length - 1));
    greet.textContent = lines.slice(0, Math.max(1, k)).join("\n");
  });
  const svg = s("svg", { width: 1920, height: 1080, class: "c" }, cam);
  svg.style.overflow = "visible";
  const beam = s("path", { d: "M 780 600 C 1000 500, 1150 520, 1300 600", fill: "none", stroke: "#0b84fe", "stroke-width": 5, "stroke-dasharray": "14 12", "stroke-linecap": "round" }, svg);
  const foot = h("div", "sub c", cam, "Memory follows your Mira code. The spend list stays on the old phone.");
  foot.style.fontSize = "30px";

  sfx(start + 0.1, "whoosh", 0.6);
  sfx(b(2), "glitch", 0.5);
  sfx(b(4), "whoosh", 0.6);
  sfx(b(5), "swish", 0.5);
  sfx(b(6), "blip", 0.6);
  sfx(b(7), "tick", 0.5);
  sfx(b(8), "tick", 0.5);
  sfx(b(9), "pop", 0.7);
  for (let i = 1; i < lines.length; i++) sfx(b(9.3) + (i / (lines.length - 1)) * (b(11.5) - b(9.3)), "type", 0.4);
  sfx(b(12), "ding", 0.6);

  return {
    name: "new device",
    start,
    end,
    root,
    render(t) {
      glow(t);
      cam.style.transform = `scale(${1 + (t - start) * 0.003})`;
      head.render(t, b(0.3), end + 5);
      const li = ease.outExpo(prog(t, start + 0.2, 1));
      pose(laptop, { x: 600, y: 620 + (1 - li) * 300, o: li, s: 0.92 });
      dim.style.opacity = String(appear(t, b(1.5)));
      modal.style.opacity = String(appear(t, b(1.6)));
      modal.style.transform = `translate(-50%,-50%) scale(${0.9 + 0.1 * appear(t, b(1.6))})`;
      if (ctx) {
        const p = ease.outCubic(prog(t, b(2), b(4) - b(2)));
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, 232, 232);
        const cell = 232 / (size + 2);
        ctx.fillStyle = "#0c0c0d";
        for (let y = 0; y < size; y++)
          for (let x = 0; x < size; x++)
            if (qr.modules.data[y * size + x] && (order[y * size + x] ?? 1) < p) ctx.fillRect((x + 1) * cell, (y + 1) * cell, Math.ceil(cell), Math.ceil(cell));
      }
      const sp = prog(t, b(5), 0.9);
      scan.style.top = `${70 + sp * 232}px`;
      scan.style.opacity = sp > 0 && sp < 1 ? "1" : "0";
      const pi = ease.outExpo(prog(t, b(4), 0.9));
      pose(phone.root, { x: lerp(2400, 1450, pi), y: 548, s: 1.14, r: (1 - pi) * 8 });
      phone.strip.set(t >= b(12) ? 31500 : 40000, 40000, t >= b(12) ? 4100 : 0, 120000, "trip");
      phone.strip.root.style.opacity = String(appear(t, b(12)));
      phone.thread.render(t);
      draw(beam, 560, prog(t, b(6), 0.5));
      beam.style.opacity = String(appear(t, b(6), b(8.5)));
      beam.style.strokeDashoffset = `${-(t * 60) % 26}`;
      pose(foot, { x: 960, y: 1030, o: appear(t, b(13)) });
    },
  };
}

const SHOTS: Array<[string, "phone" | "thread" | "desk"]> = [
  ["live-landing", "desk"],
  ["thread-receipts", "thread"],
  ["thread-advice", "thread"],
  ["live-phone-start", "phone"],
  ["thread-moved", "thread"],
  ["thread-memory", "thread"],
  ["desktop-restored", "desk"],
  ["thread-learned", "thread"],
];

export function montage(stage: HTMLElement, start: number, end: number): Scene {
  const root = h("section", "scene dark", stage);
  root.style.background = "#08080a";
  const cam = h("div", "cam", root);
  const b = (n: number) => start + n * BEAT;
  const glow = glows(cam, [["#16304f", 960, 540, 1100]]);
  const space = h("div", "c", cam);
  space.style.cssText += "width:1920px;height:1080px;perspective:1700px;transform-style:preserve-3d;";
  const rig = h("div", "", space);
  rig.style.cssText = "position:absolute;inset:0;transform-style:preserve-3d;";
  const cards = SHOTS.map(([name, kind], k) => {
    const el = h("div", "shot c", rig);
    const [w, hh] = kind === "desk" ? [820, 461] : kind === "phone" ? [320, 692] : [380, 629];
    el.style.cssText += `width:${w}px;height:${hh}px;`;
    const img = h("img", "", el);
    img.src = `/shots/${name}.png`;
    sfx(b(0.5 + k), k % 2 ? "swish" : "whoosh", 0.45);
    return { el, k, w };
  });
  const fade = h("div", "c", cam);
  fade.style.cssText += "width:1920px;height:420px;background:linear-gradient(rgba(8,8,10,0),rgba(8,8,10,.92) 60%);";
  pose(fade, { x: 0, y: 660, center: false });
  const kick = h("div", "kicker c", cam, "04 · The real app");
  kick.style.color = "#4da2ff";
  const head = kinetic(cam, ["Built. Tested. Live."], 960, 0, 110, 0, "head");
  const sub = h("div", "mono c", cam, "16-step end-to-end test · web on Vercel · API on Railway · mira-flax.vercel.app");
  sub.style.cssText += "font-size:24px;color:#9a9aa0;white-space:nowrap;";
  sfx(b(9), "impact", 0.8);
  sfx(b(13.5), "riser", 0.7);

  return {
    name: "montage",
    start,
    end,
    root,
    render(t) {
      glow(t);
      const lt = t - start;
      rig.style.transform = `translateZ(${-60 + lt * 22}px) rotateY(${lerp(9, -9, lt / (end - start))}deg) rotateX(3deg)`;
      for (const c of cards) {
        const at = b(0.5 + c.k);
        const p = ease.outExpo(prog(t, at, 0.9));
        const theta = (c.k - 3.5) * 15;
        const R = 1500;
        const rad = (theta * Math.PI) / 180;
        const tx = 960 + R * Math.sin(rad);
        const tz = R * Math.cos(rad) - R - 40;
        const ty = 450 + (c.k % 2 ? 50 : -30);
        const float = Math.sin(lt * 1.2 + c.k) * 10;
        pose(c.el, { x: lerp(960 + (c.k % 2 ? 500 : -500), tx, p), y: ty + float + (1 - p) * 200, z: lerp(-1800, tz, p), ry: lerp(c.k % 2 ? -60 : 60, theta, p), o: p > 0 ? Math.min(1, p * 2) : 0 });
      }
      pose(kick, { x: 120, y: 80, center: false, o: appear(t, start + 0.2) });
      head.rows.forEach((row) => pose(row.mask, { x: 960, y: 880 }));
      head.render(t, b(9), end + 5, 0.1);
      pose(sub, { x: 960, y: 990, o: appear(t, b(10)) });
      const z = ease.inExpo(prog(t, b(13.5), b(16) - b(13.5)));
      cam.style.transform = `scale(${1 + z * 2.5})`;
      cam.style.filter = z > 0.02 ? `blur(${z * 8}px)` : "";
    },
  };
}

export function hood(stage: HTMLElement, start: number, end: number): Scene {
  const root = h("section", "scene dark", stage);
  root.style.background = "#07101d";
  const cam = h("div", "cam", root);
  const b = (n: number) => start + n * BEAT;
  const grid = h("div", "c", cam);
  grid.style.cssText += "width:2400px;height:1500px;background-image:linear-gradient(rgba(77,162,255,.08) 1px,transparent 1px),linear-gradient(90deg,rgba(77,162,255,.08) 1px,transparent 1px);background-size:60px 60px;";
  const kick = h("div", "kicker c", cam, "05 · Under the hood");
  kick.style.color = "#4da2ff";
  const head = kinetic(cam, ["Two apps. One memory."], 120, 110, 84, 0, "head");

  const N = {
    web: { x: 330, y: 470, html: "📱 Web app<small>React · Vercel</small>", bg: "#13233a", bd: "#2a4a75" },
    api: { x: 900, y: 470, html: "⚙️ API<small>Node · Railway</small>", bg: "#13233a", bd: "#2a4a75" },
    walrus: { x: 1510, y: 330, html: "🧠 Walrus Memory<small>mainnet · rememberBulk · recall</small>", bg: "#24163f", bd: "#7a3fd1" },
    tatum: { x: 1510, y: 610, html: "⛓️ Tatum gateway<small>Sui gRPC · testnet · gas sponsored</small>", bg: "#0f2a44", bd: "#4da2ff" },
  };
  const nodes = Object.entries(N).map(([key, n], i) => {
    const el = h("div", "node c", cam, `<div>${n.html}</div>`);
    el.style.cssText += `background:${n.bg};border:2px solid ${n.bd};color:#fff;`;
    sfx(b(0.5 + i * 0.9), "blip", 0.5);
    return { key, el, ...n, at: b(0.5 + i * 0.9) };
  });
  const svg = s("svg", { width: 1920, height: 1080, class: "c" }, cam);
  svg.style.overflow = "visible";
  const edge = (d: string, color: string) => s("path", { d, fill: "none", stroke: color, "stroke-width": 4, "stroke-linecap": "round" }, svg);
  const edges = [
    { path: edge("M 470 470 L 790 470", "#4da2ff"), label: "/api", lx: 630, ly: 440, color: "#4da2ff", at: b(1) },
    { path: edge("M 1010 450 C 1150 450, 1180 330, 1290 330", "#a77bff"), label: "typed lines", lx: 1170, ly: 360, color: "#a77bff", at: b(2.3) },
    { path: edge("M 1010 490 C 1150 490, 1180 610, 1290 610", "#4da2ff"), label: "sponsored moves", lx: 1170, ly: 600, color: "#4da2ff", at: b(2.6) },
  ];
  const labels = edges.map((e) => {
    const el = h("div", "mono c", cam, e.label);
    el.style.cssText += `font-size:20px;color:${e.color};`;
    return el;
  });
  const packets = edges.flatMap((e, i) =>
    Array.from({ length: 3 }, (_, j) => {
      const d = h("div", "c", cam);
      d.style.cssText += `width:14px;height:14px;border-radius:50%;background:${e.color};box-shadow:0 0 14px ${e.color};`;
      return { d, e, phase: j / 3 + i * 0.17 };
    }),
  );
  const stats: Array<[number, string, string, string]> = [
    [7, "", "kinds of typed memory lines", "#a77bff"],
    [0, "", "names written to memory", "#34c759"],
    [91, "", "unit tests, plus a 16-step E2E", "#4da2ff"],
    [3, "≈", "seconds per sponsored move", "#ffd23f"],
  ];
  const tiles = stats.map(([n, prefix, label, color], i) => {
    const el = h("div", "stat tile c", cam);
    el.style.cssText += "width:380px;";
    el.innerHTML = `<b style="color:${color}"></b><span>${label}</span>`;
    sfx(b(6 + i), "thud", 0.6);
    return { el, n, prefix, at: b(6 + i), x: 330 + i * 420 };
  });
  const ticker = h("div", "mono c", cam);
  ticker.style.cssText += "font-size:24px;color:#4da2ff;white-space:nowrap;opacity:.8;";
  ticker.textContent = Array(4).fill("GetBalance · ListOwnedObjects · SimulateTransaction · ExecuteTransaction · GetTransaction · rememberBulk · recall · ").join("");
  sfx(b(14), "riser", 0.6);

  return {
    name: "hood",
    start,
    end,
    root,
    render(t) {
      const lt = t - start;
      cam.style.transform = `scale(${1 + lt * 0.003})`;
      pose(grid, { x: 960 - (lt * 12) % 60, y: 540 - (lt * 8) % 60 });
      pose(kick, { x: 120, y: 70, center: false, o: appear(t, start + 0.2) });
      head.render(t, b(0.2), end + 5);
      for (const n of nodes) {
        const sp = t >= n.at ? spring(t, n.at, 2.4, 8) : 0;
        pose(n.el, { x: n.x, y: n.y, s: sp, o: sp > 0 ? 1 : 0 });
      }
      edges.forEach((e, i) => {
        draw(e.path, 420, ease.outCubic(prog(t, e.at, 0.5)));
        const l = labels[i];
        if (l) pose(l, { x: e.lx, y: e.ly, o: appear(t, e.at + 0.3) });
      });
      for (const p of packets) {
        const live = t > b(4);
        const u = (((t - b(4)) * 0.6 + p.phase) % 1 + 1) % 1;
        const len = p.e.path.getTotalLength();
        const pt = p.e.path.getPointAtLength(u * len);
        pose(p.d, { x: pt.x, y: pt.y, o: live ? Math.sin(u * Math.PI) : 0 });
      }
      for (const tl of tiles) {
        const a = appear(t, tl.at);
        const v = Math.round(ease.outCubic(prog(t, tl.at, 0.8)) * tl.n);
        (tl.el.querySelector("b") as HTMLElement).textContent = `${tl.prefix}${v}`;
        pose(tl.el, { x: tl.x, y: 840 + (1 - a) * 50, o: a });
      }
      pose(ticker, { x: 60 - ((lt * 160) % 1500), y: 1020, center: false, o: appear(t, b(4)) * 0.8 });
    },
  };
}

export function outro(stage: HTMLElement, start: number, end: number): Scene {
  const root = h("section", "scene light", stage);
  const cam = h("div", "cam", root);
  const b = (n: number) => start + n * BEAT;
  const glow = glows(cam, [["#ffd3ea", 260, 200, 700], ["#dff7c8", 1680, 880, 760], ["#d9ecff", 1500, 160, 520]]);
  const blob = blobSvg("#9BE15D", 260);
  const blobWrap = h("div", "c", cam);
  blobWrap.appendChild(blob.root);
  const word = kinetic(cam, ["Ask Mira first."], 960, 0, 170, 0, "mega");
  const url = h("div", "pill c", cam, "mira-flax.vercel.app");
  url.style.cssText += "background:#111;color:#fff;font-size:40px;padding:22px 46px;box-shadow:0 20px 40px -18px rgba(0,0,0,.5);";
  const credit = h("div", "c", cam);
  credit.style.cssText += "display:flex;gap:14px;align-items:center;white-space:nowrap;";
  for (const [text, bg, fg] of [["🧠 Walrus Memory", "#f3edff", "#4b2a85"], ["⛓️ Tatum · Sui gRPC", "#e3f1ff", "#0b6bd3"], ["💸 Total Recall · Track 3", "#eaf8e1", "#1b7a33"]] as const) {
    const p = h("span", "pill", credit, text);
    p.style.cssText += `background:${bg};color:${fg};font-size:26px;`;
  }
  sfx(start, "impact", 0.8);
  sfx(b(3), "pop", 0.7);
  sfx(b(8), "ding", 1);

  return {
    name: "outro",
    start,
    end,
    root,
    render(t) {
      glow(t);
      const sp = spring(t, start, 1.9, 6);
      mood(blob, t > b(6) && t < b(6.3) ? "wink" : "happy");
      pose(blobWrap, { x: 960, y: 300 + Math.sin(t * 2) * 6, s: sp * (1 + pulse(t, b(8), 6) * 0.08), r: (1 - Math.min(1, sp)) * 40 });
      word.rows.forEach((row) => pose(row.mask, { x: 960, y: 590 }));
      word.render(t, b(0.8), end + 5, 0.12);
      const up = t >= b(3) ? spring(t, b(3), 2.2, 7) : 0;
      pose(url, { x: 960, y: 780, s: up, o: up > 0 ? 1 : 0 });
      pose(credit, { x: 960, y: 930, o: appear(t, b(4.5)) });
    },
  };
}
