# ADR-0005: The repo stands on its own

- **Status:** Accepted
- **Date:** 2026-11-03
- **Deciders:** Hien (asked that the repo name no other entry)

## Context

- This repo is its own entry to the hackathon, submitted by its own team member with their own accounts.
- The docs, the package READMEs and some code comments pointed readers at another project's repo and
  ADRs for rules that apply here.

## Decision

- **Docs and code don't name or link other hackathon entries.** Rules that apply here are stated here:
  Sui is gRPC only, every Sui call goes through Tatum, the public fullnode is the fallback on a 402, Sui
  runs on testnet and Walrus Memory on mainnet ([ADR-0001](0001-track-3-from-mira-with-a-memory-and-tatum-kit.md)).
- **ADR-0001's wording is edited** to drop the other project's name and links, at the owner's request.
  Its decisions are unchanged. This is the one exception to "never rewrite an accepted ADR".
- **The PRD replaces the borrowed model PRD,** which is removed.

## Consequences

- Git history keeps the earlier wording; history is never rewritten (no force-push).
- Code comments cite this repo's ADRs.

## Links

[ADR-0001](0001-track-3-from-mira-with-a-memory-and-tatum-kit.md) · [PRD](../prd.md)
