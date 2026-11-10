/**
 * @mira/money: Mira's money logic, pure (ADR-0003). Parsing, categories, ledger math, the "should I buy"
 * verdict, the facts that may reach Walrus Memory with their lines, and what Mira learns from them.
 */
export { type Advice, adviseBuy, type Reason, type Verdict } from "./advise.ts";
export {
  CATEGORIES,
  CATEGORY_EMOJI,
  CATEGORY_LABEL,
  type Categorized,
  type Category,
  type CategorySource,
  categorize,
  categoryFromText,
  isKeyword,
  KEYWORDS,
  keywordOf,
  WANTS,
  words,
} from "./categories.ts";
export {
  type Fact,
  type FactKind,
  factKey,
  factLine,
  MEMORY_KINDS,
  type MemoryKind,
  memoryKind,
  type NudgeOutcome,
  parseLine,
  type Period,
  roundFact,
  stamp,
  WEEKDAYS,
  type Weekday,
  writable,
} from "./facts.ts";
export {
  findGoalKind,
  GOAL_EMOJI,
  GOAL_KINDS,
  GOAL_LABEL,
  type GoalKind,
  goalKindOf,
  goalPocket,
  isPocket,
  type Pocket,
} from "./goals.ts";
export { deriveHabit, habitChanged } from "./habits.ts";
export { DEFAULT_THRESHOLD, emptyLearned, type Learned, learn, type Threshold, thresholdFor } from "./learn.ts";
export {
  byCategory,
  type CapStatus,
  capStatus,
  type MonthSnapshot,
  monthKey,
  monthSpent,
  periodStart,
  type Spend,
  startOfMonth,
  startOfWeek,
  sumSpends,
} from "./ledger.ts";
export { aboutUsd, type Cents, ceilDollars, floorDollars, roundAbout, toCents, usd } from "./money.ts";
export { type Intent, parseMessage } from "./parse.ts";
