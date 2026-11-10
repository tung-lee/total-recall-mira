# ADR-0008: The web app on Vercel, the API on Railway

- **Status:** Accepted
- **Date:** 2026-11-03
- **Deciders:** Hien ("FE deploy vercel, còn lại railway cá nhân của tôi")
- **Supersedes:** the deploy bullet of ADR-0007 (Railway served both)

## Context

- The owner wants the frontend on Vercel and everything else on their personal Railway account.
- The web app calls `/api/*` on its own origin, and the keys (Walrus Memory, Tatum, the operator) must stay
  on the server.
- The web build imports `@mira/money` from `packages/money`, outside `web/`.

## Decision

- **Vercel serves the web app** (team `hien-ps-projects`, project `mira`, https://mira-flax.vercel.app).
  `vercel.json` at the repo root installs and builds `web/` and publishes `web/dist`.
- **Vercel rewrites `/api/*` to the Railway API**, so the browser stays on one origin: no CORS, no API URL
  in the bundle, no keys on Vercel.
- **`.vercelignore` uploads only** `web/`, `packages/`, `vercel.json` and `tsconfig.base.json`; `.env` and
  everything else stay local.
- **Railway runs the API only** (project `mira` in the owner's account). The root script that built the
  web app is renamed `build:web`, so Railpack has nothing to build; the server answers non-API paths with
  a pointer to Vercel.

## Consequences

- Every API call takes one extra hop through Vercel's edge; measured recall stays under 2 s.
- A new Railway URL means editing the rewrite in `vercel.json` and redeploying Vercel.
- Deploys are two commands: `vercel deploy --prod` from the repo root and `railway up --service mira`.

## Links

[ADR-0007](0007-shared-memory-account-and-tatum-key.md) · [ADR-0006](0006-typescript-server-and-preview-mode.md)
