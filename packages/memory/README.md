# @mira/memory

Walrus Memory on mainnet ([ADR-0001](../../docs/adr/0001-track-3-from-mira-with-a-memory-and-tatum-kit.md)).
The server is its only caller.

- `NAMESPACE`: Mira's four namespaces per user code, `mira:prefs:<user>`, `mira:rules:<user>`,
  `mira:nudges:<user>` and `mira:habits:<user>` ([PRD §8.1](../../docs/prd.md#8-walrus-memory),
  [ADR-0007](../../docs/adr/0007-shared-memory-account-and-tatum-key.md)). Namespace strings are built here,
  never in a route.
- `scope(operator, namespace)` and `createClient(scope)`: a `MemWal` client. The server writes with
  `rememberBulk` (up to 20 a call) and an idempotency key per batch, and recalls each namespace whole.
- `limiterFor(key)` / `runLimited`: one rate limiter per delegate key (the relayer allows about 60
  weighted requests a minute), retrying 429s and transient errors.
- `readOperatorEnv()` and `operatorEnvSchema`: `MEMWAL_ACCOUNT_ID`, `MEMWAL_PRIVATE_KEY`,
  `MEMWAL_SERVER_URL`, `MEMWAL_PACKAGE_ID`, `MEMWAL_REGISTRY_ID`. A blank value counts as unset
  (`withoutBlanks`).
- `readAccount`, `isDelegateRegistered`, `findAccountIdForOwner`: the account and its delegate keys,
  read over gRPC.
- `createAccountTx`, `addDelegateKeyTx`, `executeAccountTx`: account set-up, sponsored by the relayer
  when it will, paid by the keypair when it won't.
- `signInMessage`, `addressFromSignature`: wallet sign-in. An address only ever comes from a signature.
- `redactCredentials`: strips keys and tokens before anything is written. The relayer sees plaintext.
- `formatUntrustedMemories`: recalled lines go to a model as untrusted data behind a nonce. Mira has no
  model; it parses lines into typed facts instead (`parseLine` in `@mira/money`).

The relayer's behaviour, as measured, is in [docs/tech-reference.md §1.11](../../docs/tech-reference.md).
`registry.test.ts` reads the real account when `.env` has one, and skips itself otherwise.
