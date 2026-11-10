import { words } from "./categories.ts";

export const GOAL_KINDS = ["trip", "laptop", "emergency", "gift", "home", "car", "other"] as const;
export type GoalKind = (typeof GOAL_KINDS)[number];

export const GOAL_LABEL: Record<GoalKind, string> = {
  trip: "trip",
  laptop: "laptop",
  emergency: "emergency fund",
  gift: "gift",
  home: "home",
  car: "car",
  other: "goal",
};

export const GOAL_EMOJI: Record<GoalKind, string> = {
  trip: "✈️",
  laptop: "💻",
  emergency: "🛟",
  gift: "🎁",
  home: "🏠",
  car: "🚗",
  other: "🎯",
};

const GOAL_WORDS: Record<string, GoalKind> = Object.fromEntries(
  (
    [
      ["trip", "trip travel vacation holiday holidays flight flights tokyo japan seoul korea bali paris london bangkok thailand europe hawaii vegas nyc vietnam hanoi saigon singapore taiwan rome barcelona mexico iceland"],
      ["laptop", "laptop macbook computer pc ipad tablet iphone camera"],
      ["emergency", "emergency rainy cushion buffer safety"],
      ["gift", "gift gifts birthday christmas wedding present anniversary"],
      ["home", "home apartment deposit furniture house moving"],
      ["car", "car motorbike motorcycle"],
    ] as const
  ).flatMap(([kind, list]) => list.split(" ").map((w) => [w, kind] as const)),
);

export function findGoalKind(label: string): GoalKind | null {
  for (const w of words(label)) {
    const kind = GOAL_WORDS[w];
    if (kind) return kind;
  }
  return null;
}

export function goalKindOf(label: string): GoalKind {
  return findGoalKind(label) ?? "other";
}

export type Pocket = "spending" | `goal:${GoalKind}`;

export const goalPocket = (goal: GoalKind): Pocket => `goal:${goal}`;

export function isPocket(value: string): value is Pocket {
  if (value === "spending") return true;
  const kind = value.startsWith("goal:") ? value.slice(5) : "";
  return (GOAL_KINDS as readonly string[]).includes(kind);
}
