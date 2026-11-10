import { type Category, WANTS } from "./categories.ts";
import { type Fact, factLine, type NudgeOutcome, type Period, type Weekday } from "./facts.ts";
import type { GoalKind } from "./goals.ts";
import type { MonthSnapshot } from "./ledger.ts";
import { type Cents, ceilDollars, floorDollars } from "./money.ts";

/** Where a nudge threshold came from: the nudge answer that set it, or the default for wants. */
export interface Threshold {
  cents: Cents;
  learned: { outcome: NudgeOutcome; cents: Cents; asOf: string } | null;
}

export interface Learned {
  budget: Cents | null;
  caps: Partial<Record<Category, { cents: Cents; period: Period }>>;
  goals: Partial<Record<GoalKind, { cents: Cents; by: string | null; asOf: string }>>;
  /** The newest goal is the active one. */
  goal: GoalKind | null;
  rules: Partial<Record<string, Category>>;
  /** Learned thresholds only; `thresholdFor` adds the default for wants. */
  thresholds: Partial<Record<Category, Threshold>>;
  habits: Partial<Record<Category, { cents: Cents; days: Weekday[] }>>;
  month: MonthSnapshot | null;
  facts: number;
}

export const DEFAULT_THRESHOLD: Cents = 4000;
const MIN_THRESHOLD: Cents = 1000;

export function thresholdFor(learned: Learned, category: Category): Threshold | null {
  const own = learned.thresholds[category];
  if (own) return own;
  return WANTS.includes(category) ? { cents: DEFAULT_THRESHOLD, learned: null } : null;
}

export function emptyLearned(): Learned {
  return { budget: null, caps: {}, goals: {}, goal: null, rules: {}, thresholds: {}, habits: {}, month: null, facts: 0 };
}

/**
 * Everything Mira learned, from facts in any order and with duplicates (the device's pending facts plus
 * what recall returned). The newest `asOf` wins per key; the nudge history sets the thresholds:
 * - a skip at about $X flags that category from 80% of $X, rounded down to $10;
 * - two "buy anyway" answers at or above the threshold raise it past the larger one, plus $10.
 */
export function learn(facts: readonly Fact[]): Learned {
  const unique = [...new Map(facts.map((f) => [factLine(f), f])).values()];
  const ordered = unique
    .map((f, i) => ({ f, i }))
    .sort((a, b) => a.f.asOf.localeCompare(b.f.asOf) || a.i - b.i)
    .map(({ f }) => f);

  const out = emptyLearned();
  out.facts = ordered.length;
  const ignored: Partial<Record<Category, Cents[]>> = {};

  for (const f of ordered) {
    switch (f.kind) {
      case "budget":
        out.budget = f.cents;
        break;
      case "cap":
        out.caps[f.category] = { cents: f.cents, period: f.period };
        break;
      case "goal":
        out.goals[f.goal] = { cents: f.cents, by: f.by, asOf: f.asOf };
        out.goal = f.goal;
        break;
      case "month":
        if (!out.month || f.month >= out.month.month) out.month = { month: f.month, cents: f.cents, asOf: f.asOf };
        break;
      case "rule":
        out.rules[f.keyword] = f.category;
        break;
      case "habit":
        out.habits[f.category] = { cents: f.cents, days: f.days };
        break;
      case "nudge": {
        const current = thresholdFor(out, f.category);
        const because = { outcome: f.outcome, cents: f.cents, asOf: f.asOf };
        if (f.outcome === "skipped") {
          const next = Math.max(MIN_THRESHOLD, floorDollars(f.cents * 0.8, 10));
          if (!current || next < current.cents) out.thresholds[f.category] = { cents: next, learned: because };
          ignored[f.category] = [];
        } else if (current && f.cents >= current.cents) {
          const list = [...(ignored[f.category] ?? []), f.cents];
          if (list.length >= 2) {
            out.thresholds[f.category] = { cents: ceilDollars(Math.max(...list), 10) + 1000, learned: because };
            ignored[f.category] = [];
          } else {
            ignored[f.category] = list;
          }
        }
        break;
      }
      default: {
        const never: never = f;
        return never;
      }
    }
  }
  return out;
}
