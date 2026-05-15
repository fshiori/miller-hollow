# Miller Hollow V5.2 Implementation Plan

Date: 2026-05-15

Source design: `docs/superpowers/specs/2026-05-15-miller-hollow-v5-2-design.md`

## Objective

Implement Thief as a pre-game role-choice workflow for custom roleflow rooms.

## Phase 1: Types And Setup

Target files:

- `src/engine/roles.ts`
- `src/engine/phases.ts`
- `src/engine/state.ts`
- `src/engine/presets.ts`
- `src/worker/room-state.ts`

Work:

- Add role id `thief`.
- Add phase id `thief_choice`.
- Add setup state for spare role cards:

```ts
thiefSetup?: {
  spareRoles: Role[];
};
```

- Add game state for pending and resolved Thief choice:

```ts
thief?: {
  playerId?: PlayerId;
  spareRoles: Role[];
  chosenRole?: Role;
};
```

Acceptance:

- Custom setup accepts Thief 0 or 1.
- If Thief is enabled, exactly two spare roles are required.
- Room normalization backfills missing Thief state safely for old rooms.

## Phase 2: Role Assignment

Target files:

- `src/engine/reducer.ts`
- `src/engine/presets.ts`

Work:

- Assign exactly `playerCount` dealt roles to players.
- Keep spare roles outside the dealt role list.
- If a player receives Thief, start the game in `thief_choice`.
- If no Thief is dealt, start in the normal first night phase.
- Decide and document forced-Werewolf spare behavior before implementation.

Acceptance:

- Dealt role count equals player count.
- Spare roles are not assigned to any player before Thief chooses.
- Thief room starts in `thief_choice`.

## Phase 3: Commands And Reducer

Target files:

- `src/engine/commands.ts`
- `src/engine/reducer.ts`
- `test/engine/reducer.test.ts`

Add command:

```ts
{ type: "submit_thief_choice"; actorId: PlayerId; role: Role }
```

Work:

- Only the Thief player can choose.
- Choice must be one of the two spare roles.
- After choice, replace Thief's effective role with selected role.
- Clear pending choice and advance to first night phase.
- Add timeout fallback using a deterministic legal spare role.

Acceptance:

- Non-Thief cannot choose.
- Thief cannot choose a role outside the spare pool.
- Thief becomes the chosen role for all future actions and win checks.
- First night order after Thief choice remains V5 official roleflow.

## Phase 4: Views And Hidden Information

Target files:

- `src/engine/views.ts`
- `src/worker/room-object.ts`
- `docs/superpowers/rules/2026-05-15-miller-hollow-hidden-info-matrix.md`
- `docs/superpowers/rules/2026-05-15-miller-hollow-view-contract.md`

Work:

- Add private view fields for Thief spare roles during `thief_choice`.
- Keep public and spectator views free of spare roles and Thief identity.
- Add host observer fields for Thief identity, spare roles, and pending choice.
- Ensure endgame reveal shows final effective role.

Acceptance:

- Public/spectator JSON does not include spare roles before endgame.
- Thief private view includes spare roles only for the Thief.
- Host observer sees Thief workflow without token leaks.

## Phase 5: UI

Target files:

- `src/web/main.ts`
- `src/web/copy.ts`
- `src/web/styles.css`

Work:

- Add custom setup controls for Thief and two spare role selectors.
- Add `盜賊選擇` phase label.
- Add Thief choice action panel.
- Add host observer Thief panel.

Acceptance:

- Browser UI can create a valid Thief room.
- Thief player can choose a spare role through UI.
- Non-Thief players see waiting state only.

## Phase 6: Smoke, Docs, Release

Target files:

- `scripts/smoke-v1.mjs`
- `scripts/browser-smoke-v1.mjs`
- `scripts/remote-smoke-v1.mjs`
- `README.md`
- `CHANGELOG.md`
- `docs/superpowers/impl/2026-05-15-miller-hollow-release-notes.md`
- `package.json`
- `package-lock.json`
- `src/worker/index.ts`

Work:

- Add engine tests for Thief choice and hidden info.
- Add API smoke for valid Thief custom room.
- Add browser smoke for Thief choice.
- Bump app version to `0.5.2`.
- Deploy, remote smoke, commit, and tag `v0.5.2`.

## Completion Definition

V5.2 is done when Thief can choose from two pre-room configured spare roles before first night, the selected role becomes the player's effective role, spare-card hidden information is protected, and full local plus remote verification pass.
