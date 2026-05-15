# Miller Hollow V3.5 Implementation Plan

Date: 2026-05-15

Source design: `docs/superpowers/specs/2026-05-15-miller-hollow-v3-5-design.md`

## Objective

Implement V3.5 as "Multi-Count Basic Presets" for Miller Hollow.

V3.5 should support 8-, 9-, 10-, 11-, and 12-player basic games while keeping the V3 role set and hidden-information rules unchanged. The implementation should replace hard-coded 8-player assumptions with a shared preset model, dynamic room capacity, dynamic start eligibility, and regression coverage for every supported preset.

## Implementation Principles

- Do not add new roles in V3.5.
- Do not add custom role composition.
- Treat the full V3 basic edition as the baseline, not an optional dependency.
- Keep `basic_8` as the default for backward compatibility.
- Store a preset id, not ad hoc role counts, in room settings.
- Keep public preset role counts separate from private assigned roles.
- Preserve all V3 public/private/spectator view contracts.
- Prefer shared preset helpers over scattered `playerCount === 8` branches.

## Phase 0: V3 Basic Edition Baseline

Before changing player counts, confirm the current V3 basic edition remains the functional baseline.

Features that V3.5 must preserve:

- Lobby ready/unready flow.
- Dynamic start eligibility and blocked reasons.
- Host share links, lock, spectator toggle, kick, transfer host, reset, and diagnostics.
- Player reconnect and multi-tab connection behavior.
- Public chat and public event log.
- Private role panel and phase/action panel.
- Werewolf, Seer, Witch, villager, day vote, death, and win-condition flows.
- Action-state feedback for required, submitted, waiting, and cannot-act states.
- Spectator read-only view.
- Endgame reveal with all roles, winner, death order, and replay/timeline.
- Public/private/spectator hidden-information boundaries.
- Rules, security, and view-contract documentation.

Acceptance checks:

- Existing V3 tests and smoke tests pass before preset work starts.
- `basic_8` remains behaviorally equivalent to V3 after preset work lands.
- Non-8 presets use the same feature paths rather than a reduced lobby/game flow.

## Phase 1: Shared Basic Preset Model

Add a shared preset definition that can be used by the engine, room model, UI types, and tests.

Target deliverables:

- `BasicPresetId`
- `RolePreset`
- `BASIC_PRESETS`
- `DEFAULT_BASIC_PRESET_ID`
- `getBasicPreset(presetId)`
- `getPublicPresetSummary(preset)`

Supported preset table:

| Preset ID | Players | Werewolves | Seer | Witch | Villagers |
| --- | ---: | ---: | ---: | ---: | ---: |
| `basic_8` | 8 | 2 | 1 | 1 | 4 |
| `basic_9` | 9 | 2 | 1 | 1 | 5 |
| `basic_10` | 10 | 2 | 1 | 1 | 6 |
| `basic_11` | 11 | 3 | 1 | 1 | 6 |
| `basic_12` | 12 | 3 | 1 | 1 | 7 |

Acceptance checks:

- Preset role totals equal preset player count.
- Duplicate preset ids are impossible or tested against.
- Unknown preset ids are rejected by a typed helper.
- `basic_8` remains the default.

## Phase 2: Engine Role Assignment

Update the game engine to assign roles from a preset instead of a fixed 8-player role list.

Work:

- Update game creation to accept a `RolePreset` or `BasicPresetId`.
- Validate that `players.length === preset.playerCount`.
- Generate the exact role multiset from the selected preset.
- Preserve existing randomization behavior.
- Preserve all current phase, action, win-condition, and endgame logic.

Acceptance checks:

- Unit tests verify role counts for all five presets.
- Starting with too few or too many players throws or returns a typed error.
- Hidden-information tests continue to pass.
- Endgame reveal includes every player for all supported counts.

## Phase 3: Room Settings and Migration

Update room state so capacity comes from `settings.presetId` and `settings.playerCount`.

Target model:

```ts
type BasicPresetId = "basic_8" | "basic_9" | "basic_10" | "basic_11" | "basic_12";

interface RoomSettings {
  presetId: BasicPresetId;
  playerCount: 8 | 9 | 10 | 11 | 12;
  spectatorsEnabled: boolean;
  locked: boolean;
}
```

Work:

- Update room creation to default to `basic_8`.
- Update seat creation to use selected `playerCount`.
- Add a room-state migration for existing stored rooms with missing preset fields.
- Normalize existing rooms to `basic_8` and 8 seats.
- Add a helper to count occupied seats.
- Add a helper to create or normalize seats from the selected preset.

Initialization rules:

- Create-room may choose a supported preset id.
- Missing preset defaults to `basic_8`.
- The selected preset defines the initial seat count.
- Existing rooms without preset data migrate to `basic_8`.
- Open lobbies do not support changing the selected preset.

Acceptance checks:

- Existing 8-player rooms still load.
- Seat array length equals selected player count after room creation.
- Existing rooms without preset fields normalize to `basic_8`.

## Phase 4: Create-Room Preset Selection

Add preset selection to room creation.

Endpoint:

```text
POST /api/rooms
```

Request body:

```json
{
  "presetId": "basic_10"
}
```

Behavior:

- Reject unknown preset ids.
- Default to `basic_8` when omitted.
- Initialize the room with the selected preset before any player joins.
- Return the room id and join URL as before.

Acceptance checks:

- Creating a room with `basic_12` creates 12 seats before the host joins.
- Creating a room without preset id creates `basic_8`.
- Creating a room with an unknown preset returns 400.
- The lobby has no host control for changing player count after creation.

## Phase 5: Dynamic Join and Start Eligibility

Replace hard-coded 8-player assumptions in room capacity and start validation.

Work:

- Join flow uses `room.settings.playerCount` or `room.seats.length`.
- Full-room checks use selected preset capacity.
- `startEligibility.requiredSeats` uses selected preset count.
- `startEligibility.occupiedSeats` counts occupied dynamic seats.
- `startEligibility.readySeats` counts ready occupied seats.
- Start validates exact selected player count and all ready players.
- Reset preserves selected preset unless product behavior explicitly chooses to reset to default.

Recommended reset behavior:

- Reset finished game back to lobby while preserving the selected preset.
- Reset clears occupants' ready state.
- Host cannot change preset after reset; the room remains on its originally selected preset.

Acceptance checks:

- `basic_9` cannot start with 8 ready players.
- `basic_9` can start with 9 ready players.
- `basic_12` can start with 12 ready players.
- Join is rejected when selected capacity is full.
- Reset keeps the selected preset and correct seat count.

## Phase 6: Public, Private, and Spectator Views

Expose selected preset metadata without leaking assigned roles.

Public view additions:

```ts
preset: {
  id: BasicPresetId;
  label: string;
  playerCount: number;
  roleSummary: Array<{ role: string; count: number }>;
}
```

Start eligibility:

```ts
startEligibility: {
  canStart: boolean;
  occupiedSeats: number;
  readySeats: number;
  requiredSeats: number;
  blockedReason?: string;
}
```

Rules:

- Public `roleSummary` is derived from the selected preset.
- Public views must not include assigned hidden roles before endgame.
- Private views continue to include only the requesting player's private data.
- Spectator views use the same public preset metadata.

Acceptance checks:

- Public and spectator views show selected preset.
- Public views before endgame do not include assigned roles.
- Private views still include only the viewer's assigned role.
- Endgame reveal works with 8-12 players.

## Phase 7: Astro UI Updates

Update the lobby and room UI for dynamic presets.

Target UI work:

- Add preset control to the create-room form.
- Show selected preset and role mix in `RoomMeta`.
- Make `SeatGrid` responsive for 8-12 seats.
- Make start blocked reasons use dynamic counts.
- Show dynamic ready count and occupied count.
- Keep spectator view read-only while showing preset information.

Create-room preset control:

- Use a select, segmented control, or compact radio group for 8, 9, 10, 11, and 12 players.
- Submit the selected preset with `POST /api/rooms`.
- Do not render a player-count change control in an open lobby.

Acceptance checks:

- Desktop and mobile lobby layouts remain usable at 8 and 12 seats.
- Seat cards do not resize unpredictably for the selected preset.
- Preset creation controls are not rendered inside existing rooms.
- Preset metadata remains visible during lobby, game, and endgame.

## Phase 8: Test and Smoke Expansion

Add focused coverage for the new preset surface.

Unit/worker tests:

- Preset definitions have valid totals.
- Engine role assignment matches every preset.
- Room creation creates the correct number of seats.
- Create-room preset validation.
- Room creation creates the correct selected seat count.
- Start blocked until selected preset is full and ready.
- Public/private/spectator view hidden-information checks for at least one larger preset.

Smoke tests:

- API smoke loops through all supported preset ids when feasible.
- Browser smoke covers `basic_8` and `basic_12`.
- Remote quick smoke can choose a preset through an environment variable, for example `MILLER_HOLLOW_PRESET_ID=basic_12`.
- Remote full smoke covers at least one non-8 preset before release.

Acceptance checks:

- Local smoke proves all five presets can create, fill, ready, and start.
- Browser screenshots cover 8- and 12-seat lobby layouts.
- Remote smoke verifies the deployed Worker is not still hard-coded to 8 players.

## Phase 9: Documentation and Changelog

Update project docs after implementation.

Deliverables:

- V3.5 changelog summary.
- Deployment facts for `0.3.5`.
- README or user-facing notes that list supported player counts.
- Rules docs update if they currently state exactly 8 players.
- View contract docs update if they currently hard-code `requiredSeats: 8`.

Acceptance checks:

- User can quickly read what V3.5 changed.
- Docs do not imply that 8 players is the only supported count.
- V4 planning remains clear that new roles are still future work.

## Recommended Implementation Order

1. Add preset definitions and tests.
2. Update create-room preset selection.
3. Update engine role assignment and game creation tests.
4. Update room settings, migration, and dynamic seat helpers.
5. Replace hard-coded start/join counts.
6. Update public/private/spectator view fields.
7. Update Astro UI and responsive seat grid.
8. Expand local API and browser smoke.
9. Run full gates.
10. Deploy and run remote smoke.
11. Write changelog/deployment notes.
12. Tag `v0.3.5`.

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

V3.5 is not complete until all five supported presets are covered by automated role-count checks and at least one non-8 preset is exercised against the deployed environment.

## Risk Notes

- Existing Durable Object room state may not contain preset fields; migration must be tolerant.
- UI code may still have hard-coded 8-seat layout assumptions.
- Browser smoke with 12 player contexts may be slower; use targeted coverage rather than duplicating every full-path scenario for every count.
- Public role summaries are safe only because they are preset counts, not assigned seat roles.
- Reset behavior must be explicit so hosts do not unexpectedly lose the selected preset.
