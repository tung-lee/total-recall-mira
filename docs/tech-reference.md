# Tech reference: Walrus Memory, Tatum and Sui

> §1 is Walrus Memory, with the field notes measured on mainnet in §1.11. §2 is Tatum. §3 is the Sui
> pieces Mira uses for its pockets ([ADR-0004](adr/0004-mira-cash-pockets-on-sui-testnet.md)).

A builder's cheat sheet for Total Recall, taken from the official docs on 2026-10-18. Walrus Memory is in
beta and changes often, so check the linked pages before you rely on a detail.

---

## 1. Walrus Memory (MemWal)

### 1.1 What it is

A memory layer for AI agents that keeps context across sessions, apps and tools. Memories are:

- **embedded** for semantic search (by the relayer),
- **encrypted with Seal**,
- **stored as blobs on Walrus**,
- **owned onchain**: Sui smart contracts enforce ownership and delegate access.

Core operations:

| Operation  | What it does                                                                                      |
| ---------- | ------------------------------------------------------------------------------------------------- |
| `remember` | Store one memory (embedding, Seal encryption, Walrus upload and indexing run as a background job) |
| `recall`   | Semantic search scoped to `owner + namespace`; returns decrypted text                             |
| `analyze`  | An LLM extracts facts from long text; each fact is stored as its own memory                       |
| `ask`      | Answer a query from recalled context plus LLM reasoning (listed in the Python SDK)                |
| `restore`  | Rebuild a lost index from Walrus by owner + namespace, re-embedding only missing entries          |

### 1.2 Key concepts

- **Memory space** = `owner address + namespace + app (package) ID`. It is the isolation boundary.
- **Owner:** a Sui address. It is the root authority over the account.
- **Delegate key:** an Ed25519 keypair the owner authorizes. Delegate keys are **registered onchain and
  verified on every request**, and the owner can add or remove them. This is how an app or agent writes to a
  _user's_ memory without owning it.
- **Namespace:** a label you choose, such as `rules`, `picks` or `group:123`. It defaults to `"default"`.
  Use one per product surface.
- **Account ID:** the `MemWalAccount` object ID on Sui.

### 1.3 Endpoints

| Network                                  | Relayer URL                                 |
| ---------------------------------------- | ------------------------------------------- |
| **Mainnet (required for the hackathon)** | `https://relayer.memory.walrus.xyz`         |
| Testnet (staging)                        | `https://relayer-staging.memory.walrus.xyz` |

The managed relayer is a public good run by the Walrus Foundation: the server wallet pays Walrus storage
fees, there is no SLA, usage limits may apply, and **the relayer sees plaintext** during embedding and
encryption. For client-side encryption, use `MemWalManual`.

> Some docs pages (for example "Agent Storage Loop") use the **staging** relayer in their samples. The
> hackathon requires **Mainnet**, so don't copy those URLs as-is.

### 1.4 Install and configure (TypeScript)

```bash
pnpm add @mysten-incubation/memwal
# optional peers: ai (AI SDK middleware), @mysten/sui @mysten/seal @mysten/walrus (manual client)
```

```ts
import { MemWal } from "@mysten-incubation/memwal";

const memwal = MemWal.create({
  key: process.env.MEMWAL_KEY!, // delegate private key (hex, 0x-hex, suiprivkey1..., or Uint8Array)
  accountId: process.env.MEMWAL_ACCOUNT_ID!, // MemWalAccount object ID on Sui
  serverUrl: "https://relayer.memory.walrus.xyz",
  namespace: "my-app", // default "default"
  // requestTimeoutMs: 30000, recallTimeoutMs: 15000, preflightTimeoutMs: 5000
});

await memwal.health(); // reachability only; does NOT validate key/accountId
```

Python: `pip install memwal` (extras: `[langchain]`, `[openai]`, `[all]`). The `MemWal.create(key=..., account_id=..., server_url=..., namespace=...)` call mirrors the TS client.

### 1.5 API surface (TS `MemWal`)

| Method                                                                                    | Returns / notes                                                                                   |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `remember(text, namespace?)`                                                              | `{ job_id, status }`. Async background job                                                        |
| `rememberAndWait(text, namespace?, opts?)`                                                | `{ id, job_id, blob_id, owner, namespace }`                                                       |
| `getRememberStatus(jobId)`                                                                | `pending \| running \| uploaded \| done \| failed \| not_found`                                   |
| `waitForRememberJob(jobId)`                                                               | Polls until `done` or `failed`                                                                    |
| `rememberBulk(items)` / `rememberBulkAndWait(items)`                                      | **Up to 20 items per call** (Walrus Quilt shares Sui txs). Chunk larger sets                      |
| `recall({ query, limit?, namespace?, maxDistance?, sort?, scoringWeights?, timeoutMs? })` | `{ results: [{ blob_id, text, distance, created_at? }], total }`. `limit` defaults to 10, max 100 |
| `analyze(text, namespace?)` / `analyzeAndWait(...)`                                       | `{ job_ids, facts: [{ text, id, job_id }], fact_count, ... }`                                     |
| `restore(namespace, limit?)`                                                              | `{ restored, skipped, failed, total, namespace, owner }`                                          |
| `listNamespaces({ cursor?, limit? })`                                                     | Namespace metadata (`memory_count`, `storage_used`, ...)                                          |
| `listMemories({ cursor?, limit?, namespace? })`                                           | Metadata only, no decrypt (`blob_id`, `created_at`, `importance`, `agent_id`, ...)                |
| `health()`, `compatibility()`, `getPublicKeyHex()`                                        | Diagnostics                                                                                       |
| `embed(text)`, `rememberManual(...)`, `recallManual(...)`                                 | Low-level, bring your own vectors or encryption                                                   |

Account management (`@mysten-incubation/memwal/account`): `generateDelegateKey()`, `createAccount()`,
`addDelegateKey()`, `removeDelegateKey()` (owner only; needs `registryId`).

Deletion guides: [delete memories programmatically](https://github.com/MystenLabs/MemWal/blob/dev/docs/guides/delete-memories-programmatically.md).

### 1.6 Recall gotchas (these matter for "learning" apps)

- **`distance` is cosine distance: lower means more similar.** The MCP tool shows `score = 1 - distance`, the
  opposite polarity, so don't mix them.
- **The default ranking is relevance only, with no recency guarantee.** To get the _latest_ state (a current
  trust score, the newest rule), use `sort: "recent"`. Sorting client-side does **not** work, because the
  newest record may never make it into the result set.
- `sort: "recent"` over-fetches (`limit * 5`, capped at 50) and then orders by `created_at`.
- `scoringWeights: { semantic, recency, recencyHalfLifeDays, importance }` only **re-ranks** the returned
  candidates. It does not widen the search, and it's ignored when `sort` is set.
- `created_at` is the **write time**, not a date mentioned in the text.
- `maxDistance` filters client-side, after selection.

### 1.7 Design rule of thumb

Walrus Memory is **semantic memory, not a database**. Use it for what the product _learned_ (rules,
preferences, trust snapshots, insights) and for durable _proofs_. Keep counters, joins and balances in a
normal DB, and write the conclusions back to memory. Format memories as short, self-describing sentences or
`KEY: value` lines so semantic recall finds them.

### 1.8 AI SDK middleware

```ts
import { withMemWal } from "@mysten-incubation/memwal/ai";

const model = withMemWal(baseModel, {
  key,
  accountId,
  serverUrl,
  namespace: "chat",
  maxMemories: 5, // memories injected per request
  autoSave: true, // analyze() the user message after generation
  minRelevance: 0.3, // 0..1 similarity threshold
});
```

Before generation it recalls on the last user message and injects matches as a system message. After
generation it optionally runs `analyze()` and saves facts in the background. Use direct SDK calls when you
need precise control. Mira does: every line is a typed fact built by the server ([PRD §8](prd.md#8-walrus-memory)).

### 1.9 Portable memory in AI tools (MCP)

Claude Code:

```
/plugin marketplace add MystenLabs/MemWal
/plugin install memwal@memwal-plugins
```

Tools: `memwal_login`, `memwal_remember`, `memwal_recall`. Codex, Cursor, Claude Desktop, Antigravity and
OpenCode are also documented under `docs.wal.app/walrus-memory/mcp/`. The same account gives the same
memories in every tool, which makes a strong "portable memory" demo.

### 1.10 Docs map

- Overview: https://docs.wal.app/walrus-memory
- Quick start: https://docs.wal.app/walrus-memory/getting-started/quick-start
- TS SDK: https://docs.wal.app/walrus-memory/sdk/overview
- Full API reference (source): https://github.com/MystenLabs/MemWal/blob/dev/docs/sdk/api-reference.md
- Multi-tenant apps: https://docs.wal.app/walrus-memory/sdk/cookbook-multi-tenant
- Agent storage loop: https://docs.wal.app/walrus-memory/sdk/agent-storage-loop
- Ownership and delegates: https://docs.wal.app/walrus-memory/fundamentals/concepts/ownership-and-access
- Example apps (Chatbot, Noter, Researcher): https://github.com/MystenLabs/MemWal/tree/dev/apps
- Single-file agent guide: https://github.com/MystenLabs/MemWal/blob/dev/SKILL.md

### 1.11 Field notes (measured on mainnet)

Measured by the team on SDK 0.1.8, Sep–Oct 2026. This repo pins 0.1.12, which adds `rememberBulk`,
`idempotencyKey` and `sort: "recent"`, so re-check a row before you lean on it.

| Topic            | What was measured                                                                                                                                                      | What to do                                                                                                                                                 |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Package ID       | The docs name an old package. The relayer runs an upgrade, and **two deployments are live on mainnet**. `GET /config` gives the current `packageId` but no registry ID | Read the package from `/config`, pin a matching registry, and gate deploys on `diagnose`                                                                   |
| Writes           | About **24 s** per write. Jobs can die (`seal encrypt failed … Too Many Requests`)                                                                                     | Never block a reply or payment on a write. Resubmit failed jobs up to 3 times. Record the index row at accept time                                         |
| Recall           | Sometimes returns `results: []` with `dropped_count > 0` (it found matches, then dropped them)                                                                         | Retry 4 times with backoff before believing an empty result                                                                                                |
| Recall form      | Only the **object form** `recall({ query, limit, namespace, maxDistance })` worked; the positional form dropped matches                                                | Object form only                                                                                                                                           |
| Distances        | Question-shaped queries put true positives at **0.449–0.777**                                                                                                          | `maxDistance` 0.8 for questions, dedupe at < 0.25 (except corrections)                                                                                     |
| Corrections      | They get lost to dedupe, to the model forgetting to write, and to being outranked                                                                                      | Dedupe a correction only against earlier corrections; run a second recall on the `[correction]` tag; order by `created_at`, newest first                   |
| Rate limits      | **60 weighted requests/min per delegate key** on writes, 200/min on the read API                                                                                       | A per-key limiter (`limiterFor`). Every user's lines share the operator's one key, so batch with `rememberBulk`                                                 |
| Delegates        | **At most 20 delegate keys per account.** Removal bumps the Seal rotation counter. Revocation takes effect after about **32 s**                                        | One key is enough for the MVP. User-owned memory (P2) adds one per user                                                                                    |
| Sponsorship      | The relayer's `/sponsor` accepts **exactly one** of `create_account` / `add_delegate_key` / `remove_delegate_key` per tx. The user needs no SUI                        | Account set-up goes through relayer sponsorship (`executeAccountTx`), and falls back to paying when it's refused                                           |
| Deletion         | **There's no way to delete a current memory.** `POST /api/forget` removes index rows for a whole namespace. The Security Delete API only cleans up legacy V1 blobs     | Never write anything private. A retraction is a new line, not a deletion                                                                                   |
| Expiry           | New memories live about **210 days** (read API `expires_at`)                                                                                                           | Fine for the hackathon window                                                                                                                              |
| `restore()`      | Reported `total: 0` for namespaces that had memories                                                                                                                   | Don't rely on it. The device keeps every line it sent, with its blob id                                                                                    |
| Read API         | `GET /v1/owners/:owner/memories` returns metadata only (no text); `/agents` lists delegates (flaky)                                                                    | Read text through recall                                                                                                                                   |
| Owner decrypt    | Mainnet memories use the committee Seal server, which needs an **Enoki Seal API key** for direct decryption                                                            | Not needed: the server reads through its delegate key                                                                                                      |
| zkLogin          | A zkLogin address depends on the OAuth client ID, so the same Google account gets a different address than on memory.walrus.xyz                                        | Use a **Slush wallet** for any demo that opens memory.walrus.xyz                                                                                           |
| `withMemWal`     | `autoSave` analyzes every message, which produces low-quality duplicate facts                                                                                          | Not used. Writes stay explicit                                                                                                                             |
| `sort` on 0.1.12 | The types now have `sort: "recent"`, which over-fetches `limit × 5` (at most 50) and orders by write time                                                         | Mira recalls each namespace whole (limit 50) and keeps the newest line per key by its own `as_of` (`learn`) |
| Vietnamese       | Byte-identical round trip; cross-language recall 8/8                                                                                                                   | Fine for EN/VI users                                                                                                                                       |

---

## 2. Tatum

### 2.1 Auth

Get an API key from https://dashboard.tatum.io/ and send it as the **`x-api-key`** header, both for HTTP
and as gRPC metadata. Mira uses the key only for gRPC (no JSON-RPC, [ADR-0001](adr/0001-track-3-from-mira-with-a-memory-and-tatum-kit.md)).

### 2.2 Sui RPC gateway: **gRPC only** ([ADR-0001](adr/0001-track-3-from-mira-with-a-memory-and-tatum-kit.md))

| Network     | gRPC (native, `x-api-key` metadata)         | JSON-RPC                   |
| ----------- | ------------------------------------------- | -------------------------- |
| **Mainnet** | `https://sui-mainnet-grpc.gateway.tatum.io` | not used (deprecated)      |
| Testnet     | `https://sui-testnet-grpc.gateway.tatum.io` | not offered by Tatum (404) |

- **Sui deprecated JSON-RPC.** Public fullnodes reject it ("JSON-RPC on public fullnodes has been
  deprecated"), so **Mira uses gRPC everywhere**
  ([Tatum migration guide](https://docs.tatum.io/docs/sui-migration-guide-from-json-rpc-to-grpc)).
- **Tatum speaks native gRPC** (`application/grpc`). `@mysten/sui`'s `SuiGrpcClient` defaults to
  gRPC-web and fails with "unexpected response content type: application/grpc".
  - **Server side (verified):** `new SuiGrpcClient({ network, transport })` with a
    `GrpcTransport` from `@protobuf-ts/grpc-transport` + `@grpc/grpc-js`:
    `host: "sui-<net>-grpc.gateway.tatum.io:443"`, `ChannelCredentials.createSsl()`,
    `meta: { "x-api-key": key }`. It lives in `@mira/chain` (`createTatumSuiClient`).
  - **Browser:** gRPC-web against a public fullnode (`https://fullnode.<network>.sui.io:443`), or go
    through our API.
- Build transactions client-side with the Sui SDK. Tatum doesn't support `unsafe_*` helpers.

gRPC v2 services we use:

| Need                                                | Service / method                                                                                                     |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Simulate (dry-run)                                  | `TransactionExecutionService.SimulateTransaction`                                                                    |
| Execute / settle                                    | `TransactionExecutionService.ExecuteTransaction`                                                                     |
| Transaction + events by digest                      | `LedgerService.GetTransaction` / `BatchGetTransactions`                                                              |
| Objects (Predict markets, UpgradeCap)               | `LedgerService.GetObject` / `BatchGetObjects`                                                                        |
| Checkpoints, chain info                             | `LedgerService.GetCheckpoint` / `GetServiceInfo`                                                                     |
| Balances (coins + address balance)                  | `StateService.GetBalance` / `ListBalances`: `Balance` has `balance`, `address_balance` and `coin_balance` separately |
| Owned objects, coin info, dynamic fields            | `StateService.ListOwnedObjects` / `GetCoinInfo` / `ListDynamicFields`                                                |
| Live chain events (opt-in fills on the demo screen) | `SubscriptionService.SubscribeCheckpoints`                                                                           |
| Move introspection                                  | `MovePackageService.GetPackage` / `GetFunction` / `GetDatatype`                                                      |
| SuiNS                                               | `NameService.LookupName` / `ReverseLookupName`                                                                       |

**There's no gRPC equivalent** of "query events by type" or "transactions by address". Mira doesn't need
one: it knows its own digests, so it reads them with `GetTransaction`.

**Verified on Tatum testnet:** `SubscribeCheckpoints` streams through Tatum with a `TransactionFilter`
of `emitModule: "<pkg>::<module>"`.
- Frames without a match only advance `cursor`, about every 25 checkpoints.
- The stream starts at the tip; there's no start position. Backfill short gaps with
  `LedgerService.GetCheckpoint`.
- Streams can get HTTP 429 too, so reconnect with backoff.
- **A stream costs credits per frame:** even a filtered one sends about 720 frames an hour. Keep it off
  unless a screen needs it. Mira doesn't open one.

### 2.3 Data API (`/v4/data/...`)

| API                     | Paths                                                                                                                                                                                                                  |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Prices & exchange rates | `/v4/data/rate/symbol`, `/v4/data/rate/symbol/batch`, `/v4/data/rate/contract`, `/v4/data/rate/symbol/OHLCV`, `/v4/data/rate/price-change`, `/v4/data/rate/history` (price at any block or timestamp; 50 credits/call) |
| Wallet                  | `/v4/data/wallet/portfolio`, `/v4/data/wallet/balance/time`, `/v4/data/wallet/reputation`                                                                                                                              |
| Tokens                  | `/v4/data/tokens`, `/v4/data/owners`, `/v4/data/tokens/trending`, `/v4/data/tokens/popular`                                                                                                                            |
| Transactions            | `/v4/data/transaction/history`, `/v4/data/transactions/hash`                                                                                                                                                           |

Exchange rates cover crypto↔fiat and fiat↔fiat across 165+ fiat currencies. **Check chain support per
endpoint.** Many Data API endpoints are EVM/UTXO-first, so for Sui-native data use the Sui RPC.

### 2.4 Notifications (webhooks)

`/v4/subscription`, `/v4/subscription/webhook`, ... Call `GET /v4/subscription/chains` (free) to see whether
Sui alerts are supported before designing around them. The fallback is the gRPC checkpoint stream.

### 2.5 Tatum AI Builder

[ai.tatum.io](https://ai.tatum.io) generates a working blockchain app from one prompt. Showcase apps run on
`*.tatum.app`, and one of them (AgentPact) already uses Walrus. Related tools: **Blockchain MCP** (68 chains,
13 tools, read-only by default) and **Tatum Skills** (codegen guidance). The **Best Tatum AI Builder App**
prize requires the product to be built _primarily_ with it.

### 2.6 Docs map

- Docs index (LLM-friendly): https://docs.tatum.io/llms.txt
- Sui RPC: https://docs.tatum.io/reference/rpc-sui
- Sui gRPC: https://docs.tatum.io/reference/sui-grpc
- Exchange rates: https://docs.tatum.io/docs/exchange-rates
- Notifications: https://docs.tatum.io/docs/notifications

---

## 3. Sui pieces Mira uses ([ADR-0004](adr/0004-mira-cash-pockets-on-sui-testnet.md))

Measured on Sui testnet on 2026-11-03, through `@mira/chain`.

### 3.1 Pockets

- **Derived keys:** a pocket's Ed25519 secret is `HMAC-SHA256(MIRA_WALLET_SECRET, "<user code>:<pocket>")`.
  The server stores no keys; the same code always gives the same addresses.
- **Units:** $1 is 1,000,000 MIST (0.001 testnet SUI). `GetBalance` gives the total, so one call per pocket.

### 3.2 Sponsored moves

- The sender is the user's pocket and the **gas owner is the operator** (`tx.setGasOwner`). The SDK picks
  gas coins from the gas owner when it builds, so a $41 move moves exactly $41.
- The amount comes from the sender's coins with `coinWithBalance({ balance, useGasCoin: false })`. With the
  default `useGasCoin`, a sponsored transaction would split the operator's gas coin instead.
- Both sign the same bytes; `ExecuteTransaction` takes `[user, sponsor]` signatures, then
  `waitForTransaction` before reading balances.
- One move: 1 `ListOwnedObjects`, 1 `SimulateTransaction`, 1 `ExecuteTransaction`, about 2 `GetTransaction`
  and the balance reads; about 2–3 s end to end. Moves run one at a time so the operator's gas coins
  never race.

### 3.3 Test SUI

- `requestSuiFromFaucetV2` answers "CI compatibility is disabled". `requestSuiFromFaucetV3` (it solves a
  small proof of work) gives 1 SUI. `npm run cash:faucet` uses it to top up the operator.
