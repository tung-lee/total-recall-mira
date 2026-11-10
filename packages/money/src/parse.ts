import { type Category, categoryFromText, words } from "./categories.ts";
import type { Period } from "./facts.ts";
import { findGoalKind, type GoalKind, goalKindOf } from "./goals.ts";
import type { Cents } from "./money.ts";

export type Intent =
  | { kind: "spend"; cents: Cents; totalCents: Cents; split: number; label: string }
  | { kind: "budget"; cents: Cents }
  | { kind: "cap"; category: Category; cents: Cents; period: Period }
  | { kind: "goal"; goal: GoalKind; label: string; cents: Cents; by: string | null }
  | { kind: "correct"; target: string | null; category: Category }
  | { kind: "ask"; cents: Cents | null; item: string }
  | { kind: "move"; cents: Cents; goal: GoalKind | null }
  | { kind: "memory" }
  | { kind: "help" }
  | { kind: "summary" }
  | { kind: "greet" }
  | { kind: "thanks" }
  | { kind: "unknown" };

interface Amount {
  cents: Cents;
  start: number;
  end: number;
  dollarSign: boolean;
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const MONTH_WORD = "(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*";

function amounts(t: string): Amount[] {
  const out: Amount[] = [];
  const re = /(\$\s?)?(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{1,2}))?(\s?k\b)?/g;
  for (let m = re.exec(t); m; m = re.exec(t)) {
    const digits = m[2] ?? "";
    const before = t.slice(0, m.index);
    const after = t.slice(m.index + m[0].length);
    if (/^\s*(ways?|people|persons?|friends?|others?|of us|pax)\b/.test(after)) continue;
    if (/^\s*-\s*\d{2}\b/.test(after) && /^\d{4}$/.test(digits)) continue;
    const yearLike = /^20\d\d$/.test(digits) && !m[1];
    if (yearLike && new RegExp(`(\\b(by|in|until|til|before)|${MONTH_WORD})\\s*$`).test(before)) continue;
    if (/\bin\s*$/.test(before) && /^\s*(months?|weeks?|days?|years?)\b/.test(after)) continue;
    const value = Number(digits.replace(/,/g, "")) + (m[3] ? Number(m[3].padEnd(2, "0")) / 100 : 0);
    const cents = Math.round(value * (m[4] ? 1000 : 1) * 100);
    if (cents <= 0) continue;
    out.push({ cents, start: m.index, end: m.index + m[0].length, dollarSign: Boolean(m[1]) });
  }
  return out;
}

function pickAmount(list: Amount[]): Amount | null {
  return list.find((a) => a.dollarSign) ?? list[0] ?? null;
}

function without(t: string, a: Amount | null): string {
  return a ? `${t.slice(0, a.start)} ${t.slice(a.end)}` : t;
}

function splitCount(t: string): number {
  const ways = /\b(\d+)\s*(?:ways?|people|persons?|of us|pax)\b/.exec(t);
  if (ways) return Math.max(1, Number(ways[1]));
  const others = /\bwith\s+(\d+)\s*(?:friends?|others?)\b/.exec(t);
  if (others) return Number(others[1]) + 1;
  const names = /\bsplit\b.*?\bwith\s+([a-z ,&]+)$/.exec(t);
  if (names) {
    const people = (names[1] ?? "").split(/,|&|\band\b/).map((s) => s.trim()).filter(Boolean);
    return people.length + 1;
  }
  return 1;
}

const FILLER = new Set(
  "i i'm im a an the my on for at to of in spent spend paid pay bought got just today yesterday some new this that split ways way with and was is it".split(
    " ",
  ),
);

function labelOf(t: string): string {
  const cleaned = t
    .replace(/\bwith\s+[a-z ,&]+$/, " ")
    .replace(/\b\d+\s*(?:ways?|people|persons?|of us|pax)\b/, " ")
    .replace(/\bwith\s+\d+\s*(friends?|others?)\b/, " ")
    .replace(/\$/g, " ");
  const kept = words(cleaned).filter((w) => !FILLER.has(w));
  return kept.join(" ").trim();
}

function byMonth(t: string, now: Date): string | null {
  const iso = /\bby\s+(\d{4})-(\d{2})\b/.exec(t);
  if (iso) return `${iso[1]}-${iso[2]}`;
  const named = new RegExp(`\\b(?:by|before|until|in)\\s+${MONTH_WORD}(?:\\s+(20\\d\\d))?`).exec(t);
  if (named) {
    const month = MONTHS.indexOf((named[1] ?? "").slice(0, 3));
    if (month < 0) return null;
    let year = named[2] ? Number(named[2]) : now.getFullYear();
    if (!named[2] && month <= now.getMonth()) year += 1;
    return `${year}-${String(month + 1).padStart(2, "0")}`;
  }
  const inMonths = /\bin\s+(\d{1,2})\s*months?\b/.exec(t);
  if (inMonths) {
    const d = new Date(now.getFullYear(), now.getMonth() + Number(inMonths[1]), 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }
  return null;
}

function periodOf(t: string): Period | null {
  if (/\b(week|weekly|wk|per week|a week)\b|\/\s?w(k|eek)?\b/.test(t)) return "week";
  if (/\b(month|monthly|mo|per month|a month)\b|\/\s?mo(nth)?\b/.test(t)) return "month";
  return null;
}

const CATEGORY_TAIL =
  "(?:was|is|are|goes under|go under|counts as|count as|should be|belongs (?:in|to|under)|=|->|→)";

function correction(t: string): Intent | null {
  const lead = "^(?:no[,!.]?\\s+|nope[,!.]?\\s+|actually[,]?\\s+|oops[,]?\\s+)?";
  const pronoun = new RegExp(`${lead}(?:that|it|the last one|last one)(?:'s|\\s+${CATEGORY_TAIL})\\s+(?:a\\s+|an\\s+)?(.+)$`).exec(t);
  if (pronoun) {
    const category = categoryFromText(pronoun[1] ?? "");
    return category ? { kind: "correct", target: null, category } : null;
  }
  const named = new RegExp(`${lead}([a-z]+)\\s+${CATEGORY_TAIL}\\s+(?:a\\s+|an\\s+)?(.+)$`).exec(t);
  const filed = /^(?:move|put|file)\s+([a-z]+)\s+(?:under|in|into|to|as)\s+(.+)$/.exec(t);
  const m = named ?? filed;
  if (!m) return null;
  const category = categoryFromText(m[2] ?? "");
  return category ? { kind: "correct", target: m[1] ?? null, category } : null;
}

/** One message to one intent. Pure: `now` is only used to resolve "by march". */
export function parseMessage(raw: string, now: Date): Intent {
  const t = raw.toLowerCase().replace(/\s+/g, " ").replace(/[!?]+/g, " ").trim();
  if (/^\?+$/.test(raw.trim())) return { kind: "help" };
  if (!t) return { kind: "unknown" };
  const found = amounts(t);
  const amount = pickAmount(found);

  if (/\b(what do you know|what you know|know about me|remember about me|what do you remember|your memory|memories|memory)\b/.test(t)) {
    return { kind: "memory" };
  }
  if (!amount && /^(help|commands|menu|how does (this|it) work|what can (you|i) (do|say|ask)|what do i (do|say))\b/.test(t)) {
    return { kind: "help" };
  }
  if (
    /\b(how am i doing|how'?m i doing|summary|how much (?:do i have )?left|what'?s left|left this (?:week|month)|status|overview|balances?|my pockets?|budget left)\b/.test(
      t,
    )
  ) {
    return { kind: "summary" };
  }
  if (/\b(should i|can i afford|could i|is it ok to|thinking (?:of|about)|want(?:ed)? to (?:buy|get)|worth it|tempted|buy)\b/.test(t)) {
    const item = words(without(t, amount))
      .filter(
        (w) =>
          !FILLER.has(w) &&
          !"should can could afford ok thinking about of want wanted to buy get worth tempted by".split(" ").includes(w),
      )
      .join(" ");
    return { kind: "ask", cents: amount?.cents ?? null, item: item || "it" };
  }
  if (!amount) {
    const fix = correction(t);
    if (fix) return fix;
  }
  if (amount && /\b(cap|limit|max|maximum|no more than|at most|keep)\b/.test(t)) {
    const category = categoryFromText(without(t, amount));
    if (category) return { kind: "cap", category, cents: amount.cents, period: periodOf(t) ?? "month" };
  }
  if (amount && /\bbudget\b/.test(t)) {
    const category = categoryFromText(without(t, amount).replace(/\bbudget\b/, " "));
    if (category) return { kind: "cap", category, cents: amount.cents, period: periodOf(t) ?? "month" };
    const weekly = periodOf(t) === "week";
    return { kind: "budget", cents: weekly ? Math.round((amount.cents * 52) / 12) : amount.cents };
  }
  if (amount && (/\b(saving|save up|saving up|goal)\b/.test(t) || /\bsave\b.*\bfor\b/.test(t))) {
    const rest = without(t, amount);
    const forPart = /\bfor\s+(?:a\s+|an\s+|my\s+|the\s+)?(.+?)(?:\s+(?:by|before|until|in)\s+.*)?$/.exec(rest);
    const label = (forPart?.[1] ?? rest.replace(/\b(saving|save up|saving up|goal|save)\b/g, " "))
      .replace(/[^a-z ]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return { kind: "goal", goal: goalKindOf(label), label: label || "my goal", cents: amount.cents, by: byMonth(t, now) };
  }
  if (amount && /\b(move|put|transfer|stash|add|send|save)\b/.test(t)) {
    const to = /\b(?:to|into|in|towards?)\s+(.+)$/.exec(without(t, amount));
    return { kind: "move", cents: amount.cents, goal: to ? findGoalKind(to[1] ?? "") : null };
  }
  if (amount) {
    const split = /\bsplit\b|\bways?\b|\bwith\s+\d+\s*friends?\b/.test(t) ? splitCount(t) : 1;
    const label = labelOf(without(t, amount)) || "something";
    return { kind: "spend", cents: Math.round(amount.cents / split), totalCents: amount.cents, split, label };
  }
  if (/^(hi|hey|hello|yo|sup|hiya|heya|good (?:morning|evening|afternoon))\b/.test(t)) return { kind: "greet" };
  if (/\b(thanks|thank you|thx|ty|tysm|appreciate)\b/.test(t)) return { kind: "thanks" };
  return { kind: "unknown" };
}
