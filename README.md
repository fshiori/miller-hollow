# Miller Hollow

First playable V1 implementation for an 8-player online Werewolves of Miller's Hollow room on Cloudflare Workers and Durable Objects.

This is an unofficial fan implementation and is not affiliated with the original game publisher or rights holders.

## Commands

- `npm run dev` starts Wrangler locally at `http://localhost:8787`.
- `npm run typecheck` runs TypeScript checks.
- `npm test` runs engine unit tests.
- `npm run build` builds the browser assets and typechecks the Worker.
- `npm run smoke:v1` starts Wrangler and exercises room capacity, reconnect tokens, invalid-token rejection, hidden-info filtering, WebSocket night actions, day chat, timer-driven vote start, and vote resolution.
- `npm run smoke:browser` starts Wrangler and drives 8 isolated Chromium browser contexts through create, join, start, night actions, day chat, timer-driven vote start, and voting.
- `npm run smoke:remote` validates the deployed endpoint without waiting for production-length day timers. Override with `MILLER_HOLLOW_BASE_URL=https://example.workers.dev`.
- `npm run deploy:dry-run` validates the Worker bundle and Cloudflare configuration without publishing.
- `npm run secrets:check` scans tracked files for common accidentally committed secret patterns.

## V1 Scope

The playable preset is fixed to 8 players: 2 Werewolves, 1 Seer, 1 Witch, and 4 Ordinary Villagers.

Rooms use anonymous nicknames and browser-held reconnect tokens. The server stores token hashes, owns the hidden game state, and sends each browser only public room state plus that seat's private role/action view.

Hosts can copy a room link, inspect redacted room diagnostics, and reset an ended room for another game with the same seats.

## Deployment Notes

`wrangler.toml` defines:

- Worker entry: `src/worker/index.ts`
- Static assets binding: `ASSETS` from `dist/client`
- Durable Object binding: `ROOMS`
- Durable Object class: `RoomObject`
- Default timer profile: `MILLER_HOLLOW_TIMER_PROFILE = "production"`

V1 uses Cloudflare Workers, Workers Static Assets, and one SQLite-backed Durable Object class for room/game storage. It does not require D1, KV, R2, Queues, or a separate database service.

Before deploy, run:

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

Then deploy with:

```bash
npm run deploy
```

For local Cloudflare credentials, copy `.env.example` to `.env.local` and keep `.env.local` untracked. See `docs/superpowers/impl/2026-05-14-miller-hollow-v1-secrets.md`.

## Security Notes

- Full `GameState` remains server-side inside the Durable Object and engine.
- Public state endpoints omit role assignments before endgame and omit token hashes.
- `/private` and `/socket` require the browser-held reconnect token.
- Reconnect tokens are stored in the browser and only SHA-256 hashes are stored server-side.
- WebSockets use short-lived single-use socket tickets. Browsers exchange their reconnect token through `POST /api/rooms/:roomId/socket-ticket`, then open `/socket?ticket=...`.
- Host-only `/diagnostics` returns redacted operational counters such as occupied seats, connected seats, active sockets, pending socket tickets, phase, and timestamps.
- Worker logs use event names and counters only; they must not include reconnect tokens, token hashes, private views, or full room snapshots.
- Production code should avoid logging room snapshots or raw game state.

## Timer Profiles

Production defaults are configured through `MILLER_HOLLOW_TIMER_PROFILE = "production"`:

- Werewolves: 90 seconds
- Seer: 60 seconds
- Witch: 90 seconds
- Day discussion: 300 seconds
- Day vote: 90 seconds

Smoke scripts start Wrangler with `--var MILLER_HOLLOW_TIMER_PROFILE:smoke`:

- Werewolves: 45 seconds
- Seer: 35 seconds
- Witch: 45 seconds
- Day discussion: 20 seconds
- Day vote: 60 seconds
