# Mira: test the buy before you spend the money

_How Mira uses Tatum and Walrus Memory, and how she learns what you care about over time. A Track 3 (Consumer Finance Apps) entry to the Walrus × Tatum "Total Recall" hackathon._

![Mira: the money friend you text before you buy](https://raw.githubusercontent.com/hien-p/total-recall-mira/main/docs/media/banner.png?v=2)

**Live:** [mira-flax.vercel.app](https://mira-flax.vercel.app) · **Restored Mainnet profile:** [mira-flax.vercel.app/#/chat?me=mira7x9k2p4q8w1n5v3c](https://mira-flax.vercel.app/#/chat?me=mira7x9k2p4q8w1n5v3c) · **Code:** [github.com/hien-p/total-recall-mira](https://github.com/hien-p/total-recall-mira)

## The moment before you buy

Budget apps ask you to do accounting after the money is already gone. At the end of the month they pull a list of card transactions, leave 47 items in "Uncategorised", and draw a pie chart of what went wrong. Most people stop opening them by week two because a monthly recap cannot undo a purchase you made three Tuesdays ago.

The ten seconds that matter happen earlier, while you are standing in a store or staring at a checkout tab wondering: *"should I buy this $48 serum, or keep the money for my Tokyo trip?"*

Mira is a money friend you text in that ten-second window. You do not connect a bank login or maintain a spreadsheet. Instead, you text what you spend the way you would text a friend, ask Mira before you buy something you are on the fence about, and tap once to move the money you chose not to spend into your goal pocket.

![Six scenes from Mira: spend tracking, asking before you buy, skipping and saving on Sui via Tatum, writing typed lines to Walrus Memory, adapting impulse thresholds, and restoring on a new phone](https://raw.githubusercontent.com/hien-p/total-recall-mira/main/docs/media/film-strip.jpg)

## What Mira does

Everything happens in one chat thread that feels like iMessage:

1. **Set your plan in plain words:** Text `"budget 400 a month"`, `"saving 1200 for tokyo by march"`, and `"cap eating out at 60 a week"`. Mira sets your monthly budget, opens a goal pocket for Tokyo with \$100 of test spending money, and starts watching your weekly cap.
2. **Text what you spend:** Send `"coffee 5.5"`, `"uber 18"`, or `"dinner 84 split 3 ways"`. Mira files each spend into one of nine categories (`eating out`, `groceries`, `treats`, `transport`, `shopping`, `beauty`, `fun`, `bills`, `other`), works out your \$28 share of the split dinner, and shows what is left of your month and your weekly cap on the receipt card.
3. **Ask before you buy:** Text `"should i buy the $48 serum?"` before checking out. Mira checks three stores (`Shelf` at \$41, `Basket` at \$45, `Glow & Co` at \$48), checks your budget and caps, recalls what you decided on similar buys from Walrus Memory, and shows what \$41 is worth toward your goal (`3% of your $1,200 Tokyo trip`).
4. **Skip it and move the money:** Tap `"skip it, move $41 to tokyo"` on the advice card. Mira moves \$41 from your `Spending` pocket into your `tokyo` pocket on Sui testnet and records that you skipped a \$40 beauty buy so she knows where your line is next time.

![Three steps in the thread: logging daily spends, asking whether to buy the $48 serum, and moving $41 into the Tokyo pocket](https://raw.githubusercontent.com/hien-p/total-recall-mira/main/docs/media/site-thread.jpg)

## How it uses Tatum

A consumer finance app loses the user the moment it asks them to install a wallet extension, buy SUI for gas, or sign a hex digest just to set \$41 aside. In Mira, Sui holds the pockets and Tatum is how the server talks to Sui. Every onchain call goes through `@mira/chain` over Tatum's native Sui Testnet gRPC gateway (`https://sui-testnet.gateway.tatum.io`) with the `x-api-key` header in gRPC metadata, and nothing in the repo calls JSON-RPC.

![Skip it, save it: moving $41 from Spending to the Tokyo pocket on Sui testnet through Tatum gRPC](https://raw.githubusercontent.com/hien-p/total-recall-mira/main/docs/media/site-tatum.jpg)

Each user code deterministically derives two Sui testnet addresses: a `Spending` pocket and a `Goal` pocket (`tokyo`). We published a Move module (`mira_cash::cash`, package [`0x160a224d8627ec9fc50ff2192fb4eb405e9a3de3e72d329199c72cd725d27721`](https://suiscan.xyz/testnet/object/0x160a224d8627ec9fc50ff2192fb4eb405e9a3de3e72d329199c72cd725d27721)) with 2 decimals so `100` on chain equals `$1.00`. When you set your first goal, the server mints `$100.00` of `CASH` into your `Spending` pocket so you have test money ready to move.

When you tap `"skip it, move $41 to tokyo"`, the server builds a Programmable Transaction Block that splits and transfers `4100` units of `CASH` from `Spending` to `Goal`. The operator keypair sponsors the SUI gas, so a \$41 skip moves \$41.00 to the cent without the user holding SUI. Every receipt card in the chat links to the settled transaction on Suiscan.

Under the hood, `@mysten/sui`'s `SuiGrpcClient` defaults to `grpc-web`, whereas Tatum's gateway speaks native HTTP/2 gRPC. We paired `SuiGrpcClient` with `@protobuf-ts/grpc-transport` and `@grpc/grpc-js` so all five gRPC calls run over a single native connection: `StateService/GetBalance` reads both pockets, `StateService/ListOwnedObjects` selects `Coin<CASH>` objects and the sponsor's SUI gas coin, `LedgerService/GetObject` reads the `TreasuryCap` shared version at startup, `TransactionExecutionService/SimulateTransaction` dry-runs the transfer before signing, and `TransactionExecutionService/ExecuteTransaction` plus `LedgerService/GetTransaction` broadcast and confirm finality in about 3 seconds. The client paces requests to 3 calls per second, caches pocket balances for 10 seconds, retries `429` responses, and records per-method call counts that anyone can inspect in the **Under the hood** panel.

## How it uses Walrus Memory

Two properties of Walrus Memory shaped Mira's design from day one: memories on Walrus cannot be deleted, and the relayer sees plaintext before encrypting blobs for storage. Putting raw bank descriptions, exact dollar amounts, or friends' names (`"dinner with An & Bao $28.00"`) into permanent storage would leak private spending history.

Mira solves this by splitting state across a strict boundary ([ADR-0003](https://github.com/hien-p/total-recall-mira/blob/main/docs/adr/0003-ledger-on-device-typed-lines-in-memory.md)): exact numbers and names stay in `localStorage` on your phone, while rounded lessons go to Walrus Memory on mainnet.

![Exact numbers stay on your phone while typed, rounded lessons travel on Walrus Memory](https://raw.githubusercontent.com/hien-p/total-recall-mira/main/docs/media/site-memory.jpg)

The browser never sends free text to Walrus. When you set a plan, teach Mira a rule, or answer a buy nudge, the server builds a typed `MemoryFact`, rounds dollar amounts to the nearest \$5 under \$50 or \$10 from \$50 up (`$41` becomes `about $40`), checks category and goal names against closed allowlists, and formats one canonical line:

```text
BUDGET · monthly · about $400 · as_of=2026-11-03T09:15:00Z
GOAL · trip · about $1,200 · by 2027-03 · as_of=2026-11-03T09:16:00Z
CAP · eating out · about $60 a week · as_of=2026-11-03T09:18:00Z
RULE · coffee → eating out · as_of=2026-11-04T14:20:00Z
NUDGE · beauty · about $40 · skipped · as_of=2026-11-05T19:40:00Z
HABIT · eating out · about $55 a week · fri sat · as_of=2026-11-09T12:00:00Z
MONTH · 2026-11 · spent about $250 · as_of=2026-11-09T21:00:00Z
```

Each user code gets four namespaces inside Mira's mainnet account (`mira:prefs:<user>`, `mira:rules:<user>`, `mira:nudges:<user>`, and `mira:habits:<user>`). Writes go through `rememberBulk` with a deterministic idempotency key per batch so retries never duplicate a line. Because memories cannot be deleted, updating a budget or a monthly total writes a newer timestamped line. On recall, every returned string must pass `parseMemoryLine` (any line that fails the grammar is dropped), and `foldMemories` sorts by `as_of` so the newest budget, goal, cap, or rule wins while keeping the count of replaced lines visible in the UI.

| Namespace | Line Kind | What Mira Writes | How It Changes Mira's Next Turn |
| :--- | :--- | :--- | :--- |
| `mira:prefs:<user>` | `BUDGET` | `BUDGET · monthly · about $400` | Sets the monthly budget and the `"left"` line on every receipt |
| `mira:prefs:<user>` | `GOAL` | `GOAL · trip · about $1,200 · by 2027-03` | Sets the target amount and destination pocket for skip-and-save moves |
| `mira:prefs:<user>` | `CAP` | `CAP · eating out · about $60 a week` | Checked before every spend and every `"should I buy?"` in that category |
| `mira:prefs:<user>` | `MONTH` | `MONTH · 2026-11 · spent about $250` | Carries your monthly spend total to a new device when `localStorage` is empty |
| `mira:rules:<user>` | `RULE` | `RULE · coffee → eating out` | Overrides the default category table on every future matching item |
| `mira:nudges:<user>` | `NUDGE` | `NUDGE · beauty · about $40 · skipped` | Moves that category's impulse flag line down by \$10 on a skip, or up by \$10 on buy anyway |
| `mira:habits:<user>` | `HABIT` | `HABIT · eating out · about $55 a week · fri sat` | Summarises weekly rhythm once a category reaches 3 logged spends |

## How it learned over time

The point of memory is that Mira acts differently on turn ten than she did on turn one, and names the memory that changed her answer.

![Memories that change what Mira does next: skipping a $40 serum lowers the beauty flag line to $30, catching a $32 lipstick next time](https://raw.githubusercontent.com/hien-p/total-recall-mira/main/docs/media/site-learning.jpg)

### Rules you teach her (`RULE`)

On your first coffee (`"coffee 5.5"`), Mira uses her built-in keyword table and files it under `treats`. When you reply `"coffee counts as eating out"`, she moves that coffee into `eating out` and writes `RULE · coffee → eating out` to `mira:rules:<user>`.

When you text `"coffee 4"` the next day, Mira checks recalled rules before the default table, files it under `eating out`, counts the \$4 toward your \$60 weekly eating-out cap, and cites the rule on the receipt card: `🧠 eating out, from memory: coffee → eating out`.

### Your impulse line per category (`NUDGE`)

Mira starts every category with a default impulse flag line of \$40. Each time you answer a `"should I buy?"` card, she writes a `NUDGE` line to `mira:nudges:<user>` and recomputes that category's threshold (`$40 - $10 × skips + $10 × bought_anyway`, clamped between \$20 and \$100).

Skipping a buy pulls that category's flag line down. When you ask `"should i buy the $48 serum?"` (\$41 at Shelf), \$41 sits above the initial \$40 line, so Mira flags it (`"$40 and up is where beauty buys turn impulsive"`) and offers `"skip it, move $41 to tokyo"`. Once you tap skip, Mira writes `NUDGE · beauty · about $40 · skipped`, which lowers your beauty flag line from \$40 to \$30 (and after a second skipped beauty buy of about \$30, down to \$20). When you later ask `"thinking about a 38 lipstick"` (\$32 at Basket), a \$32 item that would have passed unflagged on day one now gets caught, and Mira tells you why: *"You skipped a beauty buy of about \$40, so I flag beauty from \$30."*

Buying past a nudge pushes the flag line in the other direction. In `shopping`, two nudges around \$45 and \$50 were answered with `"buy anyway"` (`NUDGE · shopping · about $45 · bought anyway` and `NUDGE · shopping · about $50 · bought anyway`). Those two overrides raise the `shopping` flag line from \$40 to \$60, so Mira stops flagging \$45 shopping buys you consistently choose to make.

### New phone, same Mira (`MONTH` + QR restore)

Click **Continue on your phone** in the desktop header (or open [`mira-flax.vercel.app/#/chat?me=mira7x9k2p4q8w1n5v3c`](https://mira-flax.vercel.app/#/chat?me=mira7x9k2p4q8w1n5v3c) in a fresh browser window). The new device has an empty `localStorage`, so none of your itemised coffee or dinner receipts leave the old phone.

![New phone, same Mira: scanning the QR code restores 9 lines from Walrus Memory and reads pocket balances from Sui testnet through Tatum](https://raw.githubusercontent.com/hien-p/total-recall-mira/main/docs/media/site-new-phone.jpg)

On boot, the new phone recalls all four Walrus Memory namespaces for your code and reads your Sui pockets through Tatum. Within two seconds, Mira greets you with your \$400 monthly budget, your \$1,200 trip goal, your weekly eating-out and monthly beauty caps, your `coffee → eating out` and `matcha → treats` rules, your learned \$20 beauty flag line and \$60 shopping flag line, and `MONTH · 2026-11 · spent about $250` so your \$150 remaining November budget is ready before you send a single message.

![Live Mira desktop view showing the restored chat thread alongside all 12 recalled Walrus Mainnet memories](https://raw.githubusercontent.com/hien-p/total-recall-mira/main/docs/media/site-chat.jpg)

### Twelve verified memories on Walrus Mainnet

All 12 lines below are stored on Walrus Mainnet under Mira's account (`0x8002385943aeb7c275e29c0cb5e839ad7b8c741dd5ac09871db489712abf971c`, delegate agent `55d4532f1a58bc5b03062f7ff075b3d57ec8b920f1f71bb0458093ba4cc43746`) and can be read directly from the Walrus Mainnet aggregator:

| # | Namespace | Stored Memory Line | Walrus Mainnet Blob ID |
| :--- | :--- | :--- | :--- |
| 1 | `mira:prefs` | `BUDGET · monthly · about $400 · as_of=2026-11-03T09:15:00Z` | [`MR0RUsnOALRnkTGI0I6j9KgkSG3EJet5NzF87InaLss`](https://aggregator.walrus-mainnet.walrus.space/v1/blobs/MR0RUsnOALRnkTGI0I6j9KgkSG3EJet5NzF87InaLss) |
| 2 | `mira:prefs` | `GOAL · trip · about $1,200 · by 2027-03 · as_of=2026-11-03T09:16:00Z` | [`oY7mz9eTNkOOckfkuZfWvNhsMaSqUZZwPmtVWGI4TUM`](https://aggregator.walrus-mainnet.walrus.space/v1/blobs/oY7mz9eTNkOOckfkuZfWvNhsMaSqUZZwPmtVWGI4TUM) |
| 3 | `mira:prefs` | `CAP · eating out · about $60 a week · as_of=2026-11-03T09:18:00Z` | [`XhVdbCaLkQ71KFg_Wi-t8vosMtST0f76gyPMTtLkoZE`](https://aggregator.walrus-mainnet.walrus.space/v1/blobs/XhVdbCaLkQ71KFg_Wi-t8vosMtST0f76gyPMTtLkoZE) |
| 4 | `mira:prefs` | `CAP · beauty · about $80 a month · as_of=2026-11-04T11:05:00Z` | [`l5Y-rQtzE0w_AbQxLn2arg9-ukSNBzL__pj1NOGRcw4`](https://aggregator.walrus-mainnet.walrus.space/v1/blobs/l5Y-rQtzE0w_AbQxLn2arg9-ukSNBzL__pj1NOGRcw4) |
| 5 | `mira:rules` | `RULE · coffee → eating out · as_of=2026-11-04T14:20:00Z` | [`3Gtpinps05-EM41EJWZiPuUKLMxogpkaeo4biMC4kYs`](https://aggregator.walrus-mainnet.walrus.space/v1/blobs/3Gtpinps05-EM41EJWZiPuUKLMxogpkaeo4biMC4kYs) |
| 6 | `mira:rules` | `RULE · matcha → treats · as_of=2026-11-05T10:12:00Z` | [`2XWZsAy3qmoUveAJOJ64t3ltXlBsK_dGJxdsDVh6ahE`](https://aggregator.walrus-mainnet.walrus.space/v1/blobs/2XWZsAy3qmoUveAJOJ64t3ltXlBsK_dGJxdsDVh6ahE) |
| 7 | `mira:nudges` | `NUDGE · beauty · about $40 · skipped · as_of=2026-11-05T19:40:00Z` | [`9XaNh_0kZNnqrf15WVlUMNZW0UvKUjTsDPhOGRIRvaw`](https://aggregator.walrus-mainnet.walrus.space/v1/blobs/9XaNh_0kZNnqrf15WVlUMNZW0UvKUjTsDPhOGRIRvaw) |
| 8 | `mira:nudges` | `NUDGE · beauty · about $30 · skipped · as_of=2026-11-06T20:15:00Z` | [`Uf5vWF-8lGMjgnjKYrzikA_mRWxbnPHptsGdba2IBCI`](https://aggregator.walrus-mainnet.walrus.space/v1/blobs/Uf5vWF-8lGMjgnjKYrzikA_mRWxbnPHptsGdba2IBCI) |
| 9 | `mira:nudges` | `NUDGE · shopping · about $45 · bought anyway · as_of=2026-11-07T15:30:00Z` | [`MOp2RXVm7VVEOGA67Ui90uwZ1J8kkVawlH8oEF302vI`](https://aggregator.walrus-mainnet.walrus.space/v1/blobs/MOp2RXVm7VVEOGA67Ui90uwZ1J8kkVawlH8oEF302vI) |
| 10 | `mira:nudges` | `NUDGE · shopping · about $50 · bought anyway · as_of=2026-11-08T17:10:00Z` | [`5L1fGBjAmkmKh2slzJ_XLSXoeVcKPvEvgv0wa4YT97U`](https://aggregator.walrus-mainnet.walrus.space/v1/blobs/5L1fGBjAmkmKh2slzJ_XLSXoeVcKPvEvgv0wa4YT97U) |
| 11 | `mira:habits` | `HABIT · eating out · about $55 a week · fri sat · as_of=2026-11-09T12:00:00Z` | [`bYLAyPZTd2i7yv9SkEzcYty46Y1xnI-mkcg7_JtYmJ0`](https://aggregator.walrus-mainnet.walrus.space/v1/blobs/bYLAyPZTd2i7yv9SkEzcYty46Y1xnI-mkcg7_JtYmJ0) |
| 12 | `mira:prefs` | `MONTH · 2026-11 · spent about $250 · as_of=2026-11-09T21:00:00Z` | [`C4Gh5wtYg_BmuBO8DmuWseTP_6p6J_WdWFzJNDBBEfc`](https://aggregator.walrus-mainnet.walrus.space/v1/blobs/C4Gh5wtYg_BmuBO8DmuWseTP_6p6J_WdWFzJNDBBEfc) |

## How it's built

![Two apps, one memory: React web app on Vercel, Node TypeScript API on Railway, Walrus Memory on Mainnet, and Tatum Sui gRPC on Testnet](https://raw.githubusercontent.com/hien-p/total-recall-mira/main/docs/media/site-hood.jpg)

1. **Web (`web/`):** React 18 and Vite on Vercel ([mira-flax.vercel.app](https://mira-flax.vercel.app)). The phone frame, receipt cards, advice cards, memory drawer, and QR handoff all run against `/api/*` on the same origin.
2. **API (`server/`):** Node 24 TypeScript server on Railway with zero framework dependencies. It keeps the Walrus Memory, Tatum, and Sui sponsor keys on the server, formats and validates memory lines, and executes sponsored Sui pocket moves.
3. **Packages (`packages/`):**
   1. `@mira/money`: Pure parser (`parseText`), category classifier, advice engine (`advise`), and memory fold (`foldMemories`, `impulseLine`, `parseMemoryLine`).
   2. `@mira/memory`: Walrus Memory mainnet client (`rememberBulk`, `recall`), 4-namespace builder, and rate limiter.
   3. `@mira/chain`: Tatum Sui gRPC client, 3 req/sec pacer, call counter, and public fullnode fallback.
   4. `mira_cash::cash`: Sui Move contract on testnet for user `Spending` and `Goal` pockets.
4. **Tests and showreel (`e2e/`, `video/`):** 91 unit tests across 14 files (`npm test`) and a 16-step Playwright browser E2E (`npm run e2e`) that walks the entire loop from first budget to new-phone restore. The 2-minute showreel (`video/render.ts`) is rendered frame by frame from code at 1080p60 with synthesised sound cues.

Every architecture choice is recorded in [`docs/adr/`](https://github.com/hien-p/total-recall-mira/blob/main/docs/adr/README.md) (ADR-0001 through ADR-0009), and the whole app runs locally in preview mode with a single command (`npm run dev`).

## What's next

1. **User-owned delegate keys:** Let each user register their own Walrus Memory delegate key on device so the server never holds a shared account key.
2. **Live price lookups on checkout links:** Let you paste a product URL into the chat and have Mira pull current prices before checking your category cap and impulse line.

_Built for the Walrus × Tatum "Total Recall" hackathon, Track 3: Consumer Finance Apps. MIT licensed. Try it at [mira-flax.vercel.app](https://mira-flax.vercel.app)._

_Tags: @Tatum_io @WalrusProtocol #Sui #Walrus #Tatum_
