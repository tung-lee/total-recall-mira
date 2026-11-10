import { loadEnv, type OperatorEnv, operatorEnvSchema, withoutBlanks } from "@mira/memory";
import { z } from "zod";

const serverEnvSchema = z.object({
  PORT: z.coerce.number().int().positive().default(8787),
  /** Derives every pocket's key (ADR-0004). Never changes once users exist. */
  MIRA_WALLET_SECRET: z.string().min(32).optional(),
  /** The testnet key that sponsors gas and seeds test cash. */
  SUI_OPERATOR_KEY: z.string().regex(/^suiprivkey1[0-9a-z]+$/, "expected a suiprivkey1… key").optional(),
  TATUM_API_KEY_TESTNET: z.string().optional(),
  MIRA_SEED_CENTS: z.coerce.number().int().positive().default(10_000),
  MIRA_SEEDS_PER_HOUR: z.coerce.number().int().positive().default(30),
  /** "1" forces preview mode for memory and pockets, whatever keys are set (tests, ADR-0006). */
  MIRA_PREVIEW: z.literal("1").optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema> & {
  memory: OperatorEnv | null;
  cash: { walletSecret: string; operatorKey: string } | null;
};

export function readServerEnv(source: Record<string, string | undefined> = process.env): ServerEnv {
  loadEnv();
  const values = withoutBlanks(source);
  const parsed = serverEnvSchema.safeParse(values);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Server env is invalid: ${issues}`);
  }
  const env = parsed.data;
  const preview = env.MIRA_PREVIEW === "1";
  const memory = !preview && values.MEMWAL_ACCOUNT_ID && values.MEMWAL_PRIVATE_KEY ? operatorEnvSchema.parse(values) : null;
  const cash =
    !preview && env.MIRA_WALLET_SECRET && env.SUI_OPERATOR_KEY && env.TATUM_API_KEY_TESTNET
      ? { walletSecret: env.MIRA_WALLET_SECRET, operatorKey: env.SUI_OPERATOR_KEY }
      : null;
  return { ...env, memory, cash };
}
