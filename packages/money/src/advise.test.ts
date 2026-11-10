import { describe, expect, it } from "vitest";
import { adviseBuy } from "./advise.ts";
import { learn } from "./learn.ts";
import type { Spend } from "./ledger.ts";

const now = new Date(2026, 10, 3, 12, 0);
const spend = (cents: number, category: Spend["category"], daysAgo = 0): Spend => ({
  id: `${cents}-${category}-${daysAgo}`,
  at: new Date(now.getTime() - daysAgo * 86_400_000).toISOString(),
  cents,
  totalCents: cents,
  split: 1,
  label: category,
  category,
  keyword: null,
  source: "keyword",
});
const asOf = "2026-11-01T09:00:00Z";
const base = learn([
  { kind: "budget", cents: 40000, asOf },
  { kind: "goal", goal: "trip", cents: 120000, by: "2027-03", asOf },
]);

describe("adviseBuy", () => {
  it("says go for a small need and shows what's left", () => {
    const a = adviseBuy({ cents: 1200, category: "groceries" }, { learned: base, spends: [spend(5000, "food")], now });
    expect(a.verdict).toBe("go");
    expect(a.budgetLeft).toBe(35000);
    expect(a.reasons[0]).toEqual({ kind: "fits", left: 35000 });
  });

  it("says think at the default threshold for a want", () => {
    const a = adviseBuy({ cents: 4100, category: "beauty" }, { learned: base, spends: [], now });
    expect(a.verdict).toBe("think");
    expect(a.reasons).toContainEqual({ kind: "threshold", category: "beauty", threshold: { cents: 4000, learned: null } });
    expect(a.reasons).toContainEqual({ kind: "goal_share", goal: "trip", target: 120000, percent: 3 });
  });

  it("flags a smaller buy once a skip lowered the threshold", () => {
    const before = adviseBuy({ cents: 3200, category: "beauty" }, { learned: base, spends: [], now });
    expect(before.verdict).toBe("go");
    const skipped = learn([
      { kind: "budget", cents: 40000, asOf },
      { kind: "nudge", category: "beauty", cents: 4000, outcome: "skipped", asOf: "2026-11-02T09:00:00Z" },
    ]);
    const after = adviseBuy({ cents: 3200, category: "beauty" }, { learned: skipped, spends: [], now });
    expect(after.verdict).toBe("think");
    expect(after.reasons.find((r) => r.kind === "threshold")).toMatchObject({ threshold: { cents: 3000, learned: { outcome: "skipped" } } });
  });

  it("says skip when the category's cap would break", () => {
    const capped = learn([{ kind: "cap", category: "food", cents: 6000, period: "week", asOf }]);
    const a = adviseBuy({ cents: 2500, category: "food" }, { learned: capped, spends: [spend(4000, "food")], now });
    expect(a.verdict).toBe("skip");
    expect(a.reasons[0]).toMatchObject({ kind: "cap_over", overBy: 500 });
  });

  it("says skip when the budget would break", () => {
    const a = adviseBuy({ cents: 9000, category: "groceries" }, { learned: base, spends: [spend(35000, "bills")], now });
    expect(a.verdict).toBe("skip");
    expect(a.reasons[0]).toEqual({ kind: "budget_over", left: 5000, overBy: 4000 });
  });

  it("says think for a big share of what's left", () => {
    const a = adviseBuy({ cents: 9000, category: "groceries" }, { learned: base, spends: [spend(20000, "bills")], now });
    expect(a.verdict).toBe("think");
    expect(a.reasons[0]).toEqual({ kind: "budget_share", left: 20000 });
  });
});
