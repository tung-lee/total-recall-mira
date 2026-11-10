# @mira/money

Mira's money logic, pure: no I/O, no clock unless passed in. The web app and the server both import it.

- `parseMessage(text, now)`: one message to one typed intent (spend, budget, cap, goal, correct, ask,
  move, memory, summary, greet, thanks, unknown).
- `categorize(label, rules)`: a learned rule first, then the keyword list, then "other".
- `monthSpent`, `capStatus`: ledger math on the device's spends.
- `adviseBuy(ask, ctx)`: the "should I buy" verdict with typed reasons.
- `Fact`, `factLine`, `parseLine`, `writable`: the only shapes that reach Walrus Memory, and the rounded
  lines built from them ([PRD §8](../../docs/prd.md#8-walrus-memory), [ADR-0003](../../docs/adr/0003-ledger-on-device-typed-lines-in-memory.md)).
- `learn(facts)`: the newest fact per key, and the nudge thresholds derived from the nudge history.
- `deriveHabit(spends, category, now)`: a category's weekly spend and peak days, rounded.
