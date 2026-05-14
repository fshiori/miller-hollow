# Contributing

Miller Hollow is an open-source, unofficial hidden-role game implementation built for Cloudflare Workers and Durable Objects.

## Local Setup

```bash
npm ci
npm run dev
```

Keep local credentials in `.env.local` or `.dev.vars`; both are ignored by git. Do not commit proxy keys, API tokens, reconnect tokens, room snapshots, or player private views.

## Verification

Run the focused checks before opening a pull request:

```bash
npm run typecheck
npm test
npm run build
npm run smoke:v1
npm run smoke:browser
npm run secrets:check
npm run deploy:dry-run
```

`npm run smoke:remote` is intended for maintainers with access to the deployed Worker endpoint.

## Rule Changes

Rule behavior should be documented in `docs/superpowers/rules/` and covered by engine tests. Keep hidden information server-side and add tests for public/private view boundaries whenever changing roles, phases, actions, or win conditions.

## Cloudflare Surface

V1 uses Workers, Workers Static Assets, and one SQLite-backed Durable Object class. Do not add D1, KV, R2, Queues, or additional account-level permissions without documenting why they are required.
