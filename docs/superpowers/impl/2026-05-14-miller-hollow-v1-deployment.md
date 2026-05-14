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

## Pre-Deploy Verification

Run from a clean checkout:

```bash
npm ci
npm run typecheck
npm test
npm run build
npm run smoke:v1
npm run smoke:browser
npm run deploy:dry-run
```

Expected results:

- TypeScript passes.
- Engine unit tests pass.
- Browser assets build into `dist/client`.
- API/WebSocket smoke passes.
- 8-context browser smoke passes.
- Wrangler dry-run completes without publishing.

## First Deploy

Deploy with:

```bash
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
- Logs should avoid dumping full room snapshots or raw game state.
- The default timer profile should remain `production` in `wrangler.toml`.

## Known Follow-Ups

- Add rate limiting for room creation and chat/action messages.
- Add redacted production observability around room count, active sockets, and phase transitions.
- Add a staging environment once a Cloudflare account/project naming convention exists.
