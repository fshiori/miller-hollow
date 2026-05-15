# Miller Hollow V4 Design

Date: 2026-05-15

Sources:

- Official English rulebook PDF: `https://cdn.1j1ju.com/medias/af/08/f4-the-werewolves-of-millers-hollow-rulebook.pdf`
- V3.5 design: `docs/superpowers/specs/2026-05-15-miller-hollow-v3-5-design.md`

## Goal

Bring Miller Hollow closer to the official base-box rules by supporting official 8-18 player presets and by preparing the role system for official character expansion.

V4 should not be "add random roles." It should correct the product model:

- V3.5 supports 8-12 player app-basic presets that include Werewolf, Seer, Witch, and Villager.
- The official rulebook supports 8-18 players.
- The official beginner/basic mix uses Werewolves, Fortune Teller, and Ordinary Townsfolk.
- Official special characters should be introduced gradually after the preset and role architecture can support them safely.

## Why V3.5 Stopped At 12

V3.5 stopped at 12 as a conservative product slice, not because the official game stops at 12.

Reasons:

- The existing V3 game already had only four roles: Werewolf, Seer, Witch, and Villager.
- The UI, browser smoke, WebSocket workflows, and hidden-information tests had only been proven at 8 players.
- Expanding directly to 18 would have increased Playwright context count, layout risk, and smoke duration before the preset system itself was proven.
- V3.5's role mix included Witch, while the official beginner mix in the rulebook does not.

V4 should resolve this gap by adding official 8-18 presets as a first-class rules mode.

## Official Rulebook Baseline

The rulebook states the game is for 8 to 18 players. The component list includes:

- 4 Werewolves
- 13 Ordinary Townsfolk
- 1 Fortune Teller
- 1 Thief
- 1 Hunter
- 1 Cupido
- 1 Witch
- 1 Little Girl
- 1 Sheriff

The rulebook's recommended beginner mix uses:

- Werewolves
- Fortune Teller
- Ordinary Townsfolk

Official beginner preset table:

| Preset ID | Players | Werewolves | Fortune Teller | Ordinary Townsfolk |
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

In the current code, `seer` represents the Fortune Teller ability. V4 may keep the internal role id as `seer` for compatibility, but user-facing copy should use "Fortune Teller" where official rules are being referenced.

## Version Boundaries

### V4: Official 8-18 Preset Foundation

V4 should ship:

- Official beginner presets for 8-18 players.
- Create-room player-count selection for `official_basic_*` rulebook beginner presets.
- `app_basic_*` and legacy "Basic with Witch" presets from V3.5 remain compatible but are not shown in the primary create-room UI.
- Seat layout and browser smoke support up to 18 players.
- Preset taxonomy and migration docs.
- Role system groundwork for official special characters.
- No half-implemented special roles.

V4 may rename current V3.5 `basic_*` presets in the public API only through a compatibility plan. Existing rooms and clients must keep working.

### V4.5: Traditional Chinese UX

V4.5 should translate the player-facing interface to Traditional Chinese and polish UX copy before new mechanics are added.

Scope:

- Full Traditional Chinese player-facing UI.
- Consistent role, phase, team, and action terminology.
- Browser smoke checks for core localized strings.
- No new roles.

### V5+

Candidate future releases:

- Hunter: death-triggered action.
- Sheriff / Captain: visible role, double vote, succession.
- Cupid / Lovers: setup round, lover private view, coupled death, possible third-team win condition.
- Thief: setup round with extra card pool.
- Little Girl: requires a separate online-safety design because tabletop spying does not map cleanly to an online app.

## Non-Goals

- No custom role builder in V4.
- No public matchmaking or room directory.
- No accounts or ranking.
- No AI players.
- No Little Girl implementation.
- No Cupid/Lovers implementation.
- No Sheriff vote-weight implementation.
- No Thief setup-round implementation.
- No role that is visible in the UI but not fully enforced by the engine.

## Product Scope

V4 should make the create-room flow explicit:

- Rules mode.
- Player count.
- Role mix.
- Official beginner preset.

Create room should show:

- Mode label.
- Player count options.
- Role summary.
- No primary UI branch for app-basic Witch presets.

Lobby should show:

- Selected mode.
- Selected player count.
- Public role-count summary.
- Seat count and ready count.
- Start blocked reason.

Game and spectator views should keep the V3/V3.5 hidden-information boundary.

## Preset Taxonomy

V4 should stop treating all presets as one flat `basic_*` namespace.

Target preset categories:

```ts
type PresetFamily = "official_basic" | "app_basic";

interface RolePreset {
  id: string;
  family: PresetFamily;
  label: string;
  rulesSource: "official_rulebook" | "miller_hollow_app";
  playerCount: number;
  roles: Role[];
  enabled: boolean;
}
```

Recommended ids:

- `official_basic_8` through `official_basic_18`
- Existing `basic_8` through `basic_12` remain accepted as aliases or legacy ids.
- Optional new ids for the current Witch presets: `app_basic_8` through `app_basic_12`

Compatibility rule:

- Existing `basic_*` ids should continue to work.
- New UI should prefer explicit family names.
- Public room views should include both `preset.id` and `preset.family`.

## Role System Requirements

V4 should prepare a role registry, even if it only fully runs Werewolf, Fortune Teller/Seer, Witch, and Villager at first.

Target role metadata:

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

Rules:

- Presets cannot include roles with `implemented: false`.
- Public preset summaries may list roles in the preset.
- Public game state must not reveal assigned hidden roles before endgame.
- Private view must be derived from role definitions and current game state, not ad hoc UI strings scattered through the code.

## Official 8-18 UI Requirements

Create room:

- Host selects player count.
- Role summary updates before room creation.
- Unsupported combinations are not selectable.

Lobby:

- Seat grid supports 8-18 seats.
- 13-18 player rooms remain readable on desktop.
- Mobile layout remains a single-column list.
- Start eligibility uses selected `requiredSeats`.

Game:

- Action panels should not assume 8-12 seats.
- Legal target lists must handle up to 18 players without cramped controls.
- Endgame reveal should handle 18 players.

Spectator:

- Spectator view should remain public-only.
- Spectator header must not overflow with long room ids or many metadata chips.

## Hidden Information Requirements

V4 must preserve all existing hidden-information guarantees:

- No public assigned roles before endgame.
- No private views to spectators.
- No reconnect tokens or token hashes in public state.
- No setup-round hidden choices leaked to public views.
- No pending role identity leak through public waiting-state labels.

For official 8-18 beginner presets, public role counts are safe because they are selected preset data, not assignments.

## Testing Requirements

V4 should expand tests from "all supported V3.5 presets" to "all official 8-18 presets."

Required coverage:

- Preset totals for 8-18 official beginner presets.
- Create room with every official preset.
- Fill, ready, and start every official preset in API smoke.
- Role count exactness for every official preset.
- Public/private/spectator hidden-info checks for at least 8, 12, and 18 players.
- Browser smoke for:
  - 8-player official beginner lobby.
  - 18-player official beginner lobby.
  - One complete playable path at a smaller count.
- Remote smoke can select an official 18-player preset.

## Acceptance Criteria

V4 is complete when:

- Create room supports official beginner presets from 8 through 18 players.
- Official beginner role counts match the rulebook table.
- Existing V3.5 `basic_8` through `basic_12` rooms remain compatible.
- UI exposes official beginner presets as the primary create-room flow and does not present app-basic Witch presets as a parallel main mode.
- Lobby, game, spectator, and endgame views do not assume 12 players as a maximum.
- API smoke proves every official 8-18 preset can be created, filled, readied, started, and assigned correctly.
- Browser smoke proves 18-seat layout is usable on desktop and mobile.
- Public/private/spectator hidden-information tests pass for an 18-player room.
- V4 changelog explains why V3.5 stopped at 12 and what V4 corrected.

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

After deploy, run remote smoke against:

```bash
MILLER_HOLLOW_PRESET_ID=official_basic_8 npm run smoke:remote:quick
MILLER_HOLLOW_PRESET_ID=official_basic_18 npm run smoke:remote:full
```

V4 is not complete until 18-player official beginner rooms are tested in both local and deployed environments.
