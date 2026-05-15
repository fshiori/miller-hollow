# Miller Hollow

Basic Edition V4.8 implementation for 8-18 player online Werewolves of Miller's Hollow rooms on Astro, Cloudflare Workers, and Durable Objects.

The player-facing browser UI is Traditional Chinese. Public API fields, internal ids, and developer diagnostics remain English for compatibility.

This is an unofficial fan implementation and is not affiliated with the original game publisher or rights holders.

## Commands

- `npm run dev` starts Wrangler locally at `http://localhost:8787`.
- `npm run typecheck` runs TypeScript checks.
- `npm test` runs engine unit tests.
- `npm run build` builds the browser assets and typechecks the Worker.
- `npm run smoke:v1` starts Wrangler and exercises every official 8-18 player preset, app-basic compatibility presets, room capacity, reconnect tokens, invalid-token rejection, hidden-info filtering, host observer access, Werewolf private chat/target readiness, day readiness, WebSocket night actions, day chat, and vote resolution.
- `npm run smoke:browser` starts Wrangler and drives isolated Chromium browser contexts plus spectator and host-observer views through create, join, watch, reconnect, start, Werewolf private chat/target readiness, day readiness, voting, Traditional Chinese UI assertions, and responsive screenshots including an 18-seat lobby.
- `npm run smoke:remote` validates the deployed endpoint without waiting for production-length day timers. Override with `MILLER_HOLLOW_BASE_URL=https://example.workers.dev` and `MILLER_HOLLOW_PRESET_ID=official_basic_18`.
- `npm run deploy:versioned` deploys with `MILLER_HOLLOW_BUILD_SHA` set from the current git commit.
- `npm run deploy:dry-run` validates the Worker bundle and Cloudflare configuration without publishing.
- `npm run secrets:check` scans tracked files for common accidentally committed secret patterns.

## Basic Edition Scope

The official beginner presets are:

- `official_basic_8`: 2 Werewolves, 1 Fortune Teller, 5 Ordinary Townsfolk.
- `official_basic_9`: 2 Werewolves, 1 Fortune Teller, 6 Ordinary Townsfolk.
- `official_basic_10`: 2 Werewolves, 1 Fortune Teller, 7 Ordinary Townsfolk.
- `official_basic_11`: 2 Werewolves, 1 Fortune Teller, 8 Ordinary Townsfolk.
- `official_basic_12`: 3 Werewolves, 1 Fortune Teller, 8 Ordinary Townsfolk.
- `official_basic_13`: 3 Werewolves, 1 Fortune Teller, 9 Ordinary Townsfolk.
- `official_basic_14`: 3 Werewolves, 1 Fortune Teller, 10 Ordinary Townsfolk.
- `official_basic_15`: 3 Werewolves, 1 Fortune Teller, 11 Ordinary Townsfolk.
- `official_basic_16`: 3 Werewolves, 1 Fortune Teller, 12 Ordinary Townsfolk.
- `official_basic_17`: 3 Werewolves, 1 Fortune Teller, 13 Ordinary Townsfolk.
- `official_basic_18`: 4 Werewolves, 1 Fortune Teller, 13 Ordinary Townsfolk.

The app-basic compatibility presets remain available through the engine/API for existing rooms and regression coverage, but the main create-room UI uses the official 8-18 player flow:

- `app_basic_8`: 2 Werewolves, 1 Seer, 1 Witch, 4 Ordinary Villagers.
- `app_basic_9`: 2 Werewolves, 1 Seer, 1 Witch, 5 Ordinary Villagers.
- `app_basic_10`: 2 Werewolves, 1 Seer, 1 Witch, 6 Ordinary Villagers.
- `app_basic_11`: 3 Werewolves, 1 Seer, 1 Witch, 6 Ordinary Villagers.
- `app_basic_12`: 3 Werewolves, 1 Seer, 1 Witch, 7 Ordinary Villagers.

Legacy `basic_8` through `basic_12` ids remain accepted as aliases for the app-basic presets.

Rooms use anonymous nicknames and browser-held reconnect tokens. The server stores token hashes, owns the hidden game state, and sends each browser only public room state plus that seat's private role/action view.

Hosts can copy player and spectator links, lock the lobby, toggle spectator access, kick lobby seats, transfer host, inspect redacted room diagnostics, and reset non-playing rooms. Players mark ready before the host can start.

Spectators can watch from `/room/:roomId/watch` without occupying a player seat. Spectator sockets receive public room views only and never receive player private views.

Hosts can open `/room/:roomId/host-watch` from the host browser session for a read-only observer view that reveals roles, Werewolf chat, proposed targets, readiness, and vote details for moderation and demos. Host observer access uses short-lived tickets and does not expose reconnect tokens or ticket hashes.

Endgame views reveal winner, player roles, and the public timeline only after the game ends.

## Deployment Notes

`wrangler.toml` defines:

- Worker entry: `src/worker/index.ts`
- Static assets binding: `ASSETS` from `dist/client`
- Durable Object binding: `ROOMS`
- Durable Object class: `RoomObject`
- Default timer profile: `MILLER_HOLLOW_TIMER_PROFILE = "production"`

Miller Hollow uses Cloudflare Workers, Workers Static Assets, and one SQLite-backed Durable Object class for room/game storage. It does not require D1, KV, R2, Queues, or a separate database service.

The frontend is an Astro static shell with a client-side TypeScript app. The Worker serves the generated static assets and owns all API, WebSocket, and Durable Object routes.

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
- Spectator WebSockets use short-lived single-use tickets and receive only public room state.
- Host controls are token-authenticated and do not expose role assignments or private state.
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
