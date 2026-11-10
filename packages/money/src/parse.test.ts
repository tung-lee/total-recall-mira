import { describe, expect, it } from "vitest";
import { parseMessage } from "./parse.ts";

const now = new Date(2026, 10, 3, 12, 0);
const p = (t: string) => parseMessage(t, now);

describe("parseMessage", () => {
  it("reads a spend with the amount on either side", () => {
    expect(p("coffee 5.5")).toEqual({ kind: "spend", cents: 550, totalCents: 550, split: 1, label: "coffee" });
    expect(p("$18 uber")).toMatchObject({ kind: "spend", cents: 1800, label: "uber" });
    expect(p("spent 24 on ramen")).toMatchObject({ kind: "spend", cents: 2400, label: "ramen" });
  });

  it("logs my share of a split", () => {
    expect(p("dinner 84 split 3 ways")).toMatchObject({ kind: "spend", cents: 2800, totalCents: 8400, split: 3, label: "dinner" });
    expect(p("split 90 dinner with An and Bao")).toMatchObject({ kind: "spend", cents: 3000, split: 3, label: "dinner" });
    expect(p("pizza 60 with 2 friends")).toMatchObject({ kind: "spend", cents: 2000, split: 3 });
  });

  it("reads a monthly budget, converting a weekly one", () => {
    expect(p("budget 400 a month")).toEqual({ kind: "budget", cents: 40000 });
    expect(p("my budget is $100 a week")).toEqual({ kind: "budget", cents: 43333 });
  });

  it("reads a cap with its category and period", () => {
    expect(p("cap eating out at 60 a week")).toEqual({ kind: "cap", category: "food", cents: 6000, period: "week" });
    expect(p("limit beauty to $50 per month")).toEqual({ kind: "cap", category: "beauty", cents: 5000, period: "month" });
    expect(p("budget 80 for treats weekly")).toEqual({ kind: "cap", category: "treats", cents: 8000, period: "week" });
  });

  it("reads a goal with its kind, label and month, without taking the year as the amount", () => {
    expect(p("saving 1200 for tokyo by march")).toEqual({ kind: "goal", goal: "trip", label: "tokyo", cents: 120000, by: "2027-03" });
    expect(p("goal: 2k for a new laptop by dec 2026")).toMatchObject({ kind: "goal", goal: "laptop", cents: 200000, by: "2026-12" });
    expect(p("save up 500 for a rainy day")).toMatchObject({ kind: "goal", goal: "emergency", by: null });
  });

  it("reads corrections, with or without a word", () => {
    expect(p("coffee is treats")).toEqual({ kind: "correct", target: "coffee", category: "treats" });
    expect(p("coffee counts as eating out")).toEqual({ kind: "correct", target: "coffee", category: "food" });
    expect(p("no, that was groceries")).toEqual({ kind: "correct", target: null, category: "groceries" });
    expect(p("put uber under fun")).toEqual({ kind: "correct", target: "uber", category: "fun" });
  });

  it("reads a should-I-buy, with or without a price", () => {
    expect(p("should i buy the $48 serum?")).toEqual({ kind: "ask", cents: 4800, item: "serum" });
    expect(p("thinking about a 38 lipstick")).toEqual({ kind: "ask", cents: 3800, item: "lipstick" });
    expect(p("can i afford sneakers")).toEqual({ kind: "ask", cents: null, item: "sneakers" });
  });

  it("reads a move to a goal", () => {
    expect(p("move 20 to trip")).toEqual({ kind: "move", cents: 2000, goal: "trip" });
    expect(p("save 15")).toEqual({ kind: "move", cents: 1500, goal: null });
  });

  it("reads the conversational intents", () => {
    expect(p("what do you know about me?")).toEqual({ kind: "memory" });
    expect(p("help")).toEqual({ kind: "help" });
    expect(p("what can you do?")).toEqual({ kind: "help" });
    expect(p("?")).toEqual({ kind: "help" });
    expect(p("how am i doing")).toEqual({ kind: "summary" });
    expect(p("hey mira")).toEqual({ kind: "greet" });
    expect(p("thanks!")).toEqual({ kind: "thanks" });
    expect(p("tell me a joke")).toEqual({ kind: "unknown" });
  });
});
