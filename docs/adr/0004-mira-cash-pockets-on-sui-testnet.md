# ADR-0004: Mira Cash: pockets on Sui testnet, derived keys, sponsored gas, through Tatum

- **Status:** Accepted
- **Date:** 2026-11-03
- **Deciders:** Hien

## Context

- Track 3 wants payment flows that feel normal, with the blockchain out of sight, and judging asks for a
  working Tatum Sui RPC integration.
- No real money is used, and Move is never published to mainnet ([ADR-0001](0001-track-3-from-mira-with-a-memory-and-tatum-kit.md)).
- Mira has no database to keep a key per user.
- Measured on Sui testnet on 2026-11-03 through `@mira/chain`: a seed transfer took 1.2 s and a
  sponsored pocket-to-pocket move 1.9 s, with 2 `ExecuteTransaction`, 7 `GetBalance`, 4
  `GetTransaction`, 2 `SimulateTransaction` and 1 `ListOwnedObjects` call for both.

## Decision

- **Pockets:** each user has Spending and one pocket per goal kind. A pocket's Ed25519 key is
  `HMAC-SHA256(MIRA_WALLET_SECRET, "<user code>:<pocket>")`, so the server derives keys and stores none.
- **Units:** $1 is 1,000,000 MIST (0.001 testnet SUI). The UI calls it test money.
- **Gas:** the operator's testnet key (`SUI_OPERATOR_KEY`) is the gas owner of every move, so amounts are
  exact and users never hold gas. It also seeds $100 into Spending once per user, capped per hour.
- **Every call goes through `@mira/chain`'s Tatum client** on testnet: build, execute, wait, read
  balances. Moves run one at a time, so the operator's gas coins never race.
- **Receipts** link to the testnet explorer; nothing else shows an address.
- **`npm run cash:faucet`** tops up the operator from the testnet faucet.

## Consequences

- Losing `MIRA_WALLET_SECRET` loses every pocket. It's test money, but the secret still never changes once
  users exist.
- The Mira code controls that user's pockets. Moves only go between the user's own pockets in P0.
- Splits with friends (PRD F20) can reuse the same derivation for users who are on Mira.

## Links

[PRD §9](../prd.md#9-sui-and-tatum) · [packages/chain](../../packages/chain/README.md)
