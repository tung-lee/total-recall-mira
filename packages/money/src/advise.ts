import type { Category } from "./categories.ts";
import type { Period } from "./facts.ts";
import type { GoalKind } from "./goals.ts";
import { type Learned, type Threshold, thresholdFor } from "./learn.ts";
import { capStatus, monthSpent, type Spend } from "./ledger.ts";
import type { Cents } from "./money.ts";

export type Verdict = "go" | "think" | "skip";

export type Reason =
  | { kind: "budget_over"; left: Cents; overBy: Cents }
  | { kind: "budget_share"; left: Cents }
  | { kind: "cap_over"; category: Category; period: Period; cap: Cents; spent: Cents; overBy: Cents }
  | { kind: "threshold"; category: Category; threshold: Threshold }
  | { kind: "goal_share"; goal: GoalKind; target: Cents; percent: number }
  | { kind: "fits"; left: Cents | null };

export interface Advice {
  verdict: Verdict;
  cents: Cents;
  category: Category;
  reasons: Reason[];
  budgetLeft: Cents | null;
}

const RANK: Record<Verdict, number> = { go: 0, think: 1, skip: 2 };

export function adviseBuy(
  ask: { cents: Cents; category: Category },
  ctx: { learned: Learned; spends: readonly Spend[]; now: Date },
): Advice {
  const { learned, spends, now } = ctx;
  const reasons: Reason[] = [];
  let verdict: Verdict = "go";
  const raise = (v: Verdict) => {
    if (RANK[v] > RANK[verdict]) verdict = v;
  };

  const budgetLeft = learned.budget === null ? null : learned.budget - monthSpent(spends, now, learned.month);
  if (budgetLeft !== null) {
    if (ask.cents > budgetLeft) {
      raise("skip");
      reasons.push({ kind: "budget_over", left: budgetLeft, overBy: ask.cents - Math.max(0, budgetLeft) });
    } else if (ask.cents > budgetLeft / 4) {
      raise("think");
      reasons.push({ kind: "budget_share", left: budgetLeft });
    }
  }

  const cap = learned.caps[ask.category];
  if (cap) {
    const status = capStatus(spends, ask.category, cap, now);
    if (status.spent + ask.cents > cap.cents) {
      raise("skip");
      reasons.push({
        kind: "cap_over",
        category: ask.category,
        period: cap.period,
        cap: cap.cents,
        spent: status.spent,
        overBy: status.spent + ask.cents - cap.cents,
      });
    }
  }

  const threshold = thresholdFor(learned, ask.category);
  if (threshold && ask.cents >= threshold.cents) {
    raise("think");
    reasons.push({ kind: "threshold", category: ask.category, threshold });
  }

  if (verdict === "go") reasons.unshift({ kind: "fits", left: budgetLeft });

  const goal = learned.goal ? learned.goals[learned.goal] : undefined;
  if (learned.goal && goal) {
    const percent = Math.max(1, Math.round((ask.cents / goal.cents) * 100));
    reasons.push({ kind: "goal_share", goal: learned.goal, target: goal.cents, percent });
  }

  return { verdict, cents: ask.cents, category: ask.category, reasons, budgetLeft };
}
