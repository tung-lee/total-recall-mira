# ADR-0002: Mira becomes a money friend; the YouCam flows leave the product

- **Status:** Accepted
- **Date:** 2026-11-03
- **Deciders:** Hien ("coi làm gì tiếp làm nốt đi")

## Context

- Track 3 asks for money products people actually open: spend tracking, budgets, savings goals and
  payment flows that feel normal, with Walrus Memory keeping habits and preferences across sessions.
- Mira came with skin analysis and virtual try-on on the YouCam API. Judges of Track 3 score none of it,
  it needs a second paid API, and only new work in the build window counts.
- Mira's thread, its step trace, its chips and its price check across three stores fit a money friend as
  they are.

## Decision

- **Mira is the money friend you text** ([PRD](../prd.md)): spends by text, a budget, caps, one savings
  goal, "should I buy" answers that cite what she learned, and skip-and-save moves between pockets.
- **The YouCam flows leave the product:** `server/youcam.mjs`, the skin, makeup and cloth endpoints, the
  key sheet, the demo photos and the try-on cards. The upstream repo keeps them.
- **The agent stays deterministic:** a parser and pure rules in `@mira/money`, no LLM. What Mira knows
  comes from the device and from Walrus Memory, and recalled text is parsed into typed facts, never
  followed.
- **The landing page and README describe the money friend.** `DEVPOST.md`, `SUBMISSION.md` and the deck
  stay as history.

## Consequences

- One API key fewer to manage; the server only needs Walrus Memory and Tatum.
- The demo video and its scripts (`scripts/demo-video.sh`, `scripts/make-video.mjs`) describe the old
  product until they are redone for the new demo (PRD §13).
- The PRD's requirement IDs (`F1`…) start commit messages from now on.

## Links

[PRD](../prd.md) · [ADR-0003](0003-ledger-on-device-typed-lines-in-memory.md) ·
[ADR-0004](0004-mira-cash-pockets-on-sui-testnet.md) · [ADR-0006](0006-typescript-server-and-preview-mode.md)
