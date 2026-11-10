# @mira/chain

The typed Tatum client for Sui, **gRPC only**
([ADR-0001](../../docs/adr/0001-track-3-from-mira-with-a-memory-and-tatum-kit.md)): the server uses Tatum's
native gRPC gateway with the API key as `x-api-key` metadata. Mira's pockets use it for every balance read
and every move ([ADR-0004](../../docs/adr/0004-mira-cash-pockets-on-sui-testnet.md)).

- `createTatumSuiClient({ network, apiKey })`: a `SuiGrpcClient` on Tatum, paced and metered, with the
  public fullnode as the fallback while Tatum answers 402.
- `tatumSuiOptionsFromEnv(network)`: reads `TATUM_API_KEY[_TESTNET]`, `TATUM_SUI_GRPC[_TESTNET]` and
  `SUI_GRPC_FALLBACK[_TESTNET]`.
- `PacedTransport`: 3 unary calls a second by default, retries Tatum's 429s, and counts every call and
  stream frame by method (`tatumUsage`), for the health panel.
- `suiFallback(network)`: whether calls go to the fallback right now, for health.
- `readFunds(client, owner, coinType)`: an address balance and its coins, from one `GetBalance`.
- `withRetry(fn)`: retries transport errors only.
- `createLogger`, `redact`, `withLogContext`: JSON-lines logs that never print secrets.
