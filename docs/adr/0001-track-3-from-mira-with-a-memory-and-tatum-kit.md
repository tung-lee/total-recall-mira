# ADR-0001: Track 3 starts from Mira, with a Walrus Memory and Tatum kit

- **Status:** Accepted (wording edited by ADR-0005). "No keys are carried over" is superseded by
  [ADR-0007](0007-shared-memory-account-and-tatum-key.md).
- **Date:** 2026-11-03
- **Deciders:** Hien

## Context

- Track 3 of Total Recall asks for consumer finance apps ([event rules §6](../event-rules.md)). The
  deadline is Nov 10, 2026, 17:00 UTC.
- **Mira** ([harrymove-ctrl/mira-imessage](https://github.com/harrymove-ctrl/mira-imessage), built Nov 2
  for the YouCam hackathon) is a working iMessage-style assistant. It has:
  - a chat thread with the agent's steps streamed in;
  - a "Mira remembers" card backed by localStorage;
  - a Railway deploy.

  It uses npm and Node.
- The team already had the parts every Total Recall entry needs, measured on mainnet and testnet:
  - a Walrus Memory client that respects the relayer's real limits;
  - a Tatum gRPC client for Sui;
  - the event rules and a tech reference;
  - a PRD template that shipped.

## Decision

- **Fork** Mira as [hien-p/total-recall-mira](https://github.com/hien-p/total-recall-mira); the
  `upstream` remote is the original.
- **Bring the kit in as npm workspaces:**
  - `packages/memory` is `@mira/memory`, and `packages/chain` is `@mira/chain`.
  - Versions: memwal 0.1.12, `@mysten/sui` 2.38.0, `@mysten/seal` 1.5.2.
  - Constructors use plain fields instead of parameter properties, so Node's type stripping loads the
    packages without a build step.
- **Bring the docs in:** [event-rules.md](../event-rules.md), [tech-reference.md](../tech-reference.md),
  [code-rules.md](../code-rules.md) (the stack-neutral part), the ADR template, the link check
  (`npm run docs:links`) and the history secret scan (`npm run secrets:history`).
- **These rules apply here:**
  - **Sui is gRPC only.** No JSON-RPC call, ever: public fullnodes reject it.
  - **Every Sui call goes through Tatum,** through `@mira/chain`, paced and counted.
  - **The public fullnode is the fallback** only while Tatum answers 402 (credits spent), for a cool-down.
  - **Sui runs on testnet and Walrus Memory on mainnet.** No real money; Move is never published to
    mainnet.
- **No keys are carried over.** One submission per person: this entry uses its submitter's own Tatum and
  Walrus Memory accounts.
- **npm stays the package manager,** as Mira already uses it.

## Consequences

- The memory and chain packages are tested before they are wired into the app. Chain passes 22 tests.
  Memory passes 11, plus 6 that need a real account and skip without one.
- Open questions for the PRD: what the product is; what memory may hold, given that the relayer sees
  plaintext and memories can't be deleted; where the server keeps state, since Mira has no database.
- Some things need Node ≥ 22.18: the scripts, and the server once it imports the packages.

## Links

[AGENTS.md](../../AGENTS.md) · [packages/memory](../../packages/memory/README.md) ·
[packages/chain](../../packages/chain/README.md)
