# Total Recall submission: the form, filled in

Every field of the form at [recall-tatum-walrus.vercel.app](https://recall-tatum-walrus.vercel.app) ("Submit Project"), in the form's order and with its labels (checked on the live form on 2026-11-10). Copy each answer from its block. **Due Nov 10, 2026, 17:00 UTC.**

1. ✅ filled in, ready to paste
2. ✏️ personal: the submitter fills it in from their separate account
3. ⏳ upload step before pasting the final link

Nothing here is a private key or a secret.

## Before you submit

Status updated on 2026-11-10 for a dedicated, separate submission account ([event rules §3](event-rules.md#3-eligibility)).

| # | Item | Status |
| :--- | :--- | :--- |
| 1 | At least 10 memories on mainnet | ✅ **12 of 10.** 12 typed Mira memories across all 4 namespaces (`mira:prefs`, `mira:rules`, `mira:nudges`, `mira:habits`) are stored and verified on Walrus Mainnet in Mira's dedicated account (`0x8002385943aeb7c275e29c0cb5e839ad7b8c741dd5ac09871db489712abf971c`) |
| 2 | Published blog post | ✅ **Written ([blog.md](blog.md)).** Covers what Mira does, how it uses Tatum and Walrus, and how it learned over time ([§5.1](event-rules.md#51-submission-requirements-checklist)) with all 12 Mainnet Walrus blob links |
| 3 | Demo video, 2 to 3 minutes | ⏳ Rendered (`2:01`, `1920x1080`, `60 fps` at `artifacts/mira-showreel.mp4`). Upload to YouTube (public or unlisted) on the submitter's account and paste the link |
| 4 | The account fields | ✅ **Dedicated account provisioned on Mainnet:** see [02 Accounts](#02-accounts) |
| 5 | The live app is up | ✅ **Done.** The web app on Vercel (`https://mira-flax.vercel.app`) serves `main`, and `/api/health` reports memory on Walrus and pockets on Sui ([ADR-0008](adr/0008-web-on-vercel-api-on-railway.md)) |

## 01 Contact

| Field | Answer |
| :--- | :--- |
| Email \* | ✏️ Submitter's email address (separate account) |
| Discord handle \* | ✏️ Submitter's Discord handle |
| LinkedIn \* | ✏️ Submitter's LinkedIn profile URL |
| Telegram ID _(optional)_ | ✏️ Submitter's Telegram handle |
| How did you hear about this event? \* | ✏️ One of: `Walrus Socials`, `Tatum Socials`, `Ads`, `Hackathon Listings`, `Friends`, `Search`, `Others` |
| Which community or account did you hear about us through? _(optional)_ | ✏️ Optional |
| Is this your first Web3 project? \* | ✏️ `Yes` or `No` |

## 02 Accounts

These public onchain identifiers belong exclusively to Mira's dedicated Walrus Memory Mainnet account (created in Sui Mainnet transaction [`3bLZGxvDpKZiYL6HfNZDw52igmTNk8qmRwsxSE2rC5Bk`](https://suiscan.xyz/mainnet/tx/3bLZGxvDpKZiYL6HfNZDw52igmTNk8qmRwsxSE2rC5Bk), delegate key registered in [`ECySQRhQfWG3V6UdXqVKK17UNMaatRQFahDv2Qh2s5S1`](https://suiscan.xyz/mainnet/tx/ECySQRhQfWG3V6UdXqVKK17UNMaatRQFahDv2Qh2s5S1)) and are not shared with any other submission.

| Field | Answer |
| :--- | :--- |
| Tatum ID \* | ✏️ Submitter's Tatum account ID from [dashboard.tatum.io](https://dashboard.tatum.io/) (`My Account → My Account Info`) |
| SUI address \* | ✅ `0x1396fa6332d43f75bf05577fa32bc6104cb1204a7004bbf3a80c1553989a0536` |
| Account ID (SUI) \* | ✅ `0x8002385943aeb7c275e29c0cb5e839ad7b8c741dd5ac09871db489712abf971c` |
| MEMWAL_AGENT_ID \* | ✅ `55d4532f1a58bc5b03062f7ff075b3d57ec8b920f1f71bb0458093ba4cc43746` |

### Copy blocks for 02 Accounts

#### SUI address \* ✅

```text
0x1396fa6332d43f75bf05577fa32bc6104cb1204a7004bbf3a80c1553989a0536
```

#### Account ID (SUI) \* ✅

```text
0x8002385943aeb7c275e29c0cb5e839ad7b8c741dd5ac09871db489712abf971c
```

#### MEMWAL_AGENT_ID \* ✅

```text
55d4532f1a58bc5b03062f7ff075b3d57ec8b920f1f71bb0458093ba4cc43746
```

## 03 Project

### Project description \* ✅

```text
Mira, the money friend you text. A Track 3 (Consumer Finance Apps) entry.

You text Mira what you spend the way you'd text a friend: "coffee 5.5", "uber 18", "dinner 84 split 3 ways". She keeps your budget, your weekly caps and your savings goal. Ask "should I buy the $48 serum?" and she checks three stores, your caps, your goal's pace and what she learned from your last answers, then offers "skip it, move $41 to Trip". One tap moves the money between your pockets. It feels like texting; the blockchain stays out of sight.

Walrus Memory (mainnet) is the learning loop. Every lesson becomes one short typed line: a budget, a cap, a goal, a rule ("coffee counts as eating out"), a nudge outcome (skipped, or bought anyway), a weekly habit and the month so far. Those lines change what Mira does next: the next coffee is filed where you said; a skipped $41 buy flags that category from $30 (and a skipped $32 lipstick tightens it to $20), and Mira says why; two "buy anyway" answers raise the threshold to $60 so she nags less; and a new phone (scan the QR) greets you with your goal and budget recalled from Walrus. Ask "what do you know about me?" to see every line and its Walrus blob. 12 typed memories are stored on mainnet in Mira's dedicated account (0x8002385943aeb7c275e29c0cb5e839ad7b8c741dd5ac09871db489712abf971c).

Private by design. Memories can't be deleted and the relayer sees plaintext, so exact amounts, goal labels and friends' names stay on the device. The server builds every memory line from a typed fact, rounded ("about $40"), and a recalled line that doesn't parse back into a fact is dropped.

Tatum for every onchain call. Each user's pockets are Sui testnet addresses. Balances, transfer building, execution and confirmation all go through Tatum's native Sui gRPC gateway (GetBalance, ListOwnedObjects, SimulateTransaction, ExecuteTransaction, GetTransaction), paced and counted, with no JSON-RPC. The operator sponsors gas, so a $41 move moves exactly $41 of test money and nobody holds SUI.

Live: https://mira-flax.vercel.app
Blog: https://github.com/hien-p/total-recall-mira/blob/main/docs/blog.md
Code: https://github.com/hien-p/total-recall-mira
```

### Short demo video (2 to 3 min) \* ⏳

Upload `artifacts/mira-showreel.mp4` (`2:01`, `1080p60`) to YouTube (public or unlisted) and paste the video URL.

### GitHub repo \* ✅

```text
https://github.com/hien-p/total-recall-mira
```

### Additional documentation _(optional)_ ✅

Swap in the external DEV.to / Medium / Hashnode URL if published there, or paste the canonical blog URL in the repo:

```text
https://github.com/hien-p/total-recall-mira/blob/main/docs/blog.md
```

## 04 Feedback

### How was your experience building with Walrus? \* ✅

```text
Good overall, and it shaped the product more than we expected. rememberBulk with an idempotency key let us send up to 20 lines per request and resubmit failed ones safely (12 typed lines are stored on mainnet across Mira's 4 namespaces: mira:prefs, mira:rules, mira:nudges and mira:habits). The SDK's in-process mock let every unit test and the browser E2E run in a preview mode that never touches mainnet. Namespaces map cleanly onto what Mira learns, one set per user.

The hard parts: a write takes tens of seconds to land, so nothing in the product waits on one (a queue, bulk writes, retries, and the device keeps every fact until its line has a blob id). Memories can't be deleted and the relayer sees plaintext, which is why Mira writes only typed, rounded lines built on the server and never free text. Recall is semantic, so loading everything Mira knows about a user is a recall with a limit of 50 per namespace, plus our own parsing and "newest line per key wins".
```

### How was your experience building with the Tatum AI Builder? \* ✅

```text
We didn't use the AI Builder. We used Tatum's Sui gRPC gateway on testnet for every onchain call. The gateway speaks native gRPC, while @mysten/sui's SuiGrpcClient defaults to gRPC-web, so we plugged in a native transport (@protobuf-ts/grpc-transport and @grpc/grpc-js) with the x-api-key metadata. After that it was solid: a pocket move (simulate, execute, confirm) takes about 2 to 4 seconds. We pace calls to 3 a second, count them per method and show the counts on /api/health.
```

### One bug or friction point with Walrus Memory _(optional)_ ✅

```text
There's no way to read a namespace's lines without a semantic query. The read API (/v1/owners/:owner/memories) lists metadata only, with no text, and recall needs a query. So loading "everything Mira knows about this user" is a recall with a limit of 50 per namespace. On top of that, recall sometimes returns results: [] with dropped_count > 0 (it found matches, then dropped them), so we retry four times with backoff before trusting an empty answer. A "list this namespace with text" call would remove both workarounds.
```

### Social post links _(optional, extra points)_ ✏️

The submitter's links to their X or LinkedIn posts. A ready-to-post draft:

```text
I built Mira for the @WalrusProtocol x @tatum_io Total Recall hackathon (Track 3: Consumer Finance): the money friend you text before you buy. Log spends by text, ask "should I buy this?", and move skipped buys into your goal pocket in one tap via Tatum's Sui gRPC gateway while Walrus Memory on mainnet learns your rules and nudge thresholds over time. Try it: https://mira-flax.vercel.app #Sui #Walrus #Tatum
```

## The checkbox \*

✏️ "I am 18+ and agree to the Event Rules, the Tatum Terms of Use, the Walrus General Terms of Service and the Walrus Privacy Policy": the submitter ticks it.
