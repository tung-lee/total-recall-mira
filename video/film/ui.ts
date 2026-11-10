// Mira's interface, rebuilt as animatable layers: a phone, its thread, and the cards the app draws. The thread
// is deterministic: every message has an arrival time, and its row grows from zero height, so older messages
// scroll up the way they do in the app.
import { blobSvg, clamp, ease, h, money, pose, prog, spring } from "./lib.ts";

export interface Item {
  wrap: HTMLElement;
  inner: HTMLElement;
  at: number;
  height: number;
  tick?: (t: number) => void;
}

/** Every thread in the film, measured once fonts and images have loaded. */
export const threads: Thread[] = [];

export class Thread {
  readonly el: HTMLElement;
  readonly items: Item[] = [];

  constructor(parent: HTMLElement) {
    this.el = h("div", "thread", parent);
    threads.push(this);
  }

  add(at: number, from: "me" | "mira" | "center", content: HTMLElement, tick?: (t: number) => void): Item {
    const wrap = h("div", "wrap", this.el);
    const inner = h("div", `row ${from}`, wrap);
    inner.appendChild(content);
    const item: Item = { wrap, inner, at, height: 0, tick };
    this.items.push(item);
    return item;
  }

  measure(): void {
    for (const it of this.items) {
      it.wrap.style.display = "";
      it.wrap.style.height = "auto";
      it.height = it.wrap.offsetHeight;
    }
  }

  render(t: number): void {
    for (const it of this.items) {
      if (t < it.at) {
        it.wrap.style.display = "none";
        continue;
      }
      it.wrap.style.display = "";
      const p = ease.outCubic(prog(t, it.at, 0.32));
      it.wrap.style.height = `${(it.height * p).toFixed(1)}px`;
      const sp = spring(t, it.at, 2.4, 8);
      const origin = it.inner.classList.contains("me") ? "100% 100%" : it.inner.classList.contains("center") ? "50% 50%" : "0% 100%";
      it.inner.style.transformOrigin = origin;
      it.inner.style.transform = `scale(${(0.6 + 0.4 * sp).toFixed(4)})`;
      it.inner.style.opacity = clamp(p * 1.6).toFixed(3);
      it.tick?.(t);
    }
  }
}

export interface Strip {
  root: HTMLElement;
  set(left: number, budget: number, saved: number, target: number, goal: string): void;
}

export interface Phone {
  root: HTMLElement;
  screen: HTMLElement;
  thread: Thread;
  strip: Strip;
  composer: HTMLElement;
}

export function makePhone(parent: HTMLElement, opts: { strip?: boolean; badge?: string } = {}): Phone {
  const root = h("div", "phone c", parent);
  h("div", "island", root);
  const screen = h("div", "screen", root);
  h("div", "statusbar", screen, `<span>9:41</span><span class="sb">●●●● ▮</span>`);
  const header = h("div", "im-header", screen);
  const contact = h("div", "im-contact", header);
  const av = h("div", "im-avatar", contact);
  av.appendChild(blobSvg("#9BE15D", 44).root);
  h("div", "im-name", contact, "Mira <span>›</span>");
  h("div", "im-sub", contact, "money friend · learns as you text");
  if (opts.badge) h("div", "im-mode", header, opts.badge);
  const stripEl = h("div", "strip", screen);
  stripEl.innerHTML = `<span class="ss"><b class="ss-a"></b><span class="meter"><i class="ss-am"></i></span></span><span class="ss"><b class="ss-b"></b><span class="meter good"><i class="ss-bm"></i></span></span>`;
  if (!opts.strip) stripEl.style.display = "none";
  const thread = new Thread(screen);
  const composer = h("div", "composer", screen, `<span class="plus">+</span><span class="field">Text a spend, or ask before you buy</span>`);
  const q = (sel: string) => stripEl.querySelector(sel) as HTMLElement;
  const strip: Strip = {
    root: stripEl,
    set(left, budget, saved, target, goal) {
      q(".ss-a").textContent = `💰 ${money(Math.max(0, left))} left`;
      q(".ss-am").style.width = `${clamp((budget - left) / budget) * 100}%`;
      q(".ss-b").textContent = `✈️ ${goal} ${money(saved, false)} / ${money(target, false)}`;
      q(".ss-bm").style.width = `${clamp(saved / target) * 100}%`;
    },
  };
  return { root, screen, thread, strip, composer };
}

// ---------- cards ----------

export const bubble = (text: string) => h("div", "bubble", undefined, text);

export function typingBubble(): HTMLElement {
  return h("div", "bubble typing", undefined, "<i></i><i></i><i></i>");
}

export function receipt(o: { emoji: string; label: string; amount: number; why: string; mem?: boolean; left?: number; sub?: string; cap?: [string, number, number] }): HTMLElement {
  const el = h("div", "card receipt");
  h("div", "receipt-top", el, `<span class="emoji">${o.emoji}</span><span class="label">${o.label}</span><b>${money(o.amount)}</b>`);
  h("div", `receipt-why${o.mem ? " mem" : ""}`, el, o.why);
  if (o.sub) h("div", "receipt-sub", el, o.sub);
  if (o.left !== undefined) h("div", "receipt-left", el, `${money(o.left)} left this month`);
  if (o.cap) {
    const [label, spent, cap] = o.cap;
    h("div", "receipt-cap", el, `<span>${label}</span><span class="meter"><i style="width:${(spent / cap) * 100}%"></i></span><span>${money(spent)} / ${money(cap)}</span>`);
  }
  return el;
}

export function traceCard(title: string, steps: Array<[string, string?]>, times: number[]): { el: HTMLElement; tick: (t: number) => void } {
  const el = h("div", "trace");
  const titleEl = h("div", "trace-title", el, title);
  const ol = h("ol", "", el);
  const lis = steps.map(([label, det]) => h("li", "", ol, `<span class="dot"></span><span>${label}</span>${det ? `<span class="det">${det}</span>` : ""}`));
  return {
    el,
    tick: (t) => {
      lis.forEach((li, i) => {
        const at = times[i] ?? 0;
        li.className = t >= at + 0.25 ? "done" : t >= at ? "run" : "";
      });
      const done = times.every((at) => t >= at + 0.25);
      el.classList.toggle("done", done);
      titleEl.textContent = `${done ? "✓ " : ""}${title}`;
    },
  };
}

export function adviceCard(o: { emoji: string; item: string; sub: string; verdict: "think" | "go" | "skip"; reasons: Array<[string, boolean]> }): HTMLElement {
  const label = { think: ["🤔", "Think twice"], go: ["💚", "Go for it"], skip: ["🙅", "Skip it"] }[o.verdict];
  const el = h("div", "card advice");
  h("div", `verdict-band ${o.verdict}`, el, `<span>${label[0]}</span><span>${label[1]}</span>`);
  h("div", "advice-top", el, `<span class="emoji">${o.emoji}</span><div><div class="card-title">${o.item}</div><div class="card-sub">${o.sub}</div></div>`);
  h("div", "why-title", el, "Why");
  const ul = h("ul", "reasons", el);
  for (const [text, mem] of o.reasons) h("li", mem ? "mem" : "", ul, `${mem ? "🧠 " : "• "}${text}`);
  return el;
}

export function chipsRow(labels: string[]): { el: HTMLElement; chips: HTMLElement[] } {
  const el = h("div", "chips");
  const chips = labels.map((l) => h("span", "chip", el, l));
  return { el, chips };
}

export function movedCard(o: { cents: number; name: string; spending: number; goal: number; note: string }): HTMLElement {
  const el = h("div", "card moved");
  h("div", "moved-top", el, `<span class="check">✓</span><div><div class="card-title">Moved ${money(o.cents)} to ${o.name}</div><div class="card-sub">from Spending</div></div>`);
  h("div", "pockets", el, `<span>💳 Spending <b>${money(o.spending)}</b></span><span>✈️ ${o.name} <b>${money(o.goal)}</b></span>`);
  h("div", "fine", el, o.note);
  return el;
}

export function learnedNote(text: string): { el: HTMLElement; status: HTMLElement } {
  const el = h("div", "learned");
  const item = h("div", "learned-item", el, `<span class="lh">🧠 Remembered</span><span>${text}</span>`);
  const status = h("span", "ls", item, "saving…");
  return { el, status };
}

/** A touch indicator: a dot that moves to (x, y) and ripples on tap. */
export function touch(parent: HTMLElement): { el: HTMLElement; ring: HTMLElement; at(t: number, from: [number, number], to: [number, number], moveAt: number, tapAt: number): void } {
  const el = h("div", "touch c", parent);
  const ring = h("div", "touch-ring c", parent);
  return {
    el,
    ring,
    at(t, from, to, moveAt, tapAt) {
      const m = ease.inOutCubic(prog(t, moveAt, tapAt - moveAt));
      const x = from[0] + (to[0] - from[0]) * m;
      const y = from[1] + (to[1] - from[1]) * m;
      const press = t >= tapAt && t < tapAt + 0.18 ? 0.8 : 1;
      const vis = t < moveAt - 0.2 ? 0 : t > tapAt + 0.9 ? Math.max(0, 1 - (t - tapAt - 0.9) * 4) : 1;
      pose(el, { x, y, s: press, o: vis * 0.9 });
      const rp = prog(t, tapAt, 0.6);
      pose(ring, { x: to[0], y: to[1], s: 0.4 + rp * 2.2, o: t >= tapAt ? (1 - rp) * 0.7 : 0 });
    },
  };
}
