# Miller Hollow

Basic Edition V7.1 implementation for 8-18 player online Werewolves of Miller's Hollow rooms on Astro, Cloudflare Workers, and Durable Objects.

The player-facing browser UI is Traditional Chinese. Public API fields, internal ids, and developer diagnostics remain English for compatibility.

This is an unofficial fan implementation and is not affiliated with the original game publisher or rights holders.

V6.1 keeps internal ids stable while aligning player-facing terminology and implemented rules with the official rulebook. The audit lives in `docs/superpowers/rules/2026-05-16-miller-hollow-official-rules-audit.md`. V6.2 focused on hosted game flow. V6.3 split AI demo pacing into visible host steps, V7 adds player-facing waiting states, phase timeline, rules quick reference, reconnect affordances, and mobile-oriented game layout refinements, and V7.1 makes official basic rooms the primary polished create-room path with official night order.

## Commands

- `npm run dev` starts Wrangler locally at `http://localhost:8787`.
- `npm run typecheck` runs TypeScript checks.
- `npm test` runs engine unit tests.
- `npm run build` builds the browser assets and typechecks the Worker.
- `npm run smoke:v1` starts Wrangler and exercises every official 8-18 player preset, official-basic endgame, app-basic compatibility presets, custom Thief/Cupid setup, V5 roleflow, room capacity, reconnect tokens, invalid-token rejection, hidden-info filtering, player-host observer rejection, dedicated-host observer access, dedicated-host AI test-player progression with split demo steps, Werewolf private chat/target readiness, Sheriff election, Hunter revenge, day readiness, WebSocket night actions, day chat, vote resolution, and public weighted vote reveal.
- `npm run smoke:browser` starts Wrangler and drives isolated Chromium browser contexts plus spectator views through create, join, watch, reconnect, V5 roleflow start, Seer action, Werewolf private chat/target readiness, Sheriff election, Hunter revenge, voting, weighted vote reveal, rules reference, phase timeline, waiting-state copy, Traditional Chinese UI assertions, player-host hidden-info console rejection, AI demo control isolation, and responsive screenshots including an 18-seat lobby.
- `npm run smoke:remote` validates the deployed endpoint without waiting for production-length day timers. Override with `MILLER_HOLLOW_BASE_URL=https://example.workers.dev` and `MILLER_HOLLOW_PRESET_ID=official_basic_18` or `official_roleflow_8`.
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

Internal ids intentionally remain stable for API compatibility. In player-facing Traditional Chinese, `villager` / Ordinary Townsfolk is shown as `普通村民`, `seer` / Fortune Teller as `預言家`, and `sheriff` / Captain as `警長`.

The V5 roleflow preset is available separately while the beginner presets remain stable:

- `official_roleflow_8`: 2 Werewolves, 1 Fortune Teller, 1 Hunter, 4 Ordinary Townsfolk.

Official beginner and roleflow rooms use the official-style night order: Fortune Teller first, then Werewolves, then Witch if a future roleflow preset includes Witch. Werewolf timeout or host fast-forward without a selected target produces no Werewolf victim for official beginner and roleflow rooms.

Hosts can also create a custom roleflow room before the lobby opens. Custom roleflow supports the currently implemented role cards: Werewolf, Fortune Teller, Witch, Hunter, Thief, Cupid, and Ordinary Townsfolk, with Sheriff as a public-office toggle. The custom setup is locked after room creation. Werewolf and Fortune Teller counts must match the rulebook recommendation for the selected player count; the browser warns before submit and the Worker rejects invalid setup. If Thief is enabled, the system adds two extra Ordinary Townsfolk cards to the deck, deals player-count cards, and leaves the two undealt cards as the hidden Thief choice. If both undealt cards are Werewolves, Thief must choose Werewolf. If Cupid is enabled, Cupid acts after Thief resolution and selects two distinct Lovers before the normal first night; Lovers privately see each other, die together through heartbreak, and cross-team Lovers can win together as the final two living players.

Rooms use anonymous nicknames and browser-held reconnect tokens. The server stores token hashes, owns the hidden game state, and sends each browser only public room state plus that seat's private role/action view.

Rooms have an explicit trust mode. The default `player_host` mode makes the room creator a normal player-host: they occupy a player seat, can administer the room, and cannot view hidden information. The opt-in `dedicated_host` mode creates a non-player host with a separate host token; that host can administer the room and open a clearly labeled hidden-information console.

Player-hosts can copy player and spectator links, lock the lobby, toggle spectator access, kick lobby seats, transfer host, inspect redacted room diagnostics, open Sheriff election during day discussion, fast-forward phases, and reset non-playing rooms. Players mark ready before the host can start. Dedicated hosts can use the same administration controls, but do not occupy a player seat and cannot transfer hosting to a player.

Dedicated hosts may fill empty lobby seats with AI test players and trigger paced AI demo steps during a game. AI players are a testing/demo tool: host controls separate AI night actions, public day chat, day readiness, voting, reactions, and 5-second auto-step. AI demo controls are hidden from player-host rooms and do not expose hidden state through player-host or spectator views.

Player rooms include a waiting-state panel, public phase timeline, and compact room rules reference so players can see what the room is waiting for, what setup is active, and what public phase comes next without leaving the game.

Spectators can watch from `/room/:roomId/watch` without occupying a player seat. Spectator sockets receive public room views only and never receive player private views.

Dedicated hosts can open `/room/:roomId/host-watch` from the host browser session for a read-only `主持後台` view that reveals roles, Werewolf chat, proposed targets, readiness, and vote details for moderation and demos. Player-host rooms reject this path. Host console access uses short-lived tickets and does not expose reconnect tokens or ticket hashes.

Live vote maps are visible only in host observer mode while voting is active. After a day vote resolves, players and spectators receive the resolved vote result showing each voter, target, vote weight, weighted tally, tie state, and execution result.

During day discussion, living players can mark themselves ready to vote. When all living players are ready, the room advances to voting. Public views show ready counts and day-ready ids; those fields are public coordination state, not hidden role data.

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
- Host controls are token-authenticated and do not expose role assignments or private state in player-host rooms.
- Hidden-information host console APIs require `dedicated_host` mode and the dedicated host token. Player-host rooms cannot mint observer tickets, read observer state, or open observer sockets.
- Worker logs use event names and counters only; they must not include reconnect tokens, token hashes, private views, or full room snapshots.
- Production code should avoid logging room snapshots or raw game state.

## Timer Profiles

Production defaults are configured through `MILLER_HOLLOW_TIMER_PROFILE = "production"`:

- Werewolves: 90 seconds
- Cupid: 60 seconds
- Seer: 60 seconds
- Witch: 90 seconds
- Day discussion: 300 seconds
- Day vote: 90 seconds

Smoke scripts start Wrangler with `--var MILLER_HOLLOW_TIMER_PROFILE:smoke`:

- Werewolves: 45 seconds
- Cupid: 30 seconds
- Seer: 35 seconds
- Witch: 45 seconds
- Day discussion: 20 seconds
- Day vote: 60 seconds
