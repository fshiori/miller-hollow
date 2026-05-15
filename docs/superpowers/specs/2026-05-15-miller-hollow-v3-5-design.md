# Miller Hollow V3.5 Design

Date: 2026-05-15

## Goal

Add supported player-count presets for the basic Miller Hollow edition.

V3.5 keeps the V3 gameplay rules and hidden-information model, but removes the hard 8-player product limit. Hosts should be able to run the same basic role set at 8, 9, 10, 11, or 12 players with clear lobby configuration, correct role assignment, dynamic seats, responsive UI, and regression coverage for every supported count.

## Version Boundaries

### V3.5: Multi-Count Basic Presets

V3.5 adds player-count flexibility only.

Supported presets:

| Preset ID | Players | Werewolves | Seer | Witch | Villagers |
| --- | ---: | ---: | ---: | ---: | ---: |
| `basic_8` | 8 | 2 | 1 | 1 | 4 |
| `basic_9` | 9 | 2 | 1 | 1 | 5 |
| `basic_10` | 10 | 2 | 1 | 1 | 6 |
| `basic_11` | 11 | 3 | 1 | 1 | 6 |
| `basic_12` | 12 | 3 | 1 | 1 | 7 |

The 11- and 12-player presets add a third werewolf to keep the basic game pressure comparable at higher counts. No new roles are introduced.

### V4: Role Expansion

V4 should remain the first release that introduces new official roles. V3.5 should create the preset infrastructure that makes V4 safer, but should not ship Hunter, Captain, Cupid, Thief, Little Girl, or any custom role setup.

## Non-Goals

- No new roles.
- No custom role composition.
- No player counts below 8 or above 12.
- No public room directory, matchmaking, ranking, or account system.
- No AI player or moderator automation.
- No change to the V3 public/private/spectator hidden-information contract except fields needed to describe the selected preset.

## Product Scope

V3.5 should preserve the complete V3 basic edition and make player count a first-class lobby setting.

Basic edition baseline inherited from V3:

- Complete lobby ready/unready flow.
- Dynamic start eligibility with clear blocked reasons.
- Host tools for sharing links, locking the room, toggling spectators, kicking seats, transferring host, and resetting.
- Player reconnect and multi-tab connection behavior.
- Public chat and public event log.
- Private role panel and phase/action panel.
- Werewolf, Seer, Witch, villager, day vote, death, and win-condition flows.
- Action-state feedback for required, submitted, waiting, and cannot-act states.
- Spectator read-only view.
- Endgame reveal with all roles, winner, death order, and replay/timeline.
- Public/private/spectator hidden-information boundaries.
- Rules, security, and view-contract documentation.

V3.5 should not replace or narrow any of those features. Every supported player-count preset should run through the same basic edition feature set.

Host capabilities:

- Select one of the supported basic presets before creating the room.
- See the selected player count, role mix, occupied seat count, ready count, and start eligibility.
- Start only when the selected preset is full and every occupied seat is ready.

Player capabilities:

- See the selected player count and role mix before joining or readying.
- Join the first available seat up to the selected player count.
- Keep the same role privacy, action state, reconnect behavior, and endgame reveal behavior from V3.

Spectator capabilities:

- See the selected preset and public lobby/game state.
- Continue to receive only public information before endgame.
- See full endgame reveal after the game ends, as in V3.

## Room Creation Rules

Preset selection happens before the room is opened.

Rules:

- The create-room request may include a supported preset id.
- If omitted, the room defaults to `basic_8`.
- The selected preset controls the initial seat count.
- The selected preset is visible to all players and spectators.
- The selected preset is fixed after room creation.
- Hosts cannot change the player count from inside the lobby.
- Resetting a room preserves the selected preset.

This keeps the lobby predictable: players join a room whose player count has already been chosen.

## Data Model

Room settings should move from a single fixed 8-player assumption to an explicit preset.

Target room settings:

```ts
type BasicPresetId = "basic_8" | "basic_9" | "basic_10" | "basic_11" | "basic_12";

interface RoomSettings {
  presetId: BasicPresetId;
  playerCount: 8 | 9 | 10 | 11 | 12;
  spectatorsEnabled: boolean;
  locked: boolean;
}
```

Seat state:

- `seats.length` should match `settings.playerCount`.
- Existing rooms without a preset should migrate to `basic_8`.
- Existing rooms with 8 seats should remain playable.
- The selected preset should be present in public room views.

Engine preset model:

```ts
interface RolePreset {
  id: BasicPresetId;
  label: string;
  playerCount: number;
  roles: {
    werewolf: number;
    seer: number;
    witch: number;
    villager: number;
  };
}
```

Role assignment must validate that the number of joined players exactly matches the preset's `playerCount`.

## Public and Private View Contract

Public room view should include:

```ts
preset: {
  id: BasicPresetId;
  label: string;
  playerCount: number;
  roleSummary: Array<{ role: string; count: number }>;
}
startEligibility: {
  canStart: boolean;
  occupiedSeats: number;
  readySeats: number;
  requiredSeats: number;
  blockedReason?: string;
}
```

Rules:

- Role counts are public because the preset is public.
- Assigned player roles remain private until endgame.
- Spectator view receives the same public preset fields.
- Private player view behavior remains unchanged except that action and seat calculations use the selected player count.

## UI Requirements

Lobby:

- Create room controls include a preset selector for 8, 9, 10, 11, and 12 players.
- The selected preset is visible to all participants.
- The role mix is visible in compact form.
- Start blocked reasons use the selected count, not a hard-coded 8.
- Seat grid supports 8-12 seats without overflow on desktop or mobile.
- Ready summary uses dynamic counts.

Game:

- Header and room metadata show the selected preset/player count.
- Seat layout remains stable after game start.
- Action panels, phase panels, chat, event log, and endgame reveal continue to work without assuming 8 seats.

Spectator:

- Spectator lobby and game views show the selected preset.
- Spectator view remains read-only.

## User Stories

### Host

As a host, I can choose a 10-player basic room before creating it, invite 10 players, see 10 seats, wait for 10 ready players, and start a game whose roles match the 10-player preset.

As a host, I cannot surprise players by changing an open lobby from 8 players to 12 players or from 12 players to 8 players.

### Player

As a player, I can see the selected player count before I ready up, so I know whether the room is still waiting for more people.

As a player, I receive exactly one private role after start, and no other hidden roles are leaked before endgame.

### Spectator

As a spectator, I can tell whether I am watching an 8-, 9-, 10-, 11-, or 12-player game without receiving private role assignments.

## Acceptance Criteria

V3.5 is complete when:

- All V3 basic edition features still work for the default `basic_8` preset.
- Lobby ready/unready, host controls, reconnect, spectator mode, chat, action panels, endgame reveal, and replay work with non-8 presets where applicable.
- Host can select `basic_8`, `basic_9`, `basic_10`, `basic_11`, or `basic_12` before creating a room.
- Created rooms use the selected preset from the first public room view.
- Open lobbies do not expose a player-count change control.
- Seat count, join capacity, ready count, and start eligibility are all dynamic.
- Every supported preset starts only when exactly full and all players are ready.
- Role assignment exactly matches the selected preset.
- Public role summary exposes only preset counts, not assigned roles.
- Private view and spectator view keep the V3 hidden-information boundary.
- Endgame reveal works for every supported preset.
- Lobby and game UI remain usable at 8 and 12 players on desktop and mobile.
- Worker/API tests cover all five presets.
- Browser smoke covers at least the smallest and largest supported presets.
- Remote smoke can run against a non-8 preset.

## Release Plan

Target version: `0.3.5`.

Recommended sequence:

1. Add shared basic preset definitions.
2. Update create-room API to accept a preset.
3. Update engine role assignment to accept a preset.
4. Update room settings and stored-room migration.
5. Make join capacity and start eligibility dynamic.
6. Update public/private/spectator views with selected preset fields.
7. Update lobby UI and seat grid for 8-12 seats.
8. Add preset coverage to worker tests and smoke tests.
9. Run full local gates.
10. Deploy with `npm run deploy:versioned`.
11. Run remote smoke against at least `basic_8` and one larger preset.
12. Write changelog/deployment notes and tag `v0.3.5`.

## Completion Gate

Before tagging V3.5, run:

```bash
npm run typecheck
npm test
npm run build
npm run smoke:v1
npm run smoke:browser
npm run smoke:remote:quick
npm run smoke:remote:full
npm run secrets:check
npm run deploy:dry-run
```

After deploy, run:

```bash
npm run smoke:remote:quick
npm run smoke:remote:full
```

V3.5 is not complete until tests prove that all supported player counts can create a room, fill seats, ready, start, assign the correct roles, preserve hidden information before endgame, and reveal correctly after endgame.
