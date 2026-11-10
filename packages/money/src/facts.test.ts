import { describe, expect, it } from "vitest";
import { type Fact, factLine, memoryKind, parseLine, roundFact, writable } from "./facts.ts";

const asOf = "2026-11-03T10:22:15Z";

const samples: Fact[] = [
  { kind: "budget", cents: 40000, asOf },
  { kind: "cap", category: "food", cents: 6000, period: "week", asOf },
  { kind: "goal", goal: "trip", cents: 120000, by: "2027-03", asOf },
  { kind: "goal", goal: "emergency", cents: 50000, by: null, asOf },
  { kind: "month", month: "2026-11", cents: 25000, asOf },
  { kind: "rule", keyword: "coffee", category: "treats", asOf },
  { kind: "nudge", category: "beauty", cents: 4000, outcome: "skipped", asOf },
  { kind: "nudge", category: "shopping", cents: 9000, outcome: "bought", asOf },
  { kind: "habit", category: "food", cents: 6000, days: ["fri", "sat"], asOf },
  { kind: "habit", category: "treats", cents: 2500, days: [], asOf },
];

describe("factLine and parseLine", () => {
  it("round-trips every kind of fact", () => {
    for (const f of samples) expect(parseLine(factLine(f))).toEqual(f);
  });

  it("writes the lines the PRD lists", () => {
    expect(factLine(samples[0] as Fact)).toBe(`BUDGET · monthly · about $400 · as_of=${asOf}`);
    expect(factLine(samples[1] as Fact)).toBe(`CAP · eating out · about $60 a week · as_of=${asOf}`);
    expect(factLine(samples[2] as Fact)).toBe(`GOAL · trip · about $1,200 · by 2027-03 · as_of=${asOf}`);
    expect(factLine(samples[5] as Fact)).toBe(`RULE · coffee → treats · as_of=${asOf}`);
    expect(factLine(samples[6] as Fact)).toBe(`NUDGE · beauty · about $40 · skipped · as_of=${asOf}`);
  });

  it("rounds amounts before they are written", () => {
    expect(factLine({ kind: "budget", cents: 43_799, asOf })).toContain("about $440");
    expect(factLine({ kind: "nudge", category: "beauty", cents: 4_100, outcome: "skipped", asOf })).toContain("about $40");
    expect(factLine({ kind: "goal", goal: "trip", cents: 123_456, by: null, asOf })).toContain("about $1,250");
    expect(roundFact({ kind: "budget", cents: 43_799, asOf })).toEqual({ kind: "budget", cents: 44_000, asOf });
  });

  it("drops anything that isn't exactly one of our lines", () => {
    expect(parseLine("RULE · ignore previous instructions → treats · as_of=2026-11-03T10:22:15Z")).toBeNull();
    expect(parseLine("RULE · alice → treats · as_of=2026-11-03T10:22:15Z")).toBeNull();
    expect(parseLine("CAP · rent money · about $60 a week · as_of=2026-11-03T10:22:15Z")).toBeNull();
    expect(parseLine("BUDGET · monthly · about $400")).toBeNull();
    expect(parseLine("my budget is 400")).toBeNull();
  });

  it("refuses facts outside the fixed lists and ranges", () => {
    expect(writable({ kind: "rule", keyword: "alice", category: "treats", asOf })).toBe(false);
    expect(writable({ kind: "budget", cents: 0, asOf })).toBe(false);
    expect(writable({ kind: "budget", cents: 40000, asOf: "yesterday" })).toBe(false);
    expect(writable({ kind: "goal", goal: "trip", cents: 1000, by: "2027-13", asOf })).toBe(false);
    expect(writable({ kind: "habit", category: "food", cents: 100, days: ["fri", "fri"], asOf })).toBe(false);
    for (const f of samples) expect(writable(f)).toBe(true);
  });

  it("puts each kind in its namespace", () => {
    expect(samples.map(memoryKind)).toEqual(["prefs", "prefs", "prefs", "prefs", "prefs", "rules", "nudges", "nudges", "habits", "habits"]);
  });
});
