# Miller Hollow V1 Deployment Checklist

Date: 2026-05-14

## Cloudflare Configuration

`wrangler.toml` defines the V1 deployment surface:

- Worker name: `miller-hollow`
- Worker entry: `src/worker/index.ts`
- Compatibility date: `2026-05-14`
- Static assets directory: `dist/client`
- Static assets binding: `ASSETS`
- Durable Object binding: `ROOMS`
- Durable Object class: `RoomObject`
- Migration tag: `v1`
- Durable Object migration: `new_sqlite_classes = ["RoomObject"]`
- Timer profile var: `MILLER_HOLLOW_TIMER_PROFILE = "production"`

V1 does not need D1, KV, R2, Queues, Workers AI, Analytics Engine, or a separate database. Room state, hidden game state, reconnect token hashes, socket tickets, chat, and timers are stored inside the SQLite-backed `RoomObject` Durable Object.

## Live Endpoint

- Public endpoint: `https://miller-hollow.fshiori.workers.dev`
- Health endpoint: `https://miller-hollow.fshiori.workers.dev/api/health`
- V1 deployed version ID: `54953d1f-0454-48c2-bde9-17fc6d76539b`
- Verified on: 2026-05-14

## Pre-Deploy Verification

Run from a clean checkout:

```bash
npm ci
npm run typecheck
npm test
npm run build
npm run smoke:v1
npm run smoke:browser
npm run smoke:remote
npm run secrets:check
npm run deploy:dry-run
```

Expected results:

- TypeScript passes.
- Engine unit tests pass.
- Browser assets build into `dist/client`.
- API/WebSocket smoke passes.
- 8-context browser smoke passes.
- Remote smoke passes against the deployed Worker.
- Secret scan reports no obvious secrets in tracked files.
- Wrangler dry-run completes without publishing.

## First Deploy

Deploy with:

```bash
npm run deploy
```

If you keep Cloudflare credentials in local ignored files, load them before deploy:

```bash
set -a
source .env.local
set +a
npm run deploy
```

The first deploy applies Durable Object migration tag `v1` and creates the `RoomObject` SQLite-backed Durable Object class.

## Rollback Notes

- Do not remove or rename the `RoomObject` Durable Object class in a rollback unless a matching Cloudflare migration is prepared.
- Avoid changing the `ROOMS` binding name after rooms exist.
- Static asset rollback is safe if the Worker API contract remains compatible with the deployed UI.

## Production Safety Checks

- Public room state must not include `playerTokenHash`, `socketTickets`, private views, or hidden roles before endgame.
- WebSockets must use short-lived single-use socket tickets, not reconnect tokens.
- `/api/health` must avoid room state, tokens, account secrets, and player-specific data.
- Room creation, socket-ticket creation, socket actions, and day chat have basic per-isolate/per-room rate limits.
- Logs should avoid dumping full room snapshots or raw game state.
- The default timer profile should remain `production` in `wrangler.toml`.

## FlareGuard Permission Surface

The deploy proxy needs only the endpoints Wrangler uses to upload and publish this Worker:

- Read account metadata for account `4fae982a30d8f623b835b46bba03e72c`.
- Create/update the Worker script `miller-hollow`.
- Upload Workers Static Assets for the script.
- Apply Durable Object migrations for `RoomObject`.
- Read deployment/version information after publish.

Wrangler may also attempt `PATCH /accounts/:account_id/workers/scripts/:script_name/script-settings` to apply service/environment tags. That failure has been non-blocking for this project; grant it only if FlareGuard wants the deploy output completely warning-free.

## Known Follow-Ups

- Add redacted production observability around room count, active sockets, and phase transitions.
- Add a staging environment once a Cloudflare account/project naming convention exists.
