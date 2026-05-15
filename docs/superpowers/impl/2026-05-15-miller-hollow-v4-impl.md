# Miller Hollow V4 Implementation Plan

Date: 2026-05-15

Source design: `docs/superpowers/specs/2026-05-15-miller-hollow-v4-design.md`

## Objective

Implement V4 as "Official 8-18 Preset Foundation."

V4 should add official beginner presets from 8 to 18 players, preserve V3.5 compatibility, and prepare the role system for future official character expansion without shipping incomplete special roles.

## Implementation Principles

- Correct the official player-count gap: V4 must support 8-18.
- Keep existing V3.5 rooms and preset ids working.
- Do not remove the current app-basic Witch presets abruptly.
- Do not add a role unless the engine, views, UI, and tests fully support it.
- Public role counts are safe; assigned hidden roles are not.
- Prefer explicit preset families over ambiguous `basic_*` naming.
- Keep create-room preset selection before players join.

## Phase 1: Preset Taxonomy

Replace the current single-family preset model with explicit preset families.

Target work:

- Add `PresetFamily = "official_basic" | "app_basic"`.
- Add `rulesSource` to role presets.
- Add `enabled` to role presets.
- Add official beginner presets from 8 through 18 players.
- Keep existing `basic_8` through `basic_12` ids as aliases or compatibility ids.
- Optionally introduce explicit `app_basic_8` through `app_basic_12` ids for the V3.5 Witch presets.

Official beginner table:

| Preset ID | Players | Werewolves | Seer/Fortune Teller | Villagers |
| --- | ---: | ---: | ---: | ---: |
| `official_basic_8` | 8 | 2 | 1 | 5 |
| `official_basic_9` | 9 | 2 | 1 | 6 |
| `official_basic_10` | 10 | 2 | 1 | 7 |
| `official_basic_11` | 11 | 2 | 1 | 8 |
| `official_basic_12` | 12 | 3 | 1 | 8 |
| `official_basic_13` | 13 | 3 | 1 | 9 |
| `official_basic_14` | 14 | 3 | 1 | 10 |
| `official_basic_15` | 15 | 3 | 1 | 11 |
| `official_basic_16` | 16 | 3 | 1 | 12 |
| `official_basic_17` | 17 | 3 | 1 | 13 |
| `official_basic_18` | 18 | 4 | 1 | 13 |

Acceptance checks:

- Role totals equal player count for every official preset.
- `official_basic_18` contains 18 roles.
- Current `basic_8` through `basic_12` still resolve.
- Unknown preset ids are rejected.

## Phase 2: Role Metadata Registry

Add role definitions before adding new role behavior.

Target files:

- `src/engine/roles.ts`
- Optional new `src/engine/role-definitions.ts`

Target metadata:

```ts
interface RoleDefinition {
  id: Role;
  displayName: string;
  team: Team;
  officialName?: string;
  implemented: boolean;
  setupPhase?: boolean;
  nightOrder?: number;
  hasPrivateAction?: boolean;
  hasDeathTrigger?: boolean;
  modifiesVoting?: boolean;
  modifiesWinCondition?: boolean;
}
```

Initial implemented roles:

- `werewolf`
- `villager`
- `seer` with official display name "Fortune Teller"
- `witch` for app-basic presets only

Known but not preset-enabled in V4:

- `hunter`
- `cupid`
- `thief`
- `little_girl`
- `captain`

Acceptance checks:

- Preset validation rejects roles whose definitions are missing.
- Preset validation rejects unimplemented roles.
- Public role labels come from role metadata.

## Phase 3: Create-Room Mode Selection

Update create-room UI and API to support official player-count selection while preserving preset-family compatibility in the API.

API:

```text
POST /api/rooms
```

Body:

```json
{
  "presetId": "official_basic_18"
}
```

Work:

- Keep existing `presetId` request field.
- Default to a deliberate preset. Recommended default: `official_basic_8`.
- If preserving product continuity is more important, default to current `basic_8` alias and show official mode first in UI.
- Return selected preset metadata in the first public room view.

UI:

- Add player count selector for official 8-18 rooms.
- Do not show app-basic Witch presets in the primary create-room UI.
- Keep app-basic Witch preset ids accepted by API for compatibility and regression coverage.
- Role summary updates before creating the room.
- Lobby has no player-count change control.

Acceptance checks:

- Creating `official_basic_18` creates 18 seats before any player joins.
- Creating legacy `basic_12` still creates the current V3.5 Witch preset.
- Unknown preset ids return 400.

## Phase 4: Dynamic Seat Layout To 18

Update CSS and markup assumptions so 18 seats remain usable.

Work:

- Seat grid supports 8-18 on desktop.
- Mobile remains single-column.
- Seat cards keep stable height.
- Header metadata wraps without overflow.
- Legal target selects remain usable with 18 choices.
- Endgame reveal grid supports 18 cards.

Suggested layout:

- Sidebar may remain 2 columns for seats on desktop.
- At wider widths, seat grid may use 3 columns if sidebar width is increased or seats move into a table section.
- Do not use a decorative nested-card layout.

Acceptance checks:

- Browser smoke captures `official_basic_18` lobby desktop screenshot.
- Browser smoke captures mobile spectator or lobby screenshot without horizontal overflow.

## Phase 5: Engine And View Compatibility

The engine already accepts dynamic presets in V3.5. V4 should harden it for 18.

Work:

- Validate selected preset before game creation.
- Ensure role assignment handles 18 players.
- Ensure win-condition logic handles 4 Werewolves.
- Ensure legal targets handle 18 players.
- Ensure public phase status does not leak hidden role identities.
- Ensure endgame reveal includes all players.

Acceptance checks:

- Unit tests verify `official_basic_8` through `official_basic_18`.
- Public view before endgame hides roles for 18-player games.
- Private werewolf view for `official_basic_18` shows 3 teammates.
- Endgame reveal includes 18 players.

## Phase 6: Smoke Expansion

Update smoke scripts to understand preset families.

Local API smoke:

- Loop through every `official_basic_8` through `official_basic_18`.
- Create room with preset id.
- Fill all seats.
- Ready all players.
- Start game.
- Verify role counts.
- Verify hidden-info boundaries.

Browser smoke:

- Create `official_basic_18`.
- Verify 18 seat cards render.
- Capture desktop and mobile screenshots.
- Run a complete action flow at a smaller preset, such as `official_basic_8` or existing app-basic 8.

Remote smoke:

- Support `MILLER_HOLLOW_PRESET_ID=official_basic_18`.
- Quick mode should verify create, fill, ready, start, role counts, and hidden-info boundaries.

Acceptance checks:

- Local smoke covers all official player counts.
- Browser smoke covers 18-seat layout.
- Remote smoke passes with `official_basic_18`.

## Phase 7: Documentation And Changelog

Update docs after implementation.

Deliverables:

- V4 changelog.
- Release notes explaining:
  - Official 8-18 support.
  - Why V3.5 only supported 8-12.
  - App-basic Witch presets are compatibility/API presets, not a primary create-room UI branch.
- README preset table update.
- Rules docs update with official beginner table.
- View contract update with `preset.family` and `preset.rulesSource`.

Acceptance checks:

- Docs no longer imply official support stops at 12.
- Docs clearly explain current special-role status.
- Docs identify which presets are official and which are app-specific.

## Recommended Implementation Order

1. Add preset family types and official preset definitions.
2. Add role metadata registry.
3. Add preset validation for implemented roles.
4. Preserve legacy `basic_*` aliases.
5. Update create-room UI player-count selector.
6. Update public preset summary to include family and rules source.
7. Expand seat layout to 18.
8. Expand unit tests for official 8-18 role counts.
9. Expand local API smoke for all official presets.
10. Expand browser smoke for 18-seat layout.
11. Expand remote smoke for `official_basic_18`.
12. Update README, rules docs, release notes, and changelog.
13. Run full local gates.
14. Deploy.
15. Run remote smoke for `official_basic_8` and `official_basic_18`.
16. Tag `v0.4.0` after verification.

## Completion Gate

Before tagging V4, run:

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
MILLER_HOLLOW_PRESET_ID=official_basic_8 npm run smoke:remote:quick
MILLER_HOLLOW_PRESET_ID=official_basic_18 npm run smoke:remote:full
```

## Risk Notes

- Browser smoke with 18 player contexts may be slower; keep full gameplay flow on a smaller preset and use 18-player smoke for layout/start/hidden-info verification.
- Official beginner presets do not include Witch, while current app-basic presets do. The primary create-room UI should avoid presenting them as parallel player choices.
- Renaming current `basic_*` ids can break existing rooms unless aliases are kept.
- The official rulebook uses "Fortune Teller"; current code uses `seer`. Rename carefully or keep an internal alias.
- Little Girl is not safe to implement without a separate online-specific design.
