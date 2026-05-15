# Miller Hollow V2 Design

Date: 2026-05-15

## Goal

Turn the V1 playable 8-player room into a public-play experience that is safe to share, easier to host, and easier to watch without compromising hidden information.

V2 keeps the V1 fixed 8-player preset and rules engine scope. The main product additions are spectator mode, stronger host controls, better invite flow, clearer game state presentation, and production-quality verification around public/private information boundaries.

## Non-Goals

- No new roles in V2.
- No custom role setup in V2.
- No custom player counts in V2.
- No AI players in V2.
- No voice, video, or account system in V2.
- No human moderator override for game rules in V2.
- No spectator access to private roles before endgame.

## V2 Product Scope

V2 should make a room shareable beyond the 8 players:

- Players can join an 8-seat game by nickname.
- Non-players can watch a room without occupying a seat.
- The host can manage lobby readiness and basic room safety.
- The UI makes lobby, night, day, vote, endgame, and spectator states visually clear.
- Reconnect and disconnect states are visible and recoverable.
- Automated tests cover spectator hidden-info boundaries and host-control authorization.

The rules engine remains V1-compatible. V2 should not expand the official role catalog into gameplay until spectator, host, and UI foundations are stable.

## Core User Stories

### Host

As a host, I can create a room, share player and spectator links, see seat/connection status, control lobby safety, and reset a finished game without creating a new room.

Host controls:

- Copy player join link.
- Copy spectator watch link.
- Lock or unlock the room before start.
- Enable or disable spectators before start.
- Kick lobby seats before start.
- Transfer host before start.
- Reset a non-playing room.
- View redacted diagnostics.

The host must not be able to inspect hidden roles, force deaths, change votes, skip phases, or override rules.

### Player

As a player, I can join a seat, reconnect to my seat, receive only my private role/action view, and play through the game without seeing hidden information that does not belong to me.

Player improvements:

- Clearer room code and join link.
- Clearer "waiting for players" lobby state.
- Action status that shows whether my current phase action is needed or submitted.
- Better disconnect/reconnect messaging.
- Endgame reveal with all roles and summary.

### Spectator

As a spectator, I can watch a room without taking a seat and without receiving private player information.

Spectator properties:

- Spectators do not receive reconnect tokens for player seats.
- Spectators do not receive `private_view`.
- Spectators see the same public state as players.
- Spectators see roles only after endgame, matching public view rules.
- Spectator WebSockets use short-lived tickets.
- Host diagnostics include active spectator count, but public room state does not expose spectator identity.

## Information Boundaries

V2 must preserve and extend V1's hidden-information boundaries.

Public room view may include:

- Room id
- Room status
- Host seat id
- Seat nicknames and connection statuses
- Public game phase, round, alive/dead status
- Public events
- Chat messages allowed by current rules
- Endgame role reveal after the engine marks the game ended
- Spectator enabled/disabled setting
- Room locked/unlocked setting

Public room view must not include:

- Reconnect tokens
- Token hashes
- Socket ticket values or hashes
- Full `GameState`
- Private player views
- Seer results before they are public
- Witch potion state
- Werewolf teammate private channel data beyond what public rules allow
- Roles before endgame

Host diagnostics may include:

- Occupied seat count
- Connected seat count
- Active player sockets
- Active spectator sockets
- Pending socket ticket count
- Current public phase and deadline
- Room lock/spectator settings
- Created and updated timestamps

Host diagnostics must not include:

- Reconnect tokens or token hashes
- Socket ticket values
- Private player views
- Full hidden game state
- Role assignments before endgame

## Spectator Mode

V2 introduces spectator sessions as separate from player seats.

Spectator lifecycle:

1. User opens `/room/:roomId/watch` or clicks Watch from `/room/:roomId`.
2. Browser requests `POST /api/rooms/:roomId/spectator-ticket`.
3. Durable Object returns a short-lived single-use ticket if spectators are enabled.
4. Browser opens `/api/rooms/:roomId/spectator-socket?ticket=...`.
5. Durable Object sends only `room_view` public updates.
6. Spectator reconnects by requesting a new spectator ticket.

Spectators should not persist durable identity in V2. They can reconnect as anonymous watchers, but the system should not guarantee a stable spectator id across refreshes.

If spectators are disabled:

- Existing spectators should be disconnected with an error message.
- New spectator tickets should be rejected.
- Public UI should show that watching is disabled.

## Host Controls

V2 host controls are lobby-safe and rules-safe.

Allowed before game start:

- Lock room joins.
- Unlock room joins.
- Enable spectators.
- Disable spectators.
- Kick an occupied lobby seat.
- Transfer host to another occupied lobby seat.
- Reset lobby seats.

Allowed after game end:

- Reset room back to lobby with the same occupied seats.
- Copy links.
- View diagnostics.

Disallowed while playing:

- Kick player.
- Transfer host.
- Lock/unlock in a way that changes current players.
- Reset room.
- Inspect roles.
- Force phase transitions.
- Override votes or night actions.

## Invite Flow

V2 should make room sharing explicit:

- `/room/:roomId` opens the join screen with the room id prefilled.
- `/room/:roomId/watch` opens spectator mode.
- Host Room Tools expose copy join link and copy watch link.
- Lobby shows a short room code and full room id.
- If a room is full or already started, the join screen should offer watching if spectators are enabled.

## UI Direction

V2 should keep the application utilitarian but more game-like and polished.

Important UI states:

- Empty create/join screen.
- Join screen with room id from URL.
- Lobby as an 8-seat table or compact seat grid.
- Host tools as a restrained operational panel.
- Spectator view with clear "Watching" identity.
- Night phase with role-specific action state.
- Day discussion with living-player chat affordance.
- Day vote with clear submitted/waiting state.
- Dead player view.
- Endgame reveal with all roles and winning team.

The UI should not rely on instructional walls of text. It should present state, controls, and labels clearly in the working surface.

## Production Operations

V2 should improve release traceability:

- `MILLER_HOLLOW_BUILD_SHA` should be populated during deploy when available.
- `/api/health` should report app version, build sha, storage type, and timer profile.
- Remote smoke should support quick and full modes.
- Structured logs should stay redacted and event-based.
- Deployment docs should distinguish required Cloudflare services from optional dashboard niceties.

V2 still does not require D1, KV, R2, Queues, Workers AI, or Analytics Engine. Durable Object storage remains the room database.

## Acceptance Criteria

V2 is complete when:

- Spectators can watch a room without occupying a seat.
- Spectator WebSockets receive only public room views.
- Spectator tests prove hidden roles/private views/tokens are not exposed.
- Host can lock room, toggle spectators, kick lobby seats, transfer host, copy links, reset non-playing room, and view redacted diagnostics.
- Host-control tests prove non-hosts cannot perform host actions.
- Room links and watch links work from direct navigation.
- UI clearly distinguishes lobby, player, spectator, dead-player, and endgame states.
- Disconnect/reconnect browser smoke covers at least one player refresh/reconnect.
- Responsive screenshot smoke covers desktop and mobile lobby/game views.
- `npm run typecheck`, `npm test`, `npm run build`, local smoke, browser smoke, remote smoke, and secret scan pass.

