# Miller Hollow V3 Design

Date: 2026-05-15

## Goal

Complete the basic 8-player edition before expanding rules content.

V3 is not a role-expansion release. It should turn the existing V2 public-play room into a complete, polished, maintainable basic edition: stronger lobby flow, complete action-state feedback, endgame reveal and replay, better host and spectator experience, clearer reconnect behavior, componentized UI, and formal public/private view contracts.

## Version Boundaries

### V3: Basic Edition Complete

V3 keeps the current gameplay scope:

- 8 players exactly.
- Current basic roles only:
  - 2 Werewolves
  - 1 Seer
  - 1 Witch
  - 4 Ordinary Villagers
- No new roles.
- No new player counts.
- No custom role setup.

V3 focuses on completeness, clarity, maintainability, and verification.

### V3.5: Multi-Count Basic Presets

V3.5 should add multiple player counts while still using only the basic role set.

Target basic presets:

- 8-player classic: 2 Werewolves, 1 Seer, 1 Witch, 4 Villagers.
- 9-player basic: 2 Werewolves, 1 Seer, 1 Witch, 5 Villagers.
- 10-player basic: 2 Werewolves, 1 Seer, 1 Witch, 6 Villagers.
- 11-player basic: 3 Werewolves, 1 Seer, 1 Witch, 6 Villagers.
- 12-player basic: 3 Werewolves, 1 Seer, 1 Witch, 7 Villagers.

V3.5 should validate dynamic seats, dynamic role assignment, host preset selection, responsive seat layout, and smoke coverage for each supported count.

### V4: New Roles

V4 should introduce new official roles after V3 and V3.5 prove that the base product, preset system, and UI action framework are stable.

Potential V4 roles:

- Hunter
- Captain / Sheriff
- Cupid
- Thief
- Little Girl only after a dedicated online-safety design pass

## Non-Goals

- No new roles in V3.
- No new player counts in V3.
- No custom presets in V3.
- No accounts, matchmaking, ranking, or public room directory in V3.
- No manual moderator override in V3.
- No voice/video chat in V3.

## Product Scope

V3 should make the current 8-player basic edition feel finished.

Primary areas:

- Astro UI componentization.
- Formal lobby readiness.
- Complete phase/action state.
- Endgame reveal and replay.
- Host and spectator workflow completion.
- Reconnect/disconnect polish.
- Rules and security documentation.
- Broader regression verification.

## User Stories

### Host

As a host, I can create a room, configure basic room safety, see player readiness and connection status, share join/watch links, start only when the room is valid, reset a finished game, and understand what the room is waiting for.

Host should see:

- Seat occupancy.
- Ready/unready state.
- Connected/disconnected state.
- Room locked/unlocked state.
- Spectator enabled/disabled state.
- Start eligibility.
- Clear reason if start is blocked.
- Redacted diagnostics.

Host should not see:

- Hidden roles before endgame.
- Seer results.
- Witch potion state.
- Reconnect tokens, token hashes, or socket tickets.

### Player

As a player, I can join, mark ready, understand the current phase, see whether I need to act, see whether my action was submitted, reconnect cleanly, and review the game after it ends.

Player should see:

- My seat and host status.
- My role after start.
- My legal action for the current phase.
- Submitted/waiting status for my action.
- Reason I cannot act, if applicable.
- Public event timeline.
- Endgame reveal and replay.

### Spectator

As a spectator, I can watch the public state without occupying a seat or receiving private information. The spectator view should look intentionally read-only, not like a broken player view.

Spectator should see:

- Public room state.
- Seat occupancy and alive/dead status.
- Current public phase.
- Public chat and public events.
- Endgame reveal and replay.

Spectator should not see:

- Any `private_view`.
- Any private role before endgame.
- Reconnect tokens or token hashes.
- Player action controls.

## UI Architecture

V3 should move from one large client-rendered template toward explicit UI modules.

Astro should own the static shell, routes, and component structure. Client TypeScript should own session state, WebSocket connections, and API actions.

Target structure:

```text
src/
  components/
    AuthPanel.astro
    RoomHeader.astro
    RoomMeta.astro
    SeatGrid.astro
    SeatCard.astro
    RolePanel.astro
    PhasePanel.astro
    ActionPanel.astro
    HostTools.astro
    ChatPanel.astro
    EventLog.astro
    EndgamePanel.astro
    SpectatorShell.astro
  web/
    api.ts
    app-state.ts
    render.ts
    socket.ts
    actions.ts
    main.ts
    styles.css
```

Exact file boundaries may change during implementation, but V3 should not leave the full UI as one hard-to-maintain template string.

## Lobby Completion

V3 should add player readiness.

Room state should track:

- `ready` per occupied seat.
- `readyAt` timestamp per occupied seat.

Lobby behavior:

- Joining marks the player unready.
- Host can start only when all 8 seats are occupied and all players are ready.
- Host remains able to kick/transfer/lock/toggle spectators before start.
- Changing readiness broadcasts public room state.
- Kicking or resetting clears ready state.
- Reconnect preserves ready state.

Public view may expose readiness because it is public lobby state.

## Action State Completion

V3 should expose enough derived public/private state for the UI to explain what is happening.

Private player view should include:

- `actionRequired: boolean`
- `actionSubmitted: boolean`
- `actionLabel?: string`
- `waitingFor?: string`
- `cannotActReason?: string`

Public game view may include redacted aggregate status:

- Number of pending Werewolf actors if useful.
- Whether the phase is waiting on a role group.
- Vote count submitted vs eligible voters.

Public view must not reveal which hidden-role player is being waited on if that would leak roles before endgame.

## Endgame Reveal and Replay

V3 should make the end state satisfying and auditable.

Endgame reveal:

- Winning team.
- All players with role and alive/dead status.
- Death order.
- Round count.
- Final public event list.

Replay timeline:

- Night summaries with public-safe phrasing.
- Day vote summaries.
- Death resolution summaries.
- Endgame condition.

Hidden action details should become public only after game end and only through an endgame-safe reveal model. Before endgame, the public event stream must remain redacted.

## Host and Spectator Completion

Host tools should be organized and predictable:

- Share section: join link, watch link.
- Lobby controls: lock, spectator toggle, reset lobby.
- Seat controls: kick, transfer host.
- Diagnostics: redacted counters.

Spectator mode should be explicitly read-only:

- No action panel.
- No role panel.
- No chat input.
- Clear Watching state in the header.
- Clean handling when spectators are disabled.

## Reconnect and Disconnect Completion

V3 should make connection behavior explicit:

- Player refresh restores same seat and private view.
- Spectator refresh reconnects as a new anonymous spectator.
- Multi-tab for the same player should keep seat connected while at least one socket is open.
- Disconnected seats should be visible.
- Stale error banners should clear after reconnect.
- The UI should not show action forms before the WebSocket is ready.

## Rules and Security Documentation

V3 should add formal docs:

- Basic edition rule decisions.
- Phase transition table.
- Public/private/spectator view contract.
- Hidden-information matrix.
- Endgame reveal matrix.
- Host-control authorization matrix.

These documents should become acceptance references for future role and preset expansion.

## Acceptance Criteria

V3 is complete when:

- UI is split into maintainable Astro/client modules rather than one monolithic template.
- Lobby ready/unready exists and blocks start until all occupied seats are ready.
- Host UI clearly explains why start is blocked.
- Players can see whether they need to act or have submitted for the current phase.
- Endgame reveal shows all roles and winner only after game end.
- Replay/timeline provides public-safe summaries before endgame and full reveal after endgame.
- Spectator view is explicitly read-only and polished.
- Reconnect/disconnect behavior is covered in browser smoke.
- Public/private/spectator view contracts are documented and tested.
- Host-control authorization is documented and tested.
- `npm run typecheck`, `npm test`, `npm run build`, API smoke, browser smoke, remote smoke, deploy dry-run, and secret scan pass.

