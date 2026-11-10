import type { Category } from "./categories.ts";
import { type Fact, stamp, WEEKDAYS, type Weekday } from "./facts.ts";
import type { Learned } from "./learn.ts";
import type { Spend } from "./ledger.ts";
import { roundAbout } from "./money.ts";

const DAY_MS = 86_400_000;

/**
 * A category's habit over the last four weeks: the weekly spend and the days that carry at least a third
 * of it. Needs three spends across at least a week, so one big night out isn't a habit.
 */
export function deriveHabit(spends: readonly Spend[], category: Category, now: Date): Extract<Fact, { kind: "habit" }> | null {
  const since = now.getTime() - 28 * DAY_MS;
  const recent = spends.filter((s) => s.category === category && Date.parse(s.at) >= since && Date.parse(s.at) <= now.getTime());
  if (recent.length < 3) return null;
  const first = Math.min(...recent.map((s) => Date.parse(s.at)));
  if (now.getTime() - first < 7 * DAY_MS) return null;
  const total = recent.reduce((sum, s) => sum + s.cents, 0);
  const perDay = new Map<Weekday, number>();
  for (const s of recent) {
    const day = WEEKDAYS[(new Date(s.at).getDay() + 6) % 7];
    if (day) perDay.set(day, (perDay.get(day) ?? 0) + s.cents);
  }
  const days = [...perDay]
    .filter(([, cents]) => cents / total >= 1 / 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([day]) => day)
    .sort((a, b) => WEEKDAYS.indexOf(a) - WEEKDAYS.indexOf(b));
  return { kind: "habit", category, cents: Math.round(total / 4), days, asOf: stamp(now) };
}

/** Whether a derived habit says something memory doesn't already hold. */
export function habitChanged(learned: Learned, habit: Extract<Fact, { kind: "habit" }>): boolean {
  const known = learned.habits[habit.category];
  if (!known) return true;
  return roundAbout(known.cents) !== roundAbout(habit.cents) || known.days.join(" ") !== habit.days.join(" ");
}
