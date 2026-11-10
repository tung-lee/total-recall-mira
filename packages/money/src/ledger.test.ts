import { describe, expect, it } from "vitest";
import { categorize, categoryFromText, keywordOf } from "./categories.ts";
import { deriveHabit } from "./habits.ts";
import { capStatus, monthSpent, type Spend, startOfWeek } from "./ledger.ts";
import { aboutUsd, roundAbout, usd } from "./money.ts";

const now = new Date(2026, 10, 13, 20, 0);
const spend = (cents: number, at: Date, category: Spend["category"] = "food"): Spend => ({
  id: `${cents}-${at.getTime()}`,
  at: at.toISOString(),
  cents,
  totalCents: cents,
  split: 1,
  label: category,
  category,
  keyword: null,
  source: "keyword",
});

describe("money", () => {
  it("formats and rounds amounts", () => {
    expect(usd(550)).toBe("$5.50");
    expect(usd(120000)).toBe("$1,200");
    expect(roundAbout(1849)).toBe(1800);
    expect(roundAbout(4100)).toBe(4000);
    expect(roundAbout(43799)).toBe(44000);
    expect(roundAbout(123456)).toBe(125000);
    expect(aboutUsd(25)).toBe("about $1");
  });
});

describe("categories", () => {
  it("prefers a learned rule, then the keyword list, then other", () => {
    expect(categorize("iced coffee", { coffee: "food" })).toEqual({ category: "food", keyword: "coffee", source: "memory" });
    expect(categorize("iced coffee", {})).toEqual({ category: "treats", keyword: "coffee", source: "keyword" });
    expect(categorize("thing for alice", {})).toEqual({ category: "other", keyword: null, source: "default" });
  });

  it("finds keywords and category names in free text", () => {
    expect(keywordOf("Uber home")).toBe("uber");
    expect(categoryFromText("eating out")).toBe("food");
    expect(categoryFromText("my subscriptions")).toBe("bills");
  });
});

describe("ledger", () => {
  it("starts the week on Monday", () => {
    expect(startOfWeek(now).getDay()).toBe(1);
    expect(startOfWeek(now).getDate()).toBe(9);
  });

  it("counts a cap's spend within its period only", () => {
    const spends = [spend(3000, new Date(2026, 10, 10)), spend(2000, new Date(2026, 10, 5))];
    expect(capStatus(spends, "food", { cents: 6000, period: "week" }, now)).toMatchObject({ spent: 3000, left: 3000 });
    expect(capStatus(spends, "food", { cents: 6000, period: "month" }, now)).toMatchObject({ spent: 5000, left: 1000 });
  });

  it("uses the device's ledger when it saw the month, and memory's snapshot on a new device", () => {
    const snapshot = { month: "2026-11", cents: 25000, asOf: new Date(2026, 10, 12).toISOString() };
    const seen = [spend(24800, new Date(2026, 10, 4)), spend(1000, new Date(2026, 10, 13, 9))];
    expect(monthSpent(seen, now, snapshot)).toBe(25800);
    const fresh = [spend(1000, new Date(2026, 10, 13, 9))];
    expect(monthSpent(fresh, now, snapshot)).toBe(26000);
    expect(monthSpent(fresh, now, { ...snapshot, month: "2026-10" })).toBe(1000);
  });

  it("counts a spend from the snapshot's own second once", () => {
    const at = new Date(Date.UTC(2026, 10, 13, 9, 0, 5, 500));
    const snapshot = { month: "2026-11", cents: 600, asOf: "2026-11-13T09:00:05Z" };
    expect(monthSpent([spend(550, at)], now, snapshot)).toBe(550);
  });
});

describe("deriveHabit", () => {
  it("needs three spends, then reports the weekly spend and the peak days", () => {
    const fri = (week: number) => new Date(2026, 10, 13 - week * 7, 19);
    expect(deriveHabit([spend(3000, fri(0)), spend(3000, fri(1))], "food", now)).toBeNull();
    const habit = deriveHabit([spend(3000, fri(0)), spend(3000, fri(1)), spend(2000, fri(2)), spend(800, new Date(2026, 10, 10))], "food", now);
    expect(habit).toMatchObject({ kind: "habit", category: "food", cents: 2200, days: ["fri"] });
  });

  it("doesn't call a single week's spends a habit", () => {
    const thisWeek = [spend(3000, new Date(2026, 10, 10)), spend(3000, new Date(2026, 10, 11)), spend(2000, new Date(2026, 10, 12))];
    expect(deriveHabit(thisWeek, "food", now)).toBeNull();
  });
});
