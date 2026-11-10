import { describe, expect, it } from "vitest";
import type { Fact } from "./facts.ts";
import { DEFAULT_THRESHOLD, learn, thresholdFor } from "./learn.ts";

const at = (min: number) => `2026-11-03T10:${String(min).padStart(2, "0")}:00Z`;

describe("learn", () => {
  it("keeps the newest fact per key, whatever the order", () => {
    const l = learn([
      { kind: "budget", cents: 50000, asOf: at(5) },
      { kind: "budget", cents: 40000, asOf: at(1) },
      { kind: "rule", keyword: "coffee", category: "food", asOf: at(1) },
      { kind: "rule", keyword: "coffee", category: "treats", asOf: at(2) },
    ]);
    expect(l.budget).toBe(50000);
    expect(l.rules.coffee).toBe("treats");
  });

  it("takes the newest goal as the active one", () => {
    const l = learn([
      { kind: "goal", goal: "laptop", cents: 150000, by: null, asOf: at(1) },
      { kind: "goal", goal: "trip", cents: 120000, by: "2027-03", asOf: at(3) },
    ]);
    expect(l.goal).toBe("trip");
    expect(l.goals.laptop?.cents).toBe(150000);
  });

  it("lowers a category's threshold after a skip", () => {
    expect(thresholdFor(learn([]), "beauty")).toEqual({ cents: DEFAULT_THRESHOLD, learned: null });
    const l = learn([{ kind: "nudge", category: "beauty", cents: 4000, outcome: "skipped", asOf: at(1) }]);
    expect(thresholdFor(l, "beauty")?.cents).toBe(3000);
    expect(thresholdFor(l, "beauty")?.learned?.outcome).toBe("skipped");
  });

  it("never raises a threshold because of a later, bigger skip", () => {
    const l = learn([
      { kind: "nudge", category: "beauty", cents: 4000, outcome: "skipped", asOf: at(1) },
      { kind: "nudge", category: "beauty", cents: 10000, outcome: "skipped", asOf: at(2) },
    ]);
    expect(thresholdFor(l, "beauty")?.cents).toBe(3000);
  });

  it("raises a threshold after two buy-anyways at or above it", () => {
    const once = learn([{ kind: "nudge", category: "shopping", cents: 4500, outcome: "bought", asOf: at(1) }]);
    expect(thresholdFor(once, "shopping")?.cents).toBe(DEFAULT_THRESHOLD);
    const twice = learn([
      { kind: "nudge", category: "shopping", cents: 4500, outcome: "bought", asOf: at(1) },
      { kind: "nudge", category: "shopping", cents: 5500, outcome: "bought", asOf: at(2) },
    ]);
    expect(thresholdFor(twice, "shopping")?.cents).toBe(7000);
  });

  it("doesn't count the same line twice when recall and the device both have it", () => {
    const f: Fact = { kind: "nudge", category: "shopping", cents: 4500, outcome: "bought", asOf: at(1) };
    expect(thresholdFor(learn([f, f]), "shopping")?.cents).toBe(DEFAULT_THRESHOLD);
    expect(learn([f, f]).facts).toBe(1);
  });

  it("gives needs no threshold until one is learned", () => {
    expect(thresholdFor(learn([]), "groceries")).toBeNull();
  });
});
