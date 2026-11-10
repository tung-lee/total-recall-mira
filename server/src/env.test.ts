import { readFileSync } from "node:fs";
import { parseEnvText } from "@mira/memory";
import { describe, expect, it } from "vitest";
import { readServerEnv } from "./env.ts";

const example = parseEnvText(readFileSync(new URL("../../.env.example", import.meta.url), "utf8"));

describe("readServerEnv", () => {
  it("starts in preview mode from a freshly copied .env.example", () => {
    const env = readServerEnv(example);
    expect(env.PORT).toBe(8787);
    expect(env.memory).toBeNull();
    expect(env.cash).toBeNull();
  });

  it("turns pockets on only with the Tatum key, the operator key and the wallet secret", () => {
    const keys = {
      ...example,
      TATUM_API_KEY_TESTNET: "t-key",
      SUI_OPERATOR_KEY: "suiprivkey1qfake",
      MIRA_WALLET_SECRET: "x".repeat(32),
    };
    expect(readServerEnv(keys).cash).not.toBeNull();
    expect(readServerEnv({ ...keys, MIRA_PREVIEW: "1" }).cash).toBeNull();
    expect(readServerEnv({ ...keys, TATUM_API_KEY_TESTNET: "" }).cash).toBeNull();
  });

  it("refuses a short wallet secret", () => {
    expect(() => readServerEnv({ ...example, MIRA_WALLET_SECRET: "short" })).toThrow(/MIRA_WALLET_SECRET/);
  });
});
