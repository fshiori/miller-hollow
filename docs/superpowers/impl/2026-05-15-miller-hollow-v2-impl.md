# Miller Hollow V2 Implementation Plan

Date: 2026-05-15

Source design: `docs/superpowers/specs/2026-05-15-miller-hollow-v2-design.md`

## Objective

Implement V2 as a public-play hardening release for the existing 8-player Miller Hollow game.

V2 should add spectator mode, stronger host controls, better invite flow, clearer UI states, reconnect/disconnect coverage, and production release traceability without adding new roles or changing the V1 rules preset.

## Implementation Principles

- Do not expand gameplay roles in V2.
- Keep hidden game state inside the Durable Object and engine.
- Keep spectators separate from player seats.
- Use short-lived single-use tickets for all WebSocket entry points.
- Treat host controls as room-lifecycle controls, not rule overrides.
- Add tests before relying on a public/private view or authorization boundary.
- Prefer redacted counters and event names over logs containing room snapshots.

## Current Baseline

V1 already provides:

- 8-player fixed preset.
- Player join/reconnect/start flow.
- Player WebSocket tickets.
- Public/private view filtering.
- Host diagnostics.
- Non-playing room reset.
- Basic rate limits.
- Remote smoke.
- Cloudflare Worker, Workers Static Assets, and Durable Object storage.

V2 should build on these surfaces rather than replacing them.

## Phase 1: Data Model and API Shape

Extend room state for spectator and host-control settings.

Suggested additions:

```ts
interface RoomState {
  settings: {
    playerCount: 8;
    presetId: "official_8_player_base_v1";
    spectatorsEnabled: boolean;
    locked: boolean;
  };
  spectatorTickets: Record<string, SpectatorTicket>;
}

interface SpectatorTicket {
  expiresAt: number;
}
```

API endpoints:

- `POST /api/rooms/:roomId/spectator-ticket`
- `GET /api/rooms/:roomId/spectator-socket`
- `POST /api/rooms/:roomId/host/lock`
- `POST /api/rooms/:roomId/host/unlock`
- `POST /api/rooms/:roomId/host/enable-spectators`
- `POST /api/rooms/:roomId/host/disable-spectators`
- `POST /api/rooms/:roomId/host/kick`
- `POST /api/rooms/:roomId/host/transfer`
- `POST /api/rooms/:roomId/host/reset-lobby`

Acceptance checks:

- Existing V1 player endpoints still work.
- Public room view includes only safe settings: locked and spectators enabled.
- Diagnostics includes active spectator count and safe settings.
- No new endpoint returns token hashes, socket tickets, full game state, or private views.

## Phase 2: Spectator Transport

Implement spectator ticket issuance and spectator WebSocket handling.

Durable Object responsibilities:

- Keep a `spectatorSessions = Map<WebSocket, SpectatorSession>`.
- Issue spectator tickets only when spectators are enabled.
- Prune expired spectator tickets.
- Consume spectator tickets on socket open.
- Send only `room_view` messages to spectator sockets.
- Broadcast public updates to both player sockets and spectator sockets.
- Disconnect spectators if the host disables spectators.

Suggested server messages:

- `room_view`
- `error`
- `pong`

Spectator client messages:

- `ping`

Acceptance checks:

- Spectator can connect to lobby.
- Spectator can remain connected through start and phase changes.
- Spectator never receives `private_view`.
- Spectator cannot send `start_game`, `night_action`, `vote`, or `day_chat`.
- Spectator sees role reveal only after endgame.
- Disabled spectator room rejects new spectator tickets.

## Phase 3: Host Controls

Implement host-only room lifecycle controls.

Host-control rules:

- All host-control POST bodies include `seatId` and `token`.
- Host auth uses existing token hash verification.
- Non-hosts receive `403`.
- Invalid tokens receive `403`.
- Playing games reject lobby-mutating controls with `409`.

Controls:

- Lock room: reject future joins while locked.
- Unlock room: allow joins while lobby has open seats.
- Enable spectators: allow spectator tickets.
- Disable spectators: reject new spectator tickets and close active spectator sockets.
- Kick lobby seat: clear nickname/token hash/connection state for a selected non-host seat before start.
- Transfer host: set `hostSeatId` to another occupied seat before start.
- Reset lobby: clear all non-host seats before start, or reset non-playing rooms to lobby.

Acceptance checks:

- Host can lock/unlock before start.
- Locked room rejects join with clear error.
- Host can kick non-host lobby seat.
- Host cannot kick while playing.
- Host can transfer host before start.
- Former host loses host-control access after transfer.
- Non-host cannot use any host-control endpoint.
- Host cannot inspect roles through any host-control response.

## Phase 4: Invite and Direct Navigation

Improve browser routing and sharing.

Routes:

- `/` create/join screen.
- `/room/:roomId` join screen with room id prefilled, or player room view if session matches.
- `/room/:roomId/watch` spectator view.

UI controls:

- Copy join link.
- Copy watch link.
- Display short room code.
- Offer Watch when a room is full or already started and spectators are enabled.

Acceptance checks:

- Opening `/room/:roomId` preloads the room id.
- Opening `/room/:roomId/watch` enters spectator flow.
- Copy buttons generate the expected URLs.
- A full or started room does not create a broken join flow.

## Phase 5: UI State Polish

Refine the public play surface.

Areas:

- Lobby seat grid/table with host, mine, connected, disconnected, open, and locked states.
- Room tools panel for host controls.
- Spectator mode header and read-only state.
- Phase-specific styling for night, discussion, vote, and endgame.
- Role card and action panel polish.
- Submitted/waiting state for current action.
- Dead player read-only state.
- Endgame reveal with all roles and winning team.

Acceptance checks:

- Lobby does not show empty timer controls.
- Player and spectator views are visually distinct.
- Endgame roles are readable on desktop and mobile.
- Buttons do not overflow on mobile.
- Host-only controls are not shown to non-hosts.

## Phase 6: Reconnect and Disconnect Verification

Improve and test connection behavior.

Implementation work:

- Keep player socket reconnect backoff bounded.
- Preserve player private view after refresh/reconnect.
- Show disconnected seats in lobby/game.
- Treat multiple sockets for the same player as connected while any remains open.
- Add browser smoke coverage for a player refresh and reconnect.

Acceptance checks:

- Refreshing one player restores the same seat and private view.
- Disconnecting one browser updates public connection state.
- Reconnecting clears stale error banners.
- Spectator reconnect requests a new spectator ticket and restores public view.

## Phase 7: Production Traceability

Improve deployment and remote verification.

Work:

- Add a deploy helper that passes `MILLER_HOLLOW_BUILD_SHA` from `git rev-parse --short HEAD`.
- Keep `/api/health` free of secrets and room state.
- Add `smoke:remote:quick` and `smoke:remote:full` scripts if full mode becomes longer.
- Update deployment docs with required Cloudflare surfaces and optional FlareGuard tag-setting permission.
- Keep `.env.local` ignored and secret-scan tracked files before deploy.

Acceptance checks:

- `/api/health` returns app version and build sha.
- Remote smoke passes against the deployed Worker.
- Deployment docs name the live endpoint and deployed version id.
- Secret scan passes after docs are updated.

## Phase 8: Test Matrix

Expand tests to cover the V2 surfaces.

Engine tests:

- No new engine behavior required unless submitted/waiting state needs derived helpers.

Worker/API smoke:

- Spectator ticket success/failure.
- Spectator socket public-only messages.
- Host lock/unlock authorization.
- Host kick/transfer authorization.
- Host spectator toggle.
- Diagnostics redaction.
- Reset behavior.

Browser smoke:

- Player create/join/start path still works.
- Spectator direct route works.
- Host controls update UI.
- One player refresh/reconnect path works.
- Desktop and mobile screenshot smoke for lobby and game.

Security regression checks:

- Public state has no `playerTokenHash`.
- Public state has no socket ticket data.
- Public state has no `privateView`.
- Spectator messages never include `private_view`.
- Diagnostics does not contain token strings, token hashes, or role assignments before endgame.

## Release Plan

Target version: `0.2.0`.

Recommended sequence:

1. Implement room state settings and host-control endpoint skeleton.
2. Add spectator ticket and WebSocket transport.
3. Add worker smoke tests for hidden-info and auth boundaries.
4. Add browser spectator route and host tools.
5. Polish lobby/game/endgame UI.
6. Add reconnect and responsive screenshot smoke.
7. Run full local gates.
8. Deploy to Cloudflare.
9. Run remote smoke.
10. Update deployment facts.
11. Commit and tag `v0.2.0`.

## Completion Gate

Before tagging V2, run:

```bash
npm run typecheck
npm test
npm run build
npm run smoke:v1
npm run smoke:browser
npm run smoke:remote
npm run secrets:check
npm run deploy:dry-run
```

After deploy, run:

```bash
npm run smoke:remote
```

V2 should not be considered complete until tests explicitly cover spectator hidden-info boundaries and host-control authorization.

