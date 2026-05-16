# Miller Hollow V6 Design

Date: 2026-05-16

## Goal

V6 fixes the room trust model.

V5 currently lets a player-host open a hidden-information host observer view. That is useful for debugging and demos, but it is not acceptable for normal games because the host can also participate as a player.

V6 should separate normal player-host rooms from dedicated-host rooms:

- Player-host rooms are the default and must not expose hidden information to the host.
- Dedicated-host rooms are explicit, clearly labeled, and the host does not occupy a player seat.

This is a trust and product-flow release, not a new-role release.

## Current Problem

Current behavior mixes two different roles:

- A player-host owns lobby administration.
- The same player-host can open `/host-watch` and see hidden information.

Hidden information includes roles, Werewolf chat, Cupid/Lovers state, Seer results, Witch state, and live vote maps. In a real game this is cheating information.

The project needs an explicit model so players know whether they are joining:

- a normal peer game with no privileged hidden-info viewer, or
- a moderated/demo game with a non-player host who can see everything.

## Room Modes

Add a room mode:

```ts
type HostMode = "player_host" | "dedicated_host";
```

### Player Host

Default mode.

Rules:

- Host occupies a player seat.
- Host can play normally.
- Host can use lobby and administrative controls.
- Host cannot open hidden-information observer.
- Host cannot receive privileged observer payloads.
- Public spectator mode remains available if enabled.

Allowed host controls:

- Lock/unlock lobby.
- Kick lobby seats.
- Transfer host.
- Start game.
- Toggle public spectators.
- Copy room/watch links.
- Read redacted diagnostics.
- Open Sheriff election during day discussion.
- Fast-forward phase.
- Reset non-playing rooms.

Forbidden:

- Hidden role reveal before endgame.
- Host observer state that includes roles or private night data.
- Any endpoint that gives the host full game state.

### Dedicated Host

Explicit advanced mode.

Rules:

- Host does not occupy a player seat.
- Host owns room administration.
- Player seats are filled only by joined players.
- Dedicated host may open a hidden-information host console.
- Dedicated host mode must be visible to players and spectators before and during the game.
- Dedicated host mode cannot be silently converted from player-host mode after players join.

Allowed dedicated host controls:

- All player-host administrative controls.
- Hidden-information host console.
- Full role and night-action observer state.
- Future V6+ testing/demo tools.

Forbidden:

- Joining as a player in the same room using the host identity.
- Hiding the fact that a dedicated host can see hidden information.

## UX Requirements

Create-room UI:

- Default to player-host mode.
- Dedicated host mode is an explicit advanced option.
- Dedicated host option copy must be direct:
  - `專職主持（不參與遊戲，可查看隱藏資訊）`
- Player-host mode copy:
  - `玩家房主（參與遊戲，不可查看隱藏資訊）`

Lobby / game UI:

- Show room trust mode near room metadata.
- For dedicated host rooms, show:
  - `專職主持可查看隱藏資訊`
- For player-host rooms, show:
  - `房主也是玩家，無隱藏資訊後台`

Host console:

- Rename `host-watch` UI from generic observer language to a dedicated-host console.
- If a player-host tries to open it, show a clear rejection:
  - `此房間為玩家房主模式，房主不可查看隱藏資訊。`
- If a non-host tries to open it, keep the existing host-only rejection.

Spectator UI:

- Public spectators never see hidden information.
- Spectators should see the room trust mode.

## API / Security Requirements

Create-room API:

- Accept optional `hostMode`.
- Default to `player_host`.

Room state:

- Persist `settings.hostMode`.
- Normalize old rooms to `player_host`.

Dedicated-host identity:

- Dedicated host must authenticate with a host token that is not a player reconnect token.
- Host token hash must be stored separately from player token hashes.
- Host token must not be exposed in public room views.

Observer access:

- Hidden-information observer endpoints must require:
  - authenticated host identity, and
  - `settings.hostMode === "dedicated_host"`.
- Player-host mode must not issue observer tickets.
- Player-host mode must not return observer state.

Public views:

- Public room views may include `settings.hostMode`.
- Public room views must not include host tokens or hashes.

## Migration

Existing rooms:

- Treat missing `settings.hostMode` as `player_host`.
- Existing host seat remains the player-host seat.
- Existing hidden-info host observer should become unavailable for old rooms unless they are explicitly created as dedicated-host rooms after V6.

## Testing Requirements

Add coverage for:

- Player-host room cannot create observer ticket.
- Player-host room cannot read observer state.
- Player-host room public view has no hidden roles before endgame.
- Dedicated-host room host does not occupy a player seat.
- Dedicated-host room can issue observer ticket to authenticated dedicated host.
- Dedicated-host observer sees roles and hidden night state.
- Public players/spectators see room trust mode but not hidden state.
- Old room normalization sets `hostMode` to `player_host`.

## Not V6

- New roles.
- AI players.
- Full automated demo mode.
- Replacing all host controls.
- Removing public spectator mode.

## Completion

V6 is complete when normal player-host rooms no longer have any hidden-information observer path, dedicated-host rooms have an explicit non-player host identity with a clearly labeled hidden-information console, and the trust mode is visible in player and spectator UI.
