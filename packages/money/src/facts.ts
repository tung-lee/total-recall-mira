import { CATEGORIES, CATEGORY_LABEL, type Category, isKeyword } from "./categories.ts";
import { GOAL_KINDS, type GoalKind } from "./goals.ts";
import { type Cents, roundAbout, usd } from "./money.ts";

export type Period = "week" | "month";
export const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type Weekday = (typeof WEEKDAYS)[number];
export type NudgeOutcome = "skipped" | "bought";

/**
 * Everything Mira may write to Walrus Memory (PRD §8.1, ADR-0003). The server builds each line from one
 * of these with `factLine`; nothing else is ever written.
 */
export type Fact =
  | { kind: "budget"; cents: Cents; asOf: string }
  | { kind: "cap"; category: Category; cents: Cents; period: Period; asOf: string }
  | { kind: "goal"; goal: GoalKind; cents: Cents; by: string | null; asOf: string }
  | { kind: "month"; month: string; cents: Cents; asOf: string }
  | { kind: "rule"; keyword: string; category: Category; asOf: string }
  | { kind: "nudge"; category: Category; cents: Cents; outcome: NudgeOutcome; asOf: string }
  | { kind: "habit"; category: Category; cents: Cents; days: Weekday[]; asOf: string };

export type FactKind = Fact["kind"];

/** The four namespaces per user (built in `@mira/memory`). */
export const MEMORY_KINDS = ["prefs", "rules", "nudges", "habits"] as const;
export type MemoryKind = (typeof MEMORY_KINDS)[number];

export function memoryKind(fact: Fact): MemoryKind {
  switch (fact.kind) {
    case "budget":
    case "cap":
    case "goal":
    case "month":
      return "prefs";
    case "rule":
      return "rules";
    case "nudge":
      return "nudges";
    case "habit":
      return "habits";
    default: {
      const never: never = fact;
      return never;
    }
  }
}

/** The key under which the newest fact wins. Nudges are a history, so each one is its own key. */
export function factKey(fact: Fact): string {
  switch (fact.kind) {
    case "budget":
      return "budget";
    case "cap":
      return `cap:${fact.category}`;
    case "goal":
      return `goal:${fact.goal}`;
    case "month":
      return `month:${fact.month}`;
    case "rule":
      return `rule:${fact.keyword}`;
    case "nudge":
      return `nudge:${fact.category}:${fact.asOf}:${fact.outcome}:${fact.cents}`;
    case "habit":
      return `habit:${fact.category}`;
    default: {
      const never: never = fact;
      return never;
    }
  }
}

export function stamp(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}

const MAX_CENTS = 10_000_000;
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
const YEAR_MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

function amountOk(cents: number): boolean {
  return Number.isInteger(cents) && cents > 0 && cents <= MAX_CENTS;
}

/** Whether a fact may be written: every value inside the fixed lists and ranges (PRD §8.1). */
export function writable(fact: Fact): boolean {
  if (!ISO.test(fact.asOf)) return false;
  const categoryOk = (c: string) => (CATEGORIES as readonly string[]).includes(c);
  switch (fact.kind) {
    case "budget":
      return amountOk(fact.cents);
    case "cap":
      return amountOk(fact.cents) && categoryOk(fact.category);
    case "goal":
      return (
        amountOk(fact.cents) &&
        (GOAL_KINDS as readonly string[]).includes(fact.goal) &&
        (fact.by === null || YEAR_MONTH.test(fact.by))
      );
    case "month":
      return amountOk(fact.cents) && YEAR_MONTH.test(fact.month);
    case "rule":
      return isKeyword(fact.keyword) && categoryOk(fact.category);
    case "nudge":
      return amountOk(fact.cents) && categoryOk(fact.category);
    case "habit":
      return (
        amountOk(fact.cents) &&
        categoryOk(fact.category) &&
        fact.days.length <= 7 &&
        new Set(fact.days).size === fact.days.length &&
        fact.days.every((d) => (WEEKDAYS as readonly string[]).includes(d))
      );
    default: {
      const never: never = fact;
      return never;
    }
  }
}

const about = (cents: Cents) => `about ${usd(roundAbout(cents))}`;

/** The one line written for a fact. Amounts are rounded here, whatever the caller sent. */
export function factLine(fact: Fact): string {
  const asOf = `as_of=${fact.asOf}`;
  switch (fact.kind) {
    case "budget":
      return `BUDGET · monthly · ${about(fact.cents)} · ${asOf}`;
    case "cap":
      return `CAP · ${CATEGORY_LABEL[fact.category]} · ${about(fact.cents)} a ${fact.period} · ${asOf}`;
    case "goal":
      return `GOAL · ${fact.goal} · ${about(fact.cents)} · ${fact.by ? `by ${fact.by}` : "no date"} · ${asOf}`;
    case "month":
      return `MONTH · ${fact.month} · spent ${about(fact.cents)} · ${asOf}`;
    case "rule":
      return `RULE · ${fact.keyword} → ${CATEGORY_LABEL[fact.category]} · ${asOf}`;
    case "nudge":
      return `NUDGE · ${CATEGORY_LABEL[fact.category]} · ${about(fact.cents)} · ${fact.outcome === "skipped" ? "skipped" : "bought anyway"} · ${asOf}`;
    case "habit":
      return `HABIT · ${CATEGORY_LABEL[fact.category]} · ${about(fact.cents)} a week · ${fact.days.length ? fact.days.join(" ") : "any day"} · ${asOf}`;
    default: {
      const never: never = fact;
      return never;
    }
  }
}

const LABEL_TO_CATEGORY = new Map(
  (Object.entries(CATEGORY_LABEL) as [Category, string][]).map(([c, l]) => [l, c]),
);
const dollars = (s: string) => Number(s.replace(/,/g, "")) * 100;
const AMOUNT = "about \\$([\\d,]+)";
const AS_OF = "as_of=(\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z)";
const DAY = "(?:mon|tue|wed|thu|fri|sat|sun)";

const LINES: Array<[RegExp, (m: RegExpExecArray) => Fact | null]> = [
  [
    new RegExp(`^BUDGET · monthly · ${AMOUNT} · ${AS_OF}$`),
    (m) => ({ kind: "budget", cents: dollars(m[1] ?? ""), asOf: m[2] ?? "" }),
  ],
  [
    new RegExp(`^CAP · ([a-z ]+) · ${AMOUNT} a (week|month) · ${AS_OF}$`),
    (m) => {
      const category = LABEL_TO_CATEGORY.get(m[1] ?? "");
      const period = m[3] === "week" ? "week" : "month";
      return category ? { kind: "cap", category, cents: dollars(m[2] ?? ""), period, asOf: m[4] ?? "" } : null;
    },
  ],
  [
    new RegExp(`^GOAL · ([a-z]+) · ${AMOUNT} · (?:by (\\d{4}-\\d{2})|no date) · ${AS_OF}$`),
    (m) => {
      const goal = GOAL_KINDS.find((g) => g === m[1]);
      return goal ? { kind: "goal", goal, cents: dollars(m[2] ?? ""), by: m[3] ?? null, asOf: m[4] ?? "" } : null;
    },
  ],
  [
    new RegExp(`^MONTH · (\\d{4}-\\d{2}) · spent ${AMOUNT} · ${AS_OF}$`),
    (m) => ({ kind: "month", month: m[1] ?? "", cents: dollars(m[2] ?? ""), asOf: m[3] ?? "" }),
  ],
  [
    new RegExp(`^RULE · ([a-z]+) → ([a-z ]+) · ${AS_OF}$`),
    (m) => {
      const category = LABEL_TO_CATEGORY.get(m[2] ?? "");
      return category ? { kind: "rule", keyword: m[1] ?? "", category, asOf: m[3] ?? "" } : null;
    },
  ],
  [
    new RegExp(`^NUDGE · ([a-z ]+) · ${AMOUNT} · (skipped|bought anyway) · ${AS_OF}$`),
    (m) => {
      const category = LABEL_TO_CATEGORY.get(m[1] ?? "");
      const outcome = m[3] === "skipped" ? "skipped" : "bought";
      return category ? { kind: "nudge", category, cents: dollars(m[2] ?? ""), outcome, asOf: m[4] ?? "" } : null;
    },
  ],
  [
    new RegExp(`^HABIT · ([a-z ]+) · ${AMOUNT} a week · (${DAY}(?: ${DAY})*|any day) · ${AS_OF}$`),
    (m) => {
      const category = LABEL_TO_CATEGORY.get(m[1] ?? "");
      const days = m[3] === "any day" ? [] : ((m[3] ?? "").split(" ") as Weekday[]);
      return category ? { kind: "habit", category, cents: dollars(m[2] ?? ""), days, asOf: m[4] ?? "" } : null;
    },
  ],
];

/**
 * A recalled line back into a fact. Recalled text is untrusted: anything that isn't exactly one of our
 * line shapes, with values inside the fixed lists, is dropped.
 */
export function parseLine(text: string): Fact | null {
  for (const [re, build] of LINES) {
    const m = re.exec(text.trim());
    if (!m) continue;
    const fact = build(m);
    return fact && writable(fact) ? fact : null;
  }
  return null;
}

/** The fact as it will read back from memory, so the device learns from the same rounded values. */
export function roundFact(fact: Fact): Fact {
  return parseLine(factLine(fact)) ?? fact;
}
