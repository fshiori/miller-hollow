# Miller Hollow V5.1 Implementation Plan

Date: 2026-05-15

Source design: `docs/superpowers/specs/2026-05-15-miller-hollow-v5-1-design.md`

## Objective

Implement pre-room custom role setup for existing roles, with rulebook-guided Werewolf and Seer / Fortune Teller counts.

## Phase 1: Shared Custom Setup Model

Target files:

- `src/engine/presets.ts`
- `src/engine/state.ts`
- `src/worker/room-state.ts`

Work:

- Add a `custom_roleflow` preset/config model.
- Store custom role counts in room settings at creation time.
- Add a rulebook recommendation helper:

```ts
recommendedWerewolfCount(playerCount: number): number
recommendedSeerCount(playerCount: number): 1
```

Recommended Werewolves:

- 8-11 players: 2
- 12-17 players: 3
- 18 players: 4

Recommended Seer / Fortune Teller:

- 8-18 players: 1

Acceptance:

- Recommendation helper has unit tests for all 8-18 player counts.
- Custom role settings survive room serialization/normalization.

## Phase 2: Validation

Target files:

- `src/engine/presets.ts`
- `src/worker/room-object.ts`
- `test/engine/reducer.test.ts`

Work:

- Validate custom setup before room creation.
- Enforce:
  - player count 8-18
  - total role cards equals player count
  - Werewolves >= 1
  - non-Werewolves >= 1
  - Seer, Witch, Hunter each 0-1
  - Villagers >= 0
  - Werewolf count equals rulebook recommendation
  - Seer count equals rulebook recommendation

Acceptance:

- Too few Werewolves returns a structured validation error.
- Too many Werewolves returns a structured validation error.
- Missing Seer returns a structured validation error.
- Too many Seers returns a structured validation error.
- Valid custom roleflow config creates a room.

## Phase 3: Create-Room UI

Target files:

- `src/web/main.ts`
- `src/web/copy.ts`
- `src/web/styles.css`

Work:

- Add a create-room mode for custom roleflow.
- Add steppers/inputs for supported role counts.
- Auto-fill Werewolf and Seer counts from rulebook recommendation when player count changes.
- Derive Villager count from remaining seats.
- Show inline warning if Werewolf or Seer count differs from recommendation.
- On submit, use `alert()` and block room creation when the count is too low or too high.

Traditional Chinese copy:

- `自定義角色`
- `依規則書建議，{count} 人局應有 {wolves} 位狼人。`
- `依規則書建議，預言家應為 1 位。`
- `目前角色配置和規則書建議不一致，請先調整後再建立房間。`

Acceptance:

- Changing player count updates recommended Werewolf count.
- Too few/too many Werewolves shows warning and blocks submit.
- Too few/too many Seers shows warning and blocks submit.
- Villager count updates without allowing negative values.
- Created lobby shows fixed role summary.

## Phase 4: Worker API

Target files:

- `src/worker/index.ts`
- `src/worker/room-object.ts`
- `src/worker/room-state.ts`

Work:

- Extend `POST /api/rooms` to accept either:
  - `presetId`, or
  - `customRoleSetup`
- Reject invalid custom setup with `400` and structured error codes.
- Keep existing preset creation behavior unchanged.
- Persist selected setup into room settings.

Acceptance:

- Existing preset smoke remains green.
- Invalid custom setup never creates a room.
- Public room view exposes safe summary, not private role assignment.

## Phase 5: Smoke And Tests

Target files:

- `test/engine/reducer.test.ts`
- `scripts/smoke-v1.mjs`
- `scripts/browser-smoke-v1.mjs`
- `scripts/remote-smoke-v1.mjs`

Work:

- Add API smoke for valid custom 8, 12, and 18 player roleflow configs.
- Add API smoke for too few/too many Werewolves and Seers.
- Add browser smoke for custom setup warnings and successful custom room creation.
- Keep V5 roleflow Hunter/Sheriff path green.

Acceptance:

- Local API smoke catches broken custom validation.
- Browser smoke catches missing alert/warning behavior.
- Remote smoke can create a valid custom roleflow room after deploy.

## Phase 6: Docs And Release

Target files:

- `README.md`
- `CHANGELOG.md`
- `docs/superpowers/rules/2026-05-15-miller-hollow-basic-edition-rules.md`
- `docs/superpowers/impl/2026-05-15-miller-hollow-release-notes.md`
- `package.json`
- `package-lock.json`
- `src/worker/index.ts`

Work:

- Bump app version to `0.5.1`.
- Document custom setup as pre-room only.
- Document rulebook-guided Werewolf/Seer validation.
- Deploy, remote smoke, commit, and tag `v0.5.1`.

## Completion Definition

V5.1 is done when custom roleflow rooms can be created only before lobby creation, Werewolf and Seer counts are enforced against the rulebook recommendation with clear Traditional Chinese warnings, all room settings are fixed after creation, and local plus remote verification pass.
