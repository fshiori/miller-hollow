# Miller Hollow

First playable V1 implementation for an 8-player online Werewolves of Miller's Hollow room on Cloudflare Workers and Durable Objects.

## Commands

- `npm run dev` starts Wrangler locally at `http://localhost:8787`.
- `npm run typecheck` runs TypeScript checks.
- `npm test` runs engine unit tests.
- `npm run build` builds the browser assets and typechecks the Worker.
- `npm run smoke:v1` starts Wrangler and exercises room capacity, reconnect tokens, invalid-token rejection, hidden-info filtering, WebSocket night actions, day chat, timer-driven vote start, and vote resolution.
- `npm run smoke:browser` starts Wrangler and drives 8 isolated Chromium browser contexts through create, join, start, night actions, day chat, timer-driven vote start, and voting.
- `npm run deploy:dry-run` validates the Worker bundle and Cloudflare configuration without publishing.

## V1 Scope

The playable preset is fixed to 8 players: 2 Werewolves, 1 Seer, 1 Witch, and 4 Ordinary Villagers.

Rooms use anonymous nicknames and browser-held reconnect tokens. The server stores token hashes, owns the hidden game state, and sends each browser only public room state plus that seat's private role/action view.

## Deployment Notes

`wrangler.toml` defines:

- Worker entry: `src/worker/index.ts`
- Static assets binding: `ASSETS` from `dist/client`
- Durable Object binding: `ROOMS`
- Durable Object class: `RoomObject`
- Default timer profile: `MILLER_HOLLOW_TIMER_PROFILE = "production"`

Before deploy, run:

```bash
npm ci
npm run typecheck
npm test
npm run build
npm run smoke:v1
npm run smoke:browser
npm run deploy:dry-run
```

Then deploy with:

```bash
npm run deploy
```

## Security Notes

- Full `GameState` remains server-side inside the Durable Object and engine.
- Public state endpoints omit role assignments before endgame and omit token hashes.
- `/private` and `/socket` require the browser-held reconnect token.
- Reconnect tokens are stored in the browser and only SHA-256 hashes are stored server-side.
- WebSockets use short-lived single-use socket tickets. Browsers exchange their reconnect token through `POST /api/rooms/:roomId/socket-ticket`, then open `/socket?ticket=...`.
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
