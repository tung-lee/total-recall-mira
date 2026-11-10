# ADR-0007: Run on the team's existing Walrus Memory account and Tatum key; deploy to Railway

- **Status:** Accepted. The deploy bullet is superseded by [ADR-0008](0008-web-on-vercel-api-on-railway.md).
- **Date:** 2026-11-03
- **Deciders:** Hien ("xài ké env … rồi deploy lên railway")
- **Supersedes:** ADR-0001's "no keys are carried over"

## Context

- P0 runs end to end in preview mode, but the live path (Walrus Memory on mainnet, Tatum on Sui testnet)
  needs keys, and the submitter's own accounts don't exist yet.
- The team already has a Tatum testnet key and a Walrus Memory account with a delegate key, in use by
  another app.
- The event rules allow one submission per person, and the form asks for the submitter's Tatum ID, Sui
  address, Walrus Memory account ID and `MEMWAL_AGENT_ID` ([event rules §3, §4](../event-rules.md)).

## Decision

- **Use the team's Tatum testnet key and Walrus Memory account and delegate key** for Mira, in `.env`
  locally and in Railway's variables. Only the keys Mira reads are copied; nothing else from the other
  app's environment.
- **Mira has its own operator testnet key** (`SUI_OPERATOR_KEY`), funded from the faucet. Two servers
  sponsoring gas from one key would pick the same gas coins and fail each other's transactions.
- **Mira's namespaces get a `mira:` prefix** (`mira:prefs:<user>` and so on), so its lines never mix with
  the other app's on the shared account.
- **Deploy to Railway** in the owner's account, project `mira`, from `railway.json`
  (`node server/src/index.ts`, health on `/api/health`).
- Keys live in `.env` and Railway only. The repo never holds them.

## Consequences

- The relayer's write budget (about 60 weighted requests a minute) and Tatum's credits are shared with the
  other app. Mira's limiter only sees its own traffic; `runLimited` waits out the relayer's 429s.
- **The submission form:** with these keys, this entry's Tatum ID, account ID and `MEMWAL_AGENT_ID` are the
  other app's. That doesn't fit "one submission per person" if both are submitted. Before Nov 9, either
  move to the submitter's own accounts (an env change; memories already written stay in the old account,
  so the 10 mainnet memories are written again) or confirm with the organisers that sharing is fine.
- Rotating any of these keys means updating both apps.

## Links

[ADR-0001](0001-track-3-from-mira-with-a-memory-and-tatum-kit.md) ·
[ADR-0004](0004-mira-cash-pockets-on-sui-testnet.md) · [PRD §8.5](../prd.md#85-the-account)
