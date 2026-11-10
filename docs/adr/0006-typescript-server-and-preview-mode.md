# ADR-0006: The server is TypeScript run by Node; preview mode without keys

- **Status:** Accepted
- **Date:** 2026-11-03
- **Deciders:** Hien

## Context

- The server was plain JavaScript (`server/index.mjs`) with hand-rolled parsing. The code rules ask for
  strict TypeScript and zod at every route.
- The workspace packages are TypeScript that Node ≥ 22.18 runs without a build step.
- The submitter's Tatum and Walrus Memory keys don't exist yet, tests must never write to mainnet, and the
  app has to run on a laptop without accounts.

## Decision

- **`server/` is a workspace (`@mira/server`)** written in TypeScript and run as it is:
  `node server/src/index.ts`. `engines` is `node >= 22.18`. Railway starts the same command.
- **Preview mode, per service, decided at start:**
  - memory without `MEMWAL_ACCOUNT_ID`/`MEMWAL_PRIVATE_KEY` uses `MemWalMock` from the SDK, in process;
  - pockets without `TATUM_API_KEY_TESTNET`, `SUI_OPERATOR_KEY` or `MIRA_WALLET_SECRET` use an
    in-process ledger with `preview-…` receipts.

  The header and health say which mode each one runs in. Nothing in preview mode claims to be on Walrus
  or Sui.
- **`npm run e2e`** builds the web app, starts the server in preview mode and drives the happy path in
  Chromium with Playwright, including a second browser context that restores from memory.

## Consequences

- `npm run typecheck` and `npm test` cover the server.
- A deploy without keys runs, but in preview mode; health makes that visible.

## Links

[PRD F12, F13](../prd.md#71-mvp-p0) · [code rules](../code-rules.md)
