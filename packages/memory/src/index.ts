/**
 * @mira/memory: Walrus Memory on mainnet (ADR-0001). The namespaces, a
 * client per namespace, the relayer's rate limit, account and delegate reads over gRPC, sponsored
 * account transactions, wallet sign-in, and the redaction that runs before anything is written.
 */
export { createClient, type MemoryScope, NAMESPACE, scope } from "./client.ts";
export { type GeneratedDelegate, generateDelegate } from "./delegate.ts";
export {
  loadEnv,
  type OperatorEnv,
  operatorEnvSchema,
  parseEnvText,
  readOperatorEnv,
  withoutBlanks,
} from "./env.ts";
export { type LimiterOptions, limiterFor, RateLimiter, runLimited } from "./limiter.ts";
export { explorer } from "./links.ts";
export { redactCredentials } from "./redact.ts";
export {
  createSuiClient,
  fetchRelayerConfig,
  findAccountIdForOwner,
  isDelegateRegistered,
  type OnChainAccount,
  type OnChainDelegate,
  type RelayerConfig,
  readAccount,
} from "./registry.ts";
export { type MemoryMeta, RelayerExtras, type StatsResult } from "./relayer.ts";
export {
  addDelegateKeyTx,
  createAccountTx,
  type ExecutionResult,
  executeAccountTx,
  removeDelegateKeyTx,
  type SponsorContext,
  sponsorAndExecute,
} from "./sponsor.ts";
export { formatUntrustedMemories, UNTRUSTED_MEMORY_SYSTEM_INSTRUCTION } from "./untrusted.ts";
export { addressFromSignature, signInMessage, signWithThrowawayWallet } from "./wallet.ts";
