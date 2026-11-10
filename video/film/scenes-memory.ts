// Act three: how a choice becomes a memory, how memory changes Mira, and what never leaves the phone.
import { BEAT, clamp, draw, ease, h, lerp, pose, prog, pulse, rng, type Scene, s, scramble, sfx, spring, typed } from "./lib.ts";
import { glows, kinetic } from "./scenes-open.ts";
import { adviceCard } from "./ui.ts";

function appear(t: number, at: number, outAt = Infinity, dur = 0.5): number {
  if (t < at) return 0;
  return Math.min(ease.outExpo(prog(t, at, dur)), 1 - ease.inCubic(prog(t, outAt, 0.4)));
}

const NS = ["mira:prefs", "mira:rules", "mira:nudges", "mira:habits"] as const;

export function learning(stage: HTMLElement, start: number, end: number): Scene {
  const root = h("section", "scene dark", stage);
  root.style.background = "#110a20";
  const cam = h("div", "cam", root);
  const b = (n: number) => start + n * BEAT;
  const glow = glows(cam, [["#3b1d7a", 1500, 500, 820], ["#1d2a6b", 300, 200, 600], ["#4a1a5a", 400, 1000, 600]]);

  const kick = h("div", "kicker c", cam, "03 · Memory that learns");
  kick.style.color = "#a77bff";
  const pill = h("div", "c", cam);
  pill.style.cssText += "padding:26px 44px;border-radius:36px;background:#f3edff;color:#4b2a85;font-size:54px;white-space:nowrap;font-weight:500;box-shadow:0 0 80px rgba(167,123,255,.45);";
  pill.innerHTML = "<b>🧠 Remembered</b> · Skipped a beauty buy, about $40";
  const raw = "NUDGE · beauty · about $40 · skipped · as_of=2026-11-03T15:28:06Z";
  const line = h("div", "line c", cam);
  line.style.fontSize = "40px";
  const round = h("div", "hand c", cam, "$41 → rounded to “about $40”");
  round.style.cssText += "font-size:50px;color:#ffd23f;";
  const block = h("div", "c", cam);
  block.style.cssText += "width:120px;height:120px;border-radius:26px;background:linear-gradient(135deg,#c9a8ff,#7a3fd1);box-shadow:0 0 60px #7a3fd1;z-index:20;";
  sfx(b(1), "type", 0.4);
  sfx(b(2), "type", 0.4);
  sfx(b(2.6), "blip", 0.5);
  sfx(b(4.2), "swish", 0.7);
  sfx(b(6), "shimmer", 1);

  // the vault
  const vault = h("div", "c", cam);
  vault.style.cssText += "width:640px;padding:30px;border-radius:36px;background:rgba(255,255,255,.06);border:1.5px solid rgba(167,123,255,.45);backdrop-filter:blur(6px);box-shadow:0 0 80px rgba(122,63,209,.35);";
  h("div", "", vault, '<div style="display:flex;align-items:center;gap:14px;font-size:34px;font-weight:800;letter-spacing:-.03em"><span style="width:18px;height:18px;border-radius:50%;background:#34c759;box-shadow:0 0 14px #34c759"></span>Walrus Memory</div><div class="mono" style="font-size:20px;color:#a99bd0;margin:6px 0 20px">mainnet · owner-scoped namespaces</div>');
  const rows = NS.map((ns) => {
    const row = h("div", "", vault);
    row.style.cssText = "display:grid;grid-template-columns:1fr auto;align-items:center;gap:10px;padding:14px 16px;margin-top:10px;border-radius:18px;background:rgba(255,255,255,.05);";
    h("div", "mono", row, `${ns}:fkygt5…`).style.cssText = "font-size:22px;color:#e8dcff;";
    const count = h("div", "", row);
    count.style.cssText = "min-width:52px;text-align:center;padding:6px 12px;border-radius:99px;background:#7a3fd1;color:#fff;font-weight:800;font-size:22px;";
    const cells = h("div", "", row);
    cells.style.cssText = "grid-column:1 / -1;display:flex;gap:6px;height:22px;";
    return { row, count, cells, n: 0 };
  });
  const blobId = h("div", "mono c", cam);
  blobId.style.cssText += "font-size:24px;color:#34c759;white-space:nowrap;";

  // the conveyor of other lines
  const stream: Array<[string, number]> = [
    ["BUDGET · monthly · about $400", 0],
    ["GOAL · trip · about $1,200 · by 2027-03", 0],
    ["CAP · eating out · about $60 a week", 0],
    ["RULE · coffee → eating out", 1],
    ["MONTH · 2026-11 · spent about $85", 0],
    ["NUDGE · beauty · about $30 · bought anyway", 2],
  ];
  const flyers = stream.map(([text, ns], k) => {
    const el = h("div", "line c", cam, text);
    el.style.fontSize = "30px";
    const at = b(7.5 + k * 1.4);
    sfx(at, "blip", 0.45);
    sfx(at + 0.75, "swish", 0.4);
    return { el, ns, at };
  });
  const headA = kinetic(cam, ["Every answer", "becomes one line."], 150, 170, 92, 104, "head");

  // the loop
  const headB = kinetic(cam, ["Memories that change", "what Mira does next."], 150, 110, 84, 96, "head");
  const svg = s("svg", { width: 1920, height: 1080, class: "c" }, cam);
  svg.style.overflow = "visible";
  const LC: [number, number] = [520, 690];
  const R = 225;
  const nodes = ["You answer", "One typed line", "Recalled next time", "Mira acts differently"];
  const angles = [-90, 0, 90, 180];
  const arcs = angles.map((a, i) => {
    const a0 = ((a + 14) * Math.PI) / 180;
    const a1 = ((angles[(i + 1) % 4] ?? 0) + (i === 3 ? 360 : 0) - 14) * (Math.PI / 180);
    const d = `M ${LC[0] + R * Math.cos(a0)} ${LC[1] + R * Math.sin(a0)} A ${R} ${R} 0 0 1 ${LC[0] + R * Math.cos(a1)} ${LC[1] + R * Math.sin(a1)}`;
    return s("path", { d, fill: "none", stroke: "#a77bff", "stroke-width": 5, "stroke-linecap": "round" }, svg);
  });
  const nodeEls = nodes.map((label, i) => {
    const el = h("div", "pill c", cam, label);
    el.style.cssText += "font-size:28px;background:#1d1430;color:#e8dcff;border:1.5px solid #3a2a63;";
    const a = ((angles[i] ?? 0) * Math.PI) / 180;
    sfx(b(17 + i * 0.75), "tick", 0.5);
    return { el, x: LC[0] + R * Math.cos(a), y: LC[1] + R * Math.sin(a) };
  });
  const dot = h("div", "c", cam);
  dot.style.cssText += "width:30px;height:30px;border-radius:50%;background:#ffd23f;box-shadow:0 0 30px #ffd23f;";
  const card = adviceCard({
    emoji: "💄",
    item: "Matte lipstick",
    sub: "$32 at Basket · $6 less than elsewhere",
    verdict: "think",
    reasons: [
      ["You skipped a beauty buy of about $40, so I flag beauty from $30", true],
      ["That's 3% of your tokyo goal", true],
    ],
  });
  card.classList.add("c");
  card.style.width = "390px";
  cam.appendChild(card);
  const ask = h("div", "big-bubble me c", cam, "thinking about a $38 lipstick");
  ask.style.fontSize = "34px";
  ask.style.padding = "16px 26px";
  const slider = h("div", "c", cam);
  slider.style.cssText += "width:560px;";
  slider.innerHTML = `<div style="display:flex;justify-content:space-between;font-size:24px;color:#cbbcf0;margin-bottom:14px"><span>beauty · flag line</span><b class="sv" style="color:#ffd23f"></b></div><div style="position:relative;height:16px;border-radius:8px;background:rgba(255,255,255,.12)"><div class="sf" style="position:absolute;left:0;top:0;bottom:0;border-radius:8px;background:linear-gradient(90deg,#7a3fd1,#ffd23f)"></div><div class="sk" style="position:absolute;top:50%;width:34px;height:34px;border-radius:50%;background:#fff;transform:translate(-50%,-50%);box-shadow:0 0 20px #ffd23f"></div></div><div class="hand" style="font-size:40px;color:#ffd23f;margin-top:12px">learned from your skip</div>`;
  sfx(b(20.5), "pop", 0.7);
  sfx(b(21.2), "pop", 0.7);
  sfx(b(23), "riser", 0.4);
  sfx(b(24), "ding", 0.6);

  return {
    name: "learning",
    start,
    end,
    root,
    render(t) {
      glow(t);
      cam.style.transform = `scale(${1 + (t - start) * 0.002})`;
      pose(kick, { x: 150, y: 70, center: false, o: appear(t, start + 0.2) });

      // a choice becomes a line
      const pillOut = ease.inCubic(prog(t, b(1), 0.5));
      pose(pill, { x: 960, y: lerp(540, 360, ease.outCubic(prog(t, b(0.4), 0.8))), s: 1.1 - pillOut * 0.1, o: t < b(4.5) ? 1 - prog(t, b(4), 0.4) : 0 });
      line.innerHTML = typed(raw, prog(t, b(1), b(3) - b(1))).replace("about $40", "<b>about $40</b>");
      const collapse = ease.inExpo(prog(t, b(4), 0.45));
      pose(line, { x: 960, y: 560, sx: 1 - collapse * 0.9, sy: 1 - collapse * 0.4, o: t < b(1) ? 0 : 1 - collapse });
      pose(round, { x: 1120, y: 690, r: -3, o: appear(t, b(2.6), b(4)) });
      const fp = ease.inOutCubic(prog(t, b(4.3), b(6) - b(4.3)));
      const target = [1490, 600];
      pose(block, {
        x: lerp(960, target[0] ?? 0, fp),
        y: lerp(560, target[1] ?? 0, fp) - Math.sin(fp * Math.PI) * 180,
        s: t < b(4.2) ? 0 : (1 - fp * 0.7) * spring(t, b(4.2), 2.4, 8),
        r: fp * 180,
        o: t >= b(4.2) && t < b(6.05) ? 1 : 0,
      });

      // the vault, and lines landing in it
      const vin = ease.outExpo(prog(t, b(3.4), 0.9));
      const shrink = ease.inOutCubic(prog(t, b(15.6), 1.2));
      pose(vault, { x: lerp(lerp(2400, 1440, vin), 1640, shrink), y: lerp(600, 230, shrink), s: lerp(1, 0.56, shrink) * (1 + pulse(t, b(6), 8) * 0.03), o: 1 - ease.inCubic(prog(t, b(19.6), 0.6)) });
      const landed = [b(6), ...flyers.map((f) => f.at + 1.1)];
      const nsOf = [2, ...flyers.map((f) => f.ns)];
      rows.forEach((r, i) => {
        let n = 0;
        let last = -1;
        landed.forEach((at, k) => {
          if (nsOf[k] === i && t >= at) {
            n++;
            last = at;
          }
        });
        r.count.textContent = String(n);
        r.row.style.background = last > 0 && t - last < 0.5 ? "rgba(167,123,255,.35)" : "rgba(255,255,255,.05)";
        if (r.cells.childElementCount !== n) {
          r.cells.innerHTML = "";
          for (let c = 0; c < n; c++) {
            const cell = h("span", "", r.cells);
            cell.style.cssText = "width:22px;height:22px;border-radius:6px;background:linear-gradient(135deg,#c9a8ff,#7a3fd1);display:block;";
          }
        }
      });
      blobId.textContent = t < b(6) ? "" : `✓ on Walrus · blob ${scramble("C3OrUWz-migL", prog(t, b(6), 1), 5)}…`;
      pose(blobId, { x: 1440, y: 930, o: appear(t, b(6), b(15)) });

      headA.render(t, b(7), b(15.4));
      flyers.forEach((f, k) => {
        const inP = ease.outExpo(prog(t, f.at, 0.5));
        const go = ease.inOutCubic(prog(t, f.at + 0.75, 0.4));
        const rowY = 470 + f.ns * 110;
        pose(f.el, {
          x: lerp(lerp(-300, 560, inP), 1300, go),
          y: lerp(560 + (k % 2) * 30, rowY, go),
          s: 1 - go * 0.6,
          o: t < f.at || t > f.at + 1.15 ? 0 : 1 - go * 0.5,
        });
      });

      // the loop
      headB.render(t, b(16.3), b(27.2));
      arcs.forEach((a, i) => draw(a, 360, ease.outCubic(prog(t, b(17 + i * 0.75), 0.6))));
      const orbit = Math.max(0, t - b(20)) * 1.6 - Math.PI / 2;
      nodeEls.forEach((n, i) => {
        const a = appear(t, b(17 + i * 0.75) - 0.2);
        const na = ((angles[i] ?? 0) * Math.PI) / 180;
        const near = t > b(20) ? Math.max(0, Math.cos(orbit - na)) ** 12 : 0;
        n.el.style.background = near > 0.5 ? "#7a3fd1" : "#1d1430";
        pose(n.el, { x: n.x, y: n.y, s: (0.8 + 0.2 * a) * (1 + near * 0.08), o: a });
      });
      pose(dot, { x: LC[0] + R * Math.cos(orbit), y: LC[1] + R * Math.sin(orbit), o: t > b(20) ? 1 : 0 });
      const ap = t >= b(20.5) ? spring(t, b(20.5), 2.4, 8) : 0;
      pose(ask, { x: 1380, y: 290, s: ap, o: ap > 0 ? 1 : 0 });
      const cp = t >= b(21.2) ? spring(t, b(21.2), 2.2, 8) : 0;
      pose(card, { x: 1380, y: 640, s: 1.95 * cp, o: cp > 0 ? 1 : 0 });
      const sv = 40 - 10 * ease.inOutCubic(prog(t, b(23), 1));
      const sl = appear(t, b(22.5));
      (slider.querySelector(".sv") as HTMLElement).textContent = `from $${Math.round(sv)}`;
      const pct = clamp(sv / 60) * 100;
      (slider.querySelector(".sf") as HTMLElement).style.width = `${pct}%`;
      (slider.querySelector(".sk") as HTMLElement).style.left = `${pct}%`;
      pose(slider, { x: 1380, y: 975, o: sl });
    },
  };
}

export function privacy(stage: HTMLElement, start: number, end: number): Scene {
  const root = h("section", "scene light", stage);
  const cam = h("div", "cam", root);
  const b = (n: number) => start + n * BEAT;
  const glow = glows(cam, [["#efe6ff", 1500, 700, 800], ["#e3f1ff", 300, 600, 700]]);

  const head1 = kinetic(cam, ["Exact numbers stay with you."], 960, 0, 84, 0, "head");
  const head2 = kinetic(cam, ["Lessons travel."], 960, 0, 84, 0, "head");
  head2.rows.forEach((r) => (r.mask.style.color = "#7a3fd1"));
  const left = h("div", "tile c", cam);
  left.style.cssText += "width:640px;height:520px;";
  h("div", "", left, '<div style="font-size:30px;font-weight:800;letter-spacing:-.02em">📱 On your phone</div><div style="font-size:20px;color:#8a8a8e;margin:4px 0 18px">exact amounts, labels and names</div>');
  const src: Array<[string, string]> = [
    ["☕ coffee", "$5.50"],
    ["🍜 dinner with An &amp; Bao", "$28.00"],
    ["✈️ tokyo pocket", "$41.00"],
    ["💄 lipstick, bought anyway", "$32.00"],
  ];
  const srcRows = src.map(([label, amt]) => {
    const row = h("div", "", left);
    row.style.cssText = "display:flex;justify-content:space-between;font-size:30px;padding:16px 4px;border-bottom:1px solid #f0f0f2;font-weight:500;";
    row.innerHTML = `<span>${label}</span><b>${amt}</b>`;
    return row;
  });
  const right = h("div", "tile c", cam);
  right.style.cssText += "width:660px;height:520px;background:#1a1230;color:#fff;border-color:#3a2a63;";
  h("div", "", right, '<div style="font-size:30px;font-weight:800;letter-spacing:-.02em">🧠 On Walrus Memory</div><div style="font-size:20px;color:#a99bd0;margin:4px 0 18px">typed, rounded lines. no names</div>');
  const out = ["RULE · coffee → eating out", "MONTH · 2026-11 · spent about $85", "GOAL · trip · about $1,200", "NUDGE · beauty · about $30 · bought anyway"];
  const outRows = out.map((text) => {
    const row = h("div", "mono", right, text);
    row.style.cssText = "font-size:21px;padding:14px 16px;margin-bottom:12px;border-radius:14px;background:#251a42;color:#e8dcff;white-space:nowrap;";
    return row;
  });
  const gate = h("div", "c", cam);
  gate.style.cssText += "width:10px;height:560px;border-radius:5px;background:linear-gradient(#a77bff,#0b84fe);box-shadow:0 0 40px #a77bff;";
  const gateLabel = h("div", "kicker c", cam, "typed facts only");
  gateLabel.style.cssText += "color:#7a3fd1;font-size:20px;";
  const notes = ["coffee → a known keyword", "names dropped · total rounded", "“tokyo” → kind “trip”", "$32 → about $30"].map((text) => {
    const el = h("div", "hand c", cam, text);
    el.style.cssText += "font-size:40px;color:#7a3fd1;white-space:nowrap;";
    return el;
  });
  const travellers = src.map(([label]) => {
    const el = h("div", "pill c", cam, label);
    el.style.cssText += "font-size:26px;background:#fff;border:1.5px solid #dcdce2;";
    return el;
  });
  const r = rng(21);
  const sparks = Array.from({ length: 4 }, () =>
    Array.from({ length: 10 }, () => {
      const d = h("div", "c", cam);
      d.style.cssText += "width:12px;height:12px;border-radius:50%;background:#a77bff;";
      return { d, a: r() * Math.PI * 2, v: 80 + r() * 140 };
    }),
  );
  const foot = h("div", "sub c", cam, "The server builds every line from a typed fact. Nothing else is ever written.");
  foot.style.fontSize = "30px";
  const times = [4, 7, 10, 13].map((k) => b(k));
  times.forEach((at) => {
    sfx(at, "swish", 0.5);
    sfx(at + 0.6, "glitch", 0.35);
    sfx(at + 1.1, "pop", 0.5);
  });
  sfx(b(0.3), "whoosh", 0.6);

  return {
    name: "privacy",
    start,
    end,
    root,
    render(t) {
      glow(t);
      cam.style.transform = `scale(${1 + (t - start) * 0.002})`;
      head1.rows.forEach((row) => pose(row.mask, { x: 960, y: 140 }));
      head2.rows.forEach((row) => pose(row.mask, { x: 960, y: 240 }));
      head1.render(t, b(0.3), end + 5);
      head2.render(t, b(2), end + 5);
      const li = appear(t, b(1));
      pose(left, { x: 470, y: 660, o: li, s: 0.94 + 0.06 * li });
      srcRows.forEach((row, i) => (row.style.opacity = String(appear(t, b(1.4) + i * 0.12))));
      const ri = appear(t, b(2.5));
      pose(right, { x: 1450, y: 660, o: ri, s: 0.94 + 0.06 * ri });
      pose(gate, { x: 960, y: 660, sy: ease.outExpo(prog(t, b(3), 0.8)), o: appear(t, b(3)) });
      pose(gateLabel, { x: 960, y: 355, o: appear(t, b(3.4)) });
      travellers.forEach((tr, k) => {
        const at = times[k] ?? 0;
        const go = ease.inOutCubic(prog(t, at, 0.6));
        pose(tr, { x: lerp(470, 950, go), y: 560 + k * 82, o: t >= at && t < at + 0.65 ? 1 : 0, s: 1 - go * 0.2 });
        sparks[k]?.forEach((sp) => {
          const p = prog(t, at + 0.6, 0.6);
          pose(sp.d, { x: 960 + Math.cos(sp.a) * sp.v * p, y: 560 + k * 82 + Math.sin(sp.a) * sp.v * p, o: p > 0 && p < 1 ? 1 - p : 0, s: 1 - p * 0.5 });
        });
        const row = outRows[k];
        if (row) {
          const op = ease.outExpo(prog(t, at + 1.1, 0.5));
          row.style.opacity = String(op);
          row.style.transform = `translateX(${(1 - op) * -60}px)`;
          row.style.boxShadow = t > at + 1.1 && t < at + 1.6 ? "0 0 0 3px #a77bff" : "none";
        }
        const n = notes[k];
        if (n) pose(n, { x: 960, y: 960, r: -2, o: appear(t, at + 0.55, at + 1.7, 0.3) });
        const srow = srcRows[k];
        if (srow) srow.style.background = t >= at && t < at + 0.8 ? "#f3edff" : "transparent";
      });
      pose(foot, { x: 960, y: 1015, o: appear(t, b(16)) });
    },
  };
}
