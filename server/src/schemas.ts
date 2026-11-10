import { CATEGORIES, type Fact, GOAL_KINDS, isPocket, type Pocket, WEEKDAYS } from "@mira/money";
import { z } from "zod";

/** A user's Mira code: a random 128-bit id, lowercase base32 or hex (PRD §6.6). */
export const userSchema = z.string().regex(/^[a-z0-9]{16,40}$/, "not a Mira code");

const asOf = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
const cents = z.number().int().positive().max(10_000_000);
const category = z.enum(CATEGORIES);
const yearMonth = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);

export const factSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("budget"), cents, asOf }),
  z.object({ kind: z.literal("cap"), category, cents, period: z.enum(["week", "month"]), asOf }),
  z.object({ kind: z.literal("goal"), goal: z.enum(GOAL_KINDS), cents, by: yearMonth.nullable(), asOf }),
  z.object({ kind: z.literal("month"), month: yearMonth, cents, asOf }),
  z.object({ kind: z.literal("rule"), keyword: z.string().regex(/^[a-z]{2,20}$/), category, asOf }),
  z.object({ kind: z.literal("nudge"), category, cents, outcome: z.enum(["skipped", "bought"]), asOf }),
  z.object({ kind: z.literal("habit"), category, cents, days: z.array(z.enum(WEEKDAYS)).max(7), asOf }),
]) satisfies z.ZodType<Fact>;

export const writeBody = z.object({ user: userSchema, facts: z.array(factSchema).min(1).max(20) });

export const userQuery = z.object({ user: userSchema });

export const jobsQuery = z.object({
  user: userSchema,
  keys: z
    .string()
    .transform((s) => s.split(",").filter(Boolean))
    .pipe(z.array(z.string().regex(/^[0-9a-f]{32}$/)).min(1).max(50)),
});

const pocket = z.string().refine((s): s is Pocket => isPocket(s), "not a pocket");

export const cashQuery = z.object({
  user: userSchema,
  pockets: z
    .string()
    .transform((s) => s.split(",").filter(Boolean))
    .pipe(z.array(pocket).min(1).max(8)),
});

export const openBody = z.object({ user: userSchema });

export const moveBody = z
  .object({ user: userSchema, from: pocket, to: pocket, cents: z.number().int().positive().max(1_000_000) })
  .refine((b) => b.from !== b.to, "from and to are the same pocket");
