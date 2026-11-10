# ADR-0003: The ledger stays on the device; memory gets typed, rounded lines built by the server

- **Status:** Accepted
- **Date:** 2026-11-03
- **Deciders:** Hien

## Context

- Walrus Memory can't delete a memory, and the relayer sees plaintext while it embeds and encrypts
  ([tech reference §1.11](../tech-reference.md#111-field-notes-measured-on-mainnet)).
- A money app handles exactly what must not go there: names, exact amounts, balances tied to a person.
- Mira has no database, and Walrus Memory is semantic memory, not a ledger.
- Track 3 still wants habits and preferences to follow the user across sessions and devices.

## Decision

- **The device keeps the ledger:** every spend with its exact amount and label, friends' names, goal
  labels, the user's Mira code. It lives in the browser's storage.
- **Memory keeps the conclusions,** one typed line per memory, in four namespaces per user (`prefs`,
  `rules`, `nudges`, `habits`) built in `@mira/memory`.
- **The browser sends typed facts, never text.** The server validates them with zod, rejects anything
  outside the fixed lists (categories, about 120 keywords, goal kinds), builds the line with `factLine`
  (amounts rounded), runs `redactCredentials`, and queues it.
- **Recall parses lines back into facts.** A line that doesn't parse is dropped. Newest `as_of` wins per
  key. Thresholds are derived from the nudge history by pure code (`learn`).
- **MemWalManual (client-side encryption) is not used.** With nothing private in a line, the managed
  relayer's embedding and recall are worth more than encrypting rounded numbers.

## Consequences

- A new device restores preferences, rules, thresholds and the month's rounded spend, but not the
  itemised ledger. The PRD says so, and the greeting says what was restored.
- Adding a memory kind means a fact type, a line format, a parser and a test, in one package.
- Free-text memories ("I hate spending on rideshares") can't be written. A preference has to map to a
  typed fact first.

## Links

[PRD §8](../prd.md#8-walrus-memory) · [ADR-0002](0002-mira-becomes-a-money-friend.md)
