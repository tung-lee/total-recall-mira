# Architecture decision records

One decision per file, numbered. Copy [0000-template.md](0000-template.md) to the next number and add a row
here, in the same commit as the change. An accepted ADR is never rewritten; a new one supersedes it.

| #                                                          | Decision                                                                         | Status   |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------- | -------- |
| [0001](0001-track-3-from-mira-with-a-memory-and-tatum-kit.md) | Track 3 starts from Mira, with a Walrus Memory and Tatum kit                    | Accepted; "no keys carried over" superseded by 0007 |
| [0002](0002-mira-becomes-a-money-friend.md)                | Mira becomes a money friend; the YouCam flows leave the product                  | Accepted |
| [0003](0003-ledger-on-device-typed-lines-in-memory.md)     | The ledger stays on the device; memory gets typed, rounded lines built by the server | Accepted |
| [0004](0004-mira-cash-pockets-on-sui-testnet.md)           | Mira Cash: pockets on Sui testnet, derived keys, sponsored gas, through Tatum    | Accepted |
| [0005](0005-the-repo-stands-on-its-own.md)                 | The repo stands on its own                                                       | Accepted |
| [0006](0006-typescript-server-and-preview-mode.md)         | The server is TypeScript run by Node; preview mode without keys                  | Accepted |
| [0007](0007-shared-memory-account-and-tatum-key.md)        | Run on the team's existing Walrus Memory account and Tatum key; deploy to Railway | Accepted; deploy superseded by 0008 |
| [0008](0008-web-on-vercel-api-on-railway.md)               | The web app on Vercel, the API on Railway                                        | Accepted |
| [0009](0009-showreel-rendered-from-code.md)               | The showreel is rendered from code                                               | Accepted |
