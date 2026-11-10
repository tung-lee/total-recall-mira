import type { Category, CategorySource } from "./categories.ts";
import type { Period } from "./facts.ts";
import type { Cents } from "./money.ts";

/** One spend, as the device keeps it. Never written to memory (ADR-0003). */
export interface Spend {
  id: string;
  at: string;
  cents: Cents;
  totalCents: Cents;
  split: number;
  label: string;
  category: Category;
  keyword: string | null;
  source: CategorySource | "corrected";
}

export interface MonthSnapshot {
  month: string;
  cents: Cents;
  asOf: string;
}

export function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/** Monday 00:00, local time. */
export function startOfWeek(d: Date): Date {
  const day = (d.getDay() + 6) % 7;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - day);
}

export function periodStart(period: Period, now: Date): Date {
  return period === "week" ? startOfWeek(now) : startOfMonth(now);
}

export function sumSpends(
  spends: readonly Spend[],
  from: Date,
  to: Date,
  category?: Category,
): Cents {
  const a = from.getTime();
  const b = to.getTime();
  return spends
    .filter((s) => {
      const t = Date.parse(s.at);
      return t >= a && t <= b && (category === undefined || s.category === category);
    })
    .reduce((sum, s) => sum + s.cents, 0);
}

/**
 * Spent this month. On a device that saw the month's early spends, its own ledger is exact. On a new
 * device, the month's rounded snapshot from memory stands in for what the device never saw.
 */
export function monthSpent(spends: readonly Spend[], now: Date, snapshot: MonthSnapshot | null): Cents {
  const from = startOfMonth(now);
  const device = sumSpends(spends, from, now);
  if (!snapshot || snapshot.month !== monthKey(now)) return device;
  // A snapshot's as_of has whole seconds; a spend in that same second is one it already counted.
  const covered = Date.parse(snapshot.asOf) + 999;
  const sawEarlier = spends.some((s) => {
    const t = Date.parse(s.at);
    return t >= from.getTime() && t <= covered;
  });
  if (sawEarlier) return device;
  return snapshot.cents + sumSpends(spends, new Date(covered + 1), now);
}

export interface CapStatus {
  category: Category;
  period: Period;
  cap: Cents;
  spent: Cents;
  left: Cents;
}

export function capStatus(
  spends: readonly Spend[],
  category: Category,
  cap: { cents: Cents; period: Period },
  now: Date,
): CapStatus {
  const spent = sumSpends(spends, periodStart(cap.period, now), now, category);
  return { category, period: cap.period, cap: cap.cents, spent, left: cap.cents - spent };
}

export function byCategory(spends: readonly Spend[], from: Date, to: Date): Array<[Category, Cents]> {
  const totals = new Map<Category, Cents>();
  for (const s of spends) {
    const t = Date.parse(s.at);
    if (t < from.getTime() || t > to.getTime()) continue;
    totals.set(s.category, (totals.get(s.category) ?? 0) + s.cents);
  }
  return [...totals].sort((a, b) => b[1] - a[1]);
}
