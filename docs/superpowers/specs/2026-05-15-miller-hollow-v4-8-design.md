# Miller Hollow V4.8 Design

Date: 2026-05-15

Sources:

- V4.7 design: `docs/superpowers/specs/2026-05-15-miller-hollow-v4-7-design.md`
- View contract: `docs/superpowers/rules/2026-05-15-miller-hollow-view-contract.md`
- Hidden information matrix: `docs/superpowers/rules/2026-05-15-miller-hollow-hidden-info-matrix.md`

## Goal

V4.8 should add a host-authenticated observer mode for demos, debugging, and hosted games.

The existing public spectator mode must stay public-safe. It should not show roles, Werewolf chat, proposed targets, or private action state before endgame.

V4.8 introduces a separate privileged view that is only available to the room host:

- all player roles
- all private phase context
- Werewolf night chat
- Werewolf proposed target and confirmations
- day readiness state
- vote submissions
- phase timeline

## Why This Is V4.8

V4.7 intentionally kept Werewolf chat hidden from ordinary spectators. That is correct for real gameplay, but it makes demos hard:

- The person presenting cannot see why Werewolves are waiting.
- Public spectators cannot verify hidden interactions.
- Testing live rooms requires reading local scripts or API output.
- Hosted games need a moderator-like screen that can inspect the full table without joining as a player.

This is a small version because it does not change core rules. It adds a privileged viewing surface and API contract around information that already exists.

## Version Boundaries

### V4.8: Host Observer Mode

V4.8 should ship:

- A host-authenticated observer route.
- A host-only observer ticket API.
- A host observer WebSocket.
- A host observer room view that includes hidden game state.
- UI sections for all roles, Werewolf chat, proposed target, readiness, and votes.
- Clear visual distinction between public spectator and host observer modes.
- Smoke coverage proving public spectators still do not receive hidden data.

### Not V4.8

- No public replay archive.
- No permanent admin account.
- No cross-room admin dashboard.
- No new roles.
- No persistent audit database.
- No player impersonation controls.
- No ability for host observer to submit player actions.

## Product Model

V4.8 has three viewing modes:

1. Player view
   - Authenticated by seat token.
   - Shows own private role/action state.
   - Allows player actions.

2. Public spectator view
   - Authenticated by short-lived spectator ticket.
   - Shows public room view only.
   - Cannot act.
   - Must not reveal hidden information.

3. Host observer view
   - Authenticated by host seat token, exchanged for short-lived observer ticket.
   - Shows a privileged observer room view.
   - Cannot submit player actions.
   - May use existing host room controls if the UI intentionally includes them, but V4.8 should start read-only except for navigation/copy affordances.

## Route Model

Preferred route:

```txt
/room/:roomId/host-watch
```

The route should require the host's existing browser session for the same room. If no valid host session exists, show a concise Traditional Chinese message and a link back to the normal room page.

Alternative route names rejected:

- `/watch-host`: less clear that this is privileged.
- `/debug/watch`: sounds internal and may encourage exposing it accidentally.
- `/admin`: implies global admin, which does not exist.

## API Model

New room APIs:

```txt
POST /api/rooms/:roomId/observer-ticket
GET  /api/rooms/:roomId/observer-socket?ticket=...
GET  /api/rooms/:roomId/observer-state?seatId=...&token=...
```

`observer-ticket`:

- Requires host `seatId` and `token`.
- Returns a short-lived single-use observer ticket.
- Uses the same hashing pattern as socket and spectator tickets.
- Is rate limited.

`observer-socket`:

- Accepts only valid observer tickets.
- Sends `observer_view` messages.
- Rejects action messages.
- Does not send `private_view` messages.

`observer-state`:

- Requires host `seatId` and `token`.
- Useful for browser refresh and smoke assertions.
- Returns the same observer payload as the socket.

## Observer View Contract

Observer view may include:

- Public room fields.
- Full role list for every player.
- Full alive/dead state.
- Current phase, round, winner, and public events.
- Current Werewolf chat messages.
- Current Werewolf proposed target.
- Werewolf ready seat ids.
- Day ready seat ids.
- Current vote map during `day_vote`.
- Seer results.
- Witch potion state for app-basic rooms.
- Current night action summary.

Observer view must not include:

- Player reconnect tokens.
- Player token hashes.
- Socket ticket hashes.
- Spectator ticket hashes.
- Observer ticket hashes.
- Durable Object storage internals.
- Rate-limit bucket data.

The observer view can reveal hidden gameplay information, but it must not reveal authentication secrets.

## UI Requirements

Host observer UI should be built for scanning rather than playing.

Top area:

- Room id.
- Current phase.
- Timer.
- Host observer badge: `主持觀戰`.
- Link back to player room.
- Public watch link copy button.

Main sections:

- Player table with nickname, seat id, role, alive/dead, connection status.
- Current phase hidden context:
  - Werewolf night: Werewolf chat, proposed target, confirmations.
  - Seer night: Seer identity and submitted status.
  - Witch night: victim, save/poison availability, submitted status.
  - Day discussion: day ready list/count.
  - Day vote: vote map, missing voters, current tally.
- Public timeline.
- Day chat.

Display language:

- All UI copy must be Traditional Chinese.
- Hidden-information labels should be explicit, for example `隱藏資訊` and `主持人可見`.

## Security Requirements

The host observer mode is privileged and must not weaken public spectator mode.

Rules:

- Only current room host may create observer tickets.
- Observer tickets are short-lived and single-use.
- Observer socket cannot act as a player.
- Observer socket cannot use host controls directly.
- Host transfer immediately means only the new host can mint new observer tickets.
- Existing observer sockets may remain connected until closed or may be disconnected on host transfer. V4.8 should choose the safer behavior: disconnect observer sockets on host transfer.
- Resetting to lobby should clear observer tickets.

Public spectator regression requirements:

- Public spectator never receives `observer_view`.
- Public spectator never receives roles before endgame.
- Public spectator never receives Werewolf chat.
- Public spectator never receives vote map.

## Host Transfer Behavior

When host transfers:

- Existing observer tickets should be cleared.
- Existing observer sockets should be closed with a localized error such as `主持權已轉移，主持觀戰已中止。`
- New host can open host observer from their session.

This avoids a stale host keeping privileged visibility after transfer.

## Vote Visibility

V4.8 should expose vote state only to host observer.

Host observer should see:

- Who voted.
- Their selected target or abstain.
- Missing voters.
- Current tally.

Public view should continue to show aggregate phase status only.

## Werewolf Chat Visibility

Host observer should see Werewolf chat for the current Werewolf phase.

This is for moderation/demo only. Public spectator and non-Werewolf private views must continue to hide it.

V4.8 should not add endgame replay of Werewolf chat. That can be a later design decision.

## Testing Requirements

API / WebSocket smoke:

- Host can mint observer ticket.
- Non-host cannot mint observer ticket.
- Observer socket receives `observer_view`.
- Observer view includes roles before endgame.
- Observer view includes Werewolf chat after a Werewolf sends it.
- Observer view includes vote map during day vote.
- Observer socket rejects player actions.
- Public spectator still does not receive hidden fields.

Browser smoke:

- Host can open `/host-watch` from an active host session.
- Host observer page shows `主持觀戰`.
- Host observer page shows roles before endgame.
- Public spectator page still does not show roles before endgame.
- Host observer page follows latest chat/timeline entries.

## Release Criteria

V4.8 is complete when:

- Host observer route works from the host browser session.
- Observer socket/state API requires host auth.
- Observer view reveals gameplay-hidden information but no auth secrets.
- Public spectator hidden-information boundaries still pass smoke tests.
- Traditional Chinese UI copy is complete.
- `npm run typecheck`, `npm test`, `npm run build`, local smoke, browser smoke, secret scan, dry-run deploy, deploy, and remote smoke pass.
