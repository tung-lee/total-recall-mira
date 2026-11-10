import { MemWal } from "@mysten-incubation/memwal";

/**
 * Mira's namespaces, one set per user code (PRD §8.1, ADR-0003). Each holds one kind of typed line built by
 * `factLine` in `@mira/money`; namespace strings are built here and nowhere else. The `mira:` prefix keeps
 * them apart from another app's on the shared account (ADR-0007).
 */
export const NAMESPACE = {
  /** BUDGET, CAP, GOAL and MONTH lines: what the user set, rounded. */
  prefs: (user: string) => `mira:prefs:${user}`,
  /** RULE lines: a keyword's category, from the user's corrections. */
  rules: (user: string) => `mira:rules:${user}`,
  /** NUDGE lines: how each "should I buy" answer went. The thresholds are derived from them. */
  nudges: (user: string) => `mira:nudges:${user}`,
  /** HABIT lines: a category's weekly spend and peak days, rounded. */
  habits: (user: string) => `mira:habits:${user}`,
} as const;

/** Everything needed to talk to one (account, namespace) through the relayer. */
export interface MemoryScope {
  key: string;
  accountId: string;
  namespace: string;
  serverUrl: string;
}

export function scope(
  operator: { key: string; accountId: string; serverUrl: string },
  namespace: string,
): MemoryScope {
  return { ...operator, namespace };
}

export function createClient(s: MemoryScope): MemWal {
  return MemWal.create({
    key: s.key,
    accountId: s.accountId,
    serverUrl: s.serverUrl,
    namespace: s.namespace,
  });
}
