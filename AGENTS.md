# Agent instructions — Mira for Total Recall (Track 3)

This repo is a fork of [Mira](https://github.com/harrymove-ctrl/mira-imessage), an iMessage-style assistant
built for the YouCam hackathon, turned into a **Track 3 entry (Consumer Finance Apps)** to the Walrus ×
Tatum "Total Recall" hackathon: **Mira, the money friend you text** ([PRD](docs/prd.md)). Read
[docs/README.md](docs/README.md) first.

## Where things stand (Nov 3)

- **The PRD is written** ([docs/prd.md](docs/prd.md)) and P0 (F1–F13) is built. Commit messages start with
  its requirement IDs.
- **The app:**
  - `packages/money` (`@mira/money`): pure money logic. Parse a message, categorise, ledger math, the
    "should I buy" verdict, the facts that may reach memory with their lines, and what Mira learns.
  - `server/` (`@mira/server`): TypeScript run by Node (`node server/src/index.ts`). The memory write queue
    and recall, the pockets on Sui testnet, health, static files.
  - `web/`: Vite and React, the iMessage thread. The agent is `web/src/chat/useMira.ts`; the device ledger
    is `web/src/lib/device.ts`.
  - `packages/memory` and `packages/chain`: Walrus Memory and Tatum's Sui gRPC client.
- **Preview mode:** without keys, the server runs memory on the SDK's in-process mock and pockets on a
  simulated ledger, and says so in the header and in `/api/health` ([ADR-0006](docs/adr/0006-typescript-server-and-preview-mode.md)).
- **`npm run e2e`** drives the happy path in Chromium against the server in preview mode, including a
  second device that restores from memory.
- **Deployed:** the web app on Vercel (https://mira-flax.vercel.app) and the API on Railway, project `mira`
  ([ADR-0008](docs/adr/0008-web-on-vercel-api-on-railway.md)), on the shared keys ([ADR-0007](docs/adr/0007-shared-memory-account-and-tatum-key.md)).
- **The showreel** (2 min, 1080p60) is rendered from code in `video/` ([ADR-0009](docs/adr/0009-showreel-rendered-from-code.md)):
  `npm run video:shots && npm run video`.
- **Not done yet:** at least 10 memories on mainnet from real use, and the blog post
  ([PRD §12](docs/prd.md#12-plan-to-the-deadline)). The form's answers and what's left before submitting
  are in [docs/submission-form.md](docs/submission-form.md).

## The hackathon ([docs/event-rules.md](docs/event-rules.md))

- **Due Nov 10, 2026, 17:00 UTC:**
  - a public repo and a working demo;
  - a 2–3 minute video;
  - a blog post on what it does, how it uses Tatum and Walrus, and **how it learned over time**.
- **Required:**
  - Walrus Memory writing on mainnet, with at least 10 memories;
  - Tatum RPC for onchain data.
- **Judging:**
  - Walrus and Tatum integration: 30%;
  - technical quality, including a working Tatum Sui RPC integration: 30%;
  - creativity: 20%;
  - presentation: 20%.
- **Best Walrus Memory ($500)** goes to the deepest learning loop: memories that visibly change the product.
- **Track 3 asks for money products people actually open:**
  - shared budgets, spend tracking, savings goals, and payment flows that feel normal;
  - the blockchain stays invisible;
  - memory keeps balances, habits and preferences across sessions.
- **One submission per person (§3).** The server runs on the team's existing Tatum testnet key and Walrus
  Memory account for now ([ADR-0007](docs/adr/0007-shared-memory-account-and-tatum-key.md)). Read its
  consequences before filling in the submission form.
- **Existing projects count only for new work** done in the build window (Oct 20 – Nov 10).

## Rules ([ADR-0001](docs/adr/0001-track-3-from-mira-with-a-memory-and-tatum-kit.md))

- **Sui is gRPC only.** Never add a JSON-RPC call. Every Sui call goes through `@mira/chain` (Tatum, paced
  and counted). Tatum credits are metered, so don't poll through Tatum.
- **Networks:** Sui on testnet, Walrus Memory on mainnet, and no real money. Never publish Move to mainnet.
- **Walrus Memory** behaves differently from its docs in places. Read
  [tech-reference §1.11](docs/tech-reference.md#111-field-notes-measured-on-mainnet) before touching memory
  code. Namespaces are built in `@mira/memory`.
- **Memories can't be deleted, and the relayer sees plaintext.** Only typed facts from `@mira/money` reach
  memory, and the server builds every line from them, rounded
  ([ADR-0003](docs/adr/0003-ledger-on-device-typed-lines-in-memory.md)). Names, labels and exact amounts
  stay on the device. Test data never goes to mainnet: tests and `npm run e2e` run in preview mode.
- **The agent can't act alone.** There's no model; recalled lines are parsed into typed facts and anything
  else is dropped (`parseLine`).
- **The repo stands on its own:** docs and code don't name or link other hackathon entries
  ([ADR-0005](docs/adr/0005-the-repo-stands-on-its-own.md)).
- **How to write code:** [docs/code-rules.md](docs/code-rules.md).

## Decisions → ADRs (required)

Any decision or change of direction gets an ADR in `docs/adr/`, in the **same commit** as the change:
architecture, scope, dependencies or vendors, deploy, workflow, naming and security.
- Copy `docs/adr/0000-template.md` to the next number, add the row to `docs/adr/README.md`, and update the
  docs it affects.
- Never rewrite an accepted ADR. Supersede it with a new one.

## Workflow

- **One `main`.** Before pushing, run:
  `git pull --rebase origin main && npm run typecheck && npm test && npm --prefix web run build && npm run docs:links && npm run e2e`.
- **Commit messages** start with the PRD's requirement IDs (`F1`…).
- **Never:**
  - commit secrets or `.env` values. The repo is public, so a pushed key is already leaked and must be
    rotated. `npm run secrets:history` scans every commit;
  - force-push;
  - deploy without the owner's go;
  - use a real person's wallet, account or money for tests. Use test keys.
- **`upstream`** is harrymove-ctrl/mira-imessage. Pull changes from it on purpose, not by habit.
