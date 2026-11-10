// Act two, on one phone: text a spend, then ask before you buy, skip it, and save it.
import { BEAT, clamp, draw, ease, h, lerp, money, pose, prog, pulse, type Scene, s, scramble, sfx, spring } from "./lib.ts";
import { glows, kinetic } from "./scenes-open.ts";
import { adviceCard, bubble, chipsRow, learnedNote, makePhone, movedCard, receipt, touch } from "./ui.ts";

const DIGEST = "5yZHn2yhf9QjgFdgTEXa17nSymsxcQzTGCDMnQb8o2WL";

function appear(t: number, at: number, outAt = Infinity, dur = 0.5): number {
  if (t < at) return 0;
  return Math.min(ease.outExpo(prog(t, at, dur)), 1 - ease.inCubic(prog(t, outAt, 0.4)));
}

function countTo(t: number, steps: Array<[number, number]>, initial: number, dur = 0.6): number {
  let value = initial;
  let prev = initial;
  for (const [at, v] of steps) {
    if (t >= at) {
      value = lerp(prev, v, ease.outCubic(prog(t, at, dur)));
      prev = v;
    }
  }
  return value;
}

export function phoneAct(stage: HTMLElement, start: number, end: number): Scene {
  const root = h("section", "scene light", stage);
  const cam = h("div", "cam", root);
  const b = (n: number) => start + n * BEAT;
  const glow = glows(cam, [["#e3f1ff", 300, 200, 760], ["#ffe1f0", 1700, 980, 700], ["#e6f8d6", 1650, 200, 560]]);
  const PX = 640;
  const PY = 545;
  const PS = 1.18;

  // ---------- the phone and its thread ----------
  const phone = makePhone(cam, { strip: true, badge: "🧠 Walrus · Sui" });
  const th = phone.thread;
  const spend = (at: number, text: string, r: Parameters<typeof receipt>[0]) => {
    th.add(b(at), "me", bubble(text));
    th.add(b(at + 1), "mira", receipt(r));
    sfx(b(at), "tick", 0.6);
    sfx(b(at + 1), "pop", 0.7);
  };
  spend(3, "coffee 5.5", { emoji: "☕", label: "Coffee", amount: 550, why: "Filed under treats", left: 39450 });
  spend(7, "uber 18", { emoji: "🚕", label: "Uber", amount: 1800, why: "Filed under transport", left: 37650 });
  spend(11, "ramen 24", { emoji: "🍜", label: "Ramen", amount: 2400, why: "Filed under eating out", left: 35250, cap: ["eating out this week", 2400, 6000] });
  spend(15, "dinner 84 split 3 ways", { emoji: "🍜", label: "Dinner", amount: 2800, why: "Filed under eating out", sub: "your share of $84, 3 ways", left: 32450, cap: ["eating out this week", 5200, 6000] });
  th.add(b(26), "me", bubble("should i buy the $48 serum?"));
  sfx(b(26), "tick", 0.6);
  th.add(
    b(35.6),
    "mira",
    adviceCard({
      emoji: "🧴",
      item: "Vitamin C serum",
      sub: "$41 at Shelf · $7 less than elsewhere",
      verdict: "think",
      reasons: [
        ["$40 and up is where beauty buys turn impulsive", false],
        ["It fits: $324.50 left this month", true],
        ["That's 3% of your tokyo goal", true],
      ],
    }),
  );
  const chips = chipsRow(["skip it, move $41 to tokyo", "buy anyway"]);
  const chipItem = th.add(b(38.4), "me", chips.el);
  th.add(b(41.1), "me", bubble("skip it, move $41 to tokyo"));
  th.add(b(41.8), "mira", movedCard({ cents: 4100, name: "tokyo", spending: 5900, goal: 4100, note: "Settled on Sui testnet · receipt ↗" }));
  const note = learnedNote("Skipped a beauty buy, about $40");
  th.add(b(46), "center", note.el, (t) => {
    const ok = t >= b(49);
    note.status.textContent = ok ? "on Walrus ✓" : "saving…";
    note.status.classList.toggle("ok", ok);
  });
  sfx(b(46), "pop", 0.6);
  sfx(b(49), "shimmer", 0.8);

  // ---------- copy A: just text it ----------
  const kickA = h("div", "kicker c", cam, "01 · Spend tracking");
  kickA.style.color = "#0b84fe";
  const headA = kinetic(cam, ["Just text it."], 1060, 250, 132, 0, "head");
  const subA = h("div", "sub c", cam, "One message per spend. Mira files it, counts it,<br/>and shows what’s left.");
  subA.style.fontSize = "38px";
  const cats: Array<[string, string]> = [["🍜", "eating out"], ["🛒", "groceries"], ["☕", "treats"], ["🚕", "transport"], ["🛍️", "shopping"], ["💄", "beauty"], ["🎟️", "fun"], ["🧾", "bills"], ["💸", "other"]];
  const palette = cats.map(([e, l], i) => {
    const el = h("div", "pill c", cam, `${e} ${l}`);
    el.style.cssText += "background:#fff;border:1.5px solid #e2e2e6;font-size:28px;box-shadow:0 10px 30px -18px rgba(0,0,0,.3);";
    return { el, x: 1185 + (i % 3) * 255, y: 690 + Math.floor(i / 3) * 92 };
  });
  const ghosts = [
    { cat: 2, at: b(4) },
    { cat: 3, at: b(8) },
    { cat: 0, at: b(12) },
    { cat: 0, at: b(16) },
  ].map((g) => {
    const el = h("div", "pill c", cam, `${cats[g.cat]?.[0]} ${cats[g.cat]?.[1]}`);
    el.style.cssText += "background:#0b84fe;color:#fff;font-size:28px;z-index:20;";
    sfx(g.at - 0.1, "swish", 0.5);
    return { ...g, el };
  });
  const note1 = h("div", "hand c", cam, "filed for you ✓");
  note1.style.cssText += "font-size:58px;color:#0b84fe;";
  const note2 = h("div", "hand c", cam, "who was there stays on this phone 🤫");
  note2.style.cssText += "font-size:50px;color:#7a3fd1;";
  const svg = s("svg", { width: 1920, height: 1080, class: "c" }, cam);
  svg.style.cssText += "z-index:15;overflow:visible;";
  const arrow1 = s("path", { d: "M 900 655 C 860 690, 850 730, 870 760", fill: "none", stroke: "#0b84fe", "stroke-width": 5, "stroke-linecap": "round" }, svg);
  const arrow2 = s("path", { d: "M 1010 985 C 950 990, 905 960, 895 925", fill: "none", stroke: "#7a3fd1", "stroke-width": 5, "stroke-linecap": "round" }, svg);

  // ---------- copy B: ask before you buy ----------
  const kickB = h("div", "kicker c", cam, "02 · Ask before you buy");
  kickB.style.color = "#a14800";
  const headB = kinetic(cam, ["Ask before", "you buy."], 1060, 150, 120, 120, "head");
  const tiles = [
    { x: 1250, y: 610, title: "Price check" },
    { x: 1640, y: 610, title: "Budget" },
    { x: 1250, y: 875, title: "Impulse line" },
    { x: 1640, y: 875, title: "Your goal" },
  ].map((m, i) => {
    const el = h("div", "tile c", cam);
    el.style.cssText += "width:360px;height:235px;display:grid;align-content:start;gap:12px;";
    h("div", "kicker", el, m.title).style.cssText = "font-size:18px;color:#8a8a8e;";
    sfx(b(27 + i * 2), "blip", 0.55);
    return { ...m, el, body: h("div", "", el) };
  });
  const [tPrice, tBudget, tLine, tGoal] = tiles;
  const stores: Array<[string, number]> = [["Glow & Co", 4800], ["Basket", 4500], ["Shelf", 4100]];
  const storeRows = stores.map(([name, cents]) => {
    const row = h("div", "", tPrice?.body);
    row.style.cssText = "display:flex;justify-content:space-between;font-size:28px;font-weight:600;padding:4px 0;";
    row.innerHTML = `<span>${name}</span><span>${money(cents)}</span>`;
    return row;
  });
  if (tBudget) tBudget.body.innerHTML = `<div style="font-size:40px;font-weight:800;letter-spacing:-.04em;white-space:nowrap">$324.50 <span style="font-size:20px;color:#8a8a8e;font-weight:500">left of $400</span></div><span class="meter" style="height:12px;margin:14px 0"><i class="bm" style="width:0%"></i></span><div class="ok" style="font-size:26px;font-weight:700;color:#2fb350">✓ fits</div>`;
  if (tLine) tLine.body.innerHTML = `<div style="font-size:24px;color:#6c6c70">beauty · impulse buys start at</div><div style="position:relative;height:70px;margin-top:14px"><div style="position:absolute;left:0;right:0;top:30px;height:10px;border-radius:5px;background:#eee"></div><div class="tick40" style="position:absolute;left:66.6%;top:14px;width:4px;height:42px;background:#a14800;border-radius:2px"></div><div style="position:absolute;left:66.6%;top:-12px;transform:translateX(-50%);font-weight:700;color:#a14800;font-size:22px">$40</div><div class="mk" style="position:absolute;top:22px;width:26px;height:26px;border-radius:50%;background:#0b84fe;transform:translateX(-50%)"></div><div class="mkl" style="position:absolute;top:56px;transform:translateX(-50%);font-weight:800;font-size:24px">$41</div></div>`;
  if (tGoal) tGoal.body.innerHTML = `<div style="display:flex;gap:18px;align-items:center"><svg width="110" height="110" viewBox="0 0 76 76"><circle cx="38" cy="38" r="30" stroke="#eee" stroke-width="9" fill="none"/><circle class="gr" cx="38" cy="38" r="30" stroke="#34c759" stroke-width="9" fill="none" stroke-linecap="round" transform="rotate(-90 38 38)"/></svg><div style="font-size:30px;font-weight:700;line-height:1.15">$41 =<br/><span style="color:#2fb350">3% of tokyo</span></div></div>`;
  const conns = tiles.map((m) => s("path", { d: `M 870 ${560} C 960 ${560}, ${m.x - 260} ${m.y}, ${m.x - 182} ${m.y}`, fill: "none", stroke: "#c9d8ea", "stroke-width": 3, "stroke-dasharray": "8 8" }, svg));
  sfx(b(28), "ding", 0.35);
  sfx(b(31.6), "thud", 0.6);

  const stamp = h("div", "c", cam);
  stamp.style.cssText += "padding:26px 54px;border-radius:40px;background:#fff2dc;color:#a14800;font-weight:800;font-size:100px;letter-spacing:-.04em;white-space:nowrap;border:6px solid #a14800;z-index:25;";
  stamp.textContent = "🤔 Think twice";
  sfx(b(36), "impact", 1);
  sfx(b(38), "swish", 0.6);

  const finger = touch(cam);
  sfx(b(40.5), "tick", 0.9);
  sfx(b(41.1), "whoosh", 0.7);

  // ---------- skip it, save it ----------
  const pocketA = h("div", "tile c", cam);
  pocketA.style.cssText += "width:340px;display:grid;gap:6px;";
  const pocketB = h("div", "tile c", cam);
  pocketB.style.cssText += "width:400px;display:grid;gap:6px;";
  const coin = h("div", "c", cam);
  coin.style.cssText += "width:120px;height:120px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff7c2,#ffd23f 45%,#e0a800);display:grid;place-items:center;font-weight:900;font-size:40px;color:#7a5200;box-shadow:0 14px 30px -10px rgba(160,110,0,.6);z-index:22;";
  coin.textContent = "$41";
  const trail = Array.from({ length: 8 }, () => {
    const d = h("div", "c", cam);
    d.style.cssText += "width:60px;height:60px;border-radius:50%;background:#ffd23f;z-index:21;";
    return d;
  });
  sfx(b(42), "coin", 1);
  const skip = h("div", "head c", cam, "Skip it.");
  skip.style.fontSize = "150px";
  const save = h("div", "head c", cam, "Save it.");
  save.style.cssText += "font-size:150px;color:#2fb350;";
  sfx(b(42), "thud", 0.7);
  sfx(b(43), "thud", 0.8);
  const chain = h("div", "mono c", cam);
  chain.style.cssText += "font-size:22px;color:#6c6c70;white-space:nowrap;";
  sfx(b(44), "glitch", 0.45);

  let chipPos: [number, number] | null = null;

  return {
    name: "phone act",
    start,
    end,
    root,
    render(t) {
      glow(t);
      const lt = t - start;
      // camera: slow drift, a shake on the stamp
      const shake = pulse(t, b(36), 9) * 14;
      cam.style.transform = `translate(${Math.sin(t * 47) * shake}px, ${Math.cos(t * 39) * shake}px) scale(${1 + lt * 0.0015})`;

      const pin = ease.outExpo(prog(t, start, 1.1));
      pose(phone.root, { x: PX, y: PY + (1 - pin) * 900, s: PS, r: (1 - pin) * -6 });
      phone.strip.set(
        countTo(t, [[b(4), 39450], [b(8), 37650], [b(12), 35250], [b(16), 32450]], 40000),
        40000,
        countTo(t, [[b(41.8), 4100]], 0),
        120000,
        "tokyo",
      );
      th.render(t);

      // copy A
      pose(kickA, { x: 1060, y: 200, center: false, o: appear(t, b(1), b(23.5)) });
      headA.render(t, b(1.2), b(23.6));
      pose(subA, { x: 1060, y: 420, center: false, o: appear(t, b(2), b(23.5)) });
      palette.forEach((p, i) => {
        const a = appear(t, b(2.4) + i * 0.05, b(23.4));
        const hit = ghosts.reduce((acc, g) => acc + (g.cat === i ? pulse(t, g.at - 0.15, 9) : 0), 0);
        pose(p.el, { x: p.x, y: p.y + (1 - a) * 30, o: a, s: 1 + hit * 0.12 });
        p.el.style.borderColor = hit > 0.3 ? "#0b84fe" : "#e2e2e6";
      });
      for (const g of ghosts) {
        const p = prog(t, g.at - 0.15, 0.55);
        const from = palette[g.cat];
        if (!from || p <= 0 || p >= 1) {
          pose(g.el, { o: 0 });
          continue;
        }
        const e = ease.inOutCubic(p);
        const to: [number, number] = [700, 860];
        const cx = (from.x + to[0]) / 2;
        const cy = Math.min(from.y, to[1]) - 260;
        const x = (1 - e) ** 2 * from.x + 2 * (1 - e) * e * cx + e * e * to[0];
        const y = (1 - e) ** 2 * from.y + 2 * (1 - e) * e * cy + e * e * to[1];
        pose(g.el, { x, y, s: 1 - e * 0.45, o: 1 - ease.inCubic(p) * 0.8 });
      }
      pose(note1, { x: 1030, y: 610, r: -4, o: appear(t, b(5), b(10)) });
      draw(arrow1, 140, prog(t, b(5.2), 0.5) * (t < b(10) ? 1 : 0));
      pose(note2, { x: 1330, y: 985, r: -2, o: appear(t, b(17.4), b(23)) });
      draw(arrow2, 160, prog(t, b(17.6), 0.5) * (t < b(23) ? 1 : 0));

      // copy B
      pose(kickB, { x: 1060, y: 100, center: false, o: appear(t, b(24.5), b(39.6)) });
      headB.render(t, b(24.6), b(39.7));
      tiles.forEach((m, i) => {
        const at = b(27 + i * 2);
        const a = appear(t, at, b(39.8));
        pose(m.el, { x: m.x, y: m.y + (1 - a) * 40, s: 0.9 + 0.1 * a, o: a });
        const conn = conns[i];
        if (conn) conn.style.opacity = String(a * 0.9);
      });
      storeRows.forEach((row, i) => {
        const p = ease.outExpo(prog(t, b(27) + 0.1 + i * 0.12, 0.4));
        row.style.transform = `translateX(${(1 - p) * 40}px)`;
        row.style.opacity = String(p);
        const winner = i === 2 && t >= b(28);
        row.style.color = winner ? "#2fb350" : t >= b(28) ? "#b0b0b5" : "#111";
        row.style.textDecoration = !winner && t >= b(28) ? "line-through" : "none";
        if (winner) row.innerHTML = `<span>✓ Shelf</span><span>$41</span>`;
      });
      const bm = tBudget?.body.querySelector(".bm") as HTMLElement | null;
      if (bm) bm.style.width = `${ease.outCubic(prog(t, b(29.2), 0.6)) * 19}%`;
      const okEl = tBudget?.body.querySelector(".ok") as HTMLElement | null;
      if (okEl) okEl.style.opacity = String(appear(t, b(30)));
      const mk = tLine?.body.querySelector(".mk") as HTMLElement | null;
      const mkl = tLine?.body.querySelector(".mkl") as HTMLElement | null;
      const mp = ease.inOutCubic(prog(t, b(31), 0.9));
      if (mk && mkl) {
        const pct = mp * 68.3;
        mk.style.left = mkl.style.left = `${pct}%`;
        const over = pct > 66.6;
        mk.style.background = over ? "#ff9f0a" : "#0b84fe";
        mk.style.transform = `translateX(-50%) scale(${1 + (over ? pulse(t, b(31.6), 8) * 0.6 : 0)})`;
        mkl.textContent = over ? "$41 ⚑" : `$${Math.round(mp * 41)}`;
        mkl.style.color = over ? "#a14800" : "#111";
      }
      const gr = tGoal?.body.querySelector(".gr") as SVGCircleElement | null;
      if (gr) {
        const C = 2 * Math.PI * 30;
        const g = ease.outCubic(prog(t, b(33.2), 0.8)) * 0.034;
        gr.setAttribute("stroke-dasharray", `${(C * g).toFixed(2)} ${C}`);
      }
      conns.forEach((c, i) => draw(c, 520, prog(t, b(27 + i * 2) - 0.2, 0.4)));

      // the verdict stamp
      const sp = t >= b(36) ? spring(t, b(36), 2.6, 9) : 0;
      const fly = ease.inExpo(prog(t, b(37.8), 0.6));
      pose(stamp, {
        x: lerp(1440, PX, fly),
        y: lerp(720, 600, fly),
        s: (t < b(36) ? 0 : lerp(2.4, 1, Math.min(1, sp)) + (sp > 1 ? (sp - 1) * 0.6 : 0)) * (1 - fly * 0.8),
        r: -6 + fly * 6,
        o: t < b(36) ? 0 : 1 - fly,
      });

      // the tap on "skip it"
      if (!chipPos && t >= b(39.2)) {
        const chip = chips.chips[0];
        if (chip && chipItem.wrap.style.display !== "none") {
          const r = chip.getBoundingClientRect();
          const st = stage.getBoundingClientRect();
          chipPos = [r.left + r.width / 2 - st.left, r.top + r.height / 2 - st.top];
        }
      }
      finger.at(t, [980, 1060], chipPos ?? [600, 900], b(39.6), b(40.5));
      chips.chips[0]?.classList.toggle("on", t >= b(40.5));

      // pockets and the coin
      const pa = appear(t, b(40.4), b(51));
      const spendingNow = countTo(t, [[b(42), 5900]], 10000);
      const tokyoNow = countTo(t, [[b(42), 4100]], 0);
      pocketA.innerHTML = `<div class="kicker" style="font-size:18px;color:#8a8a8e">💳 Spending</div><div style="font-size:64px;font-weight:800;letter-spacing:-.04em">${money(Math.round(spendingNow))}</div>`;
      pocketB.innerHTML = `<div class="kicker" style="font-size:18px;color:#8a8a8e">✈️ tokyo</div><div style="font-size:64px;font-weight:800;letter-spacing:-.04em;color:#2fb350">${money(Math.round(tokyoNow))}<span style="font-size:28px;color:#8a8a8e;font-weight:600"> of $1,200</span></div>`;
      pose(pocketA, { x: 1210, y: 700 + (1 - pa) * 40, o: pa });
      pose(pocketB, { x: 1660, y: 700 + (1 - pa) * 40, o: pa, s: 1 + pulse(t, b(42), 8) * 0.08 });
      const cp = prog(t, b(41.2), b(42) - b(41.2));
      const ce = ease.inOutCubic(cp);
      const arc = (e: number): [number, number] => [lerp(1210, 1640, e), lerp(690, 690, e) - Math.sin(e * Math.PI) * 300];
      const [cx, cy] = arc(ce);
      pose(coin, { x: cx, y: cy, s: cp <= 0 ? 0 : spring(t, b(41.2), 2.5, 8) * (1 - ease.inCubic(prog(t, b(42), 0.25)) * 0.6), r: ce * 360, o: cp > 0 && t < b(42.25) ? 1 : 0 });
      trail.forEach((d, i) => {
        const e = clamp(ce - (i + 1) * 0.035);
        const [x, y] = arc(e);
        pose(d, { x, y, s: 0.9 - i * 0.09, o: cp > 0 && t < b(42.1) ? 0.35 - i * 0.04 : 0 });
      });
      pose(skip, { x: 1060, y: 170, center: false, o: appear(t, b(42), b(51)), s: 1 + pulse(t, b(42), 10) * 0.05 });
      pose(save, { x: 1060, y: 330, center: false, o: appear(t, b(43), b(51)), s: 1 + pulse(t, b(43), 10) * 0.05 });
      chain.textContent = t < b(44) ? "" : `Sui testnet · via Tatum gRPC · gas sponsored · tx ${scramble(DIGEST, prog(t, b(44), 1.6), 11).slice(0, 10)}…`;
      pose(chain, { x: 1440, y: 860, o: appear(t, b(44), b(51)) });
    },
  };
}
