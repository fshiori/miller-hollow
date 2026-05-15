# Miller Hollow V5.3 Implementation Plan

Date: 2026-05-15

Source design: `docs/superpowers/specs/2026-05-15-miller-hollow-v5-3-design.md`

## Objective

Implement Cupid and Lovers as a linked-player workflow with death chaining and Lovers win condition.

## Phase 1: Types And State

Target files:

- `src/engine/roles.ts`
- `src/engine/phases.ts`
- `src/engine/state.ts`
- `src/engine/presets.ts`

Work:

- Add role id `cupid`.
- Add phase id `night_cupid`.
- Add winner/team support for Lovers:

```ts
type Winner = "village" | "werewolves" | "lovers";
```

- Add Lovers state:

```ts
lovers?: {
  playerIds: [PlayerId, PlayerId];
  chosenBy: PlayerId;
};
```

Acceptance:

- Cupid can be included in custom setup.
- Cupid counts as non-Werewolf role.
- Old rooms normalize without Lovers state.

## Phase 2: Cupid Command

Target files:

- `src/engine/commands.ts`
- `src/engine/reducer.ts`
- `test/engine/reducer.test.ts`

Add command:

```ts
{ type: "submit_cupid_lovers"; actorId: PlayerId; targetIds: [PlayerId, PlayerId] }
```

Work:

- Only living Cupid can act during `night_cupid`.
- Targets must be two distinct known players.
- Allow Cupid to choose themselves as one Lover, while still requiring two distinct selected players.
- After selection, store Lovers pair and advance to next first-night phase.
- Add timeout fallback that picks deterministic legal Lovers only for abandoned rooms.

Acceptance:

- Non-Cupid cannot choose Lovers.
- Cupid cannot choose the same player twice.
- Lovers are stored exactly once.
- First-night flow resumes correctly after Cupid.

## Phase 3: Private Views

Target files:

- `src/engine/views.ts`
- `src/worker/room-object.ts`

Work:

- Add Cupid legal action and legal targets.
- Add Lover partner identity to each Lover private view after Cupid resolves.
- Keep public/spectator views from seeing Lovers pair before endgame.
- Add host observer Lovers state.

Acceptance:

- Cupid sees action controls only during `night_cupid`.
- Lovers see partner identity.
- Non-Lovers do not see Lovers pair.
- Host observer sees Lovers pair.

## Phase 4: Death Chain

Target files:

- `src/engine/reducer.ts`
- `test/engine/reducer.test.ts`

Work:

- Refactor death finalization to expand Lover heartbreak deaths before queuing reactions.
- Add public event for heartbreak death.
- Ensure heartbreak death can queue Hunter revenge.
- Ensure heartbreak death can queue Sheriff succession.
- Prevent duplicate death events if both Lovers die from the same source.

Acceptance:

- Killing one Lover kills the paired Lover.
- Lover heartbreak does not reveal roles.
- Lover-Hunter death enters Hunter revenge.
- Lover-Sheriff death enters Sheriff succession.

## Phase 5: Win Conditions

Target files:

- `src/engine/reducer.ts`
- `src/web/copy.ts`
- `test/engine/reducer.test.ts`

Work:

- Add Lovers winner value.
- Check Lovers win before ordinary Village/Werewolf win when exactly the Lovers remain alive.
- Ensure same-team Lovers do not incorrectly steal normal team wins unless design requires it.
- Add UI label `戀人獲勝`.

Acceptance:

- Cross-team Lovers win when they are the only two alive.
- Village and Werewolf normal wins still work without Lovers.
- Same-team Lovers preserve normal team win behavior.

## Phase 6: UI

Target files:

- `src/web/main.ts`
- `src/web/copy.ts`
- `src/web/styles.css`

Work:

- Add Cupid custom setup control.
- Add Cupid target form that selects two distinct players.
- Add Lover partner display in private panel.
- Add host observer Cupid/Lovers panel.
- Add Traditional Chinese event and phase copy.

Acceptance:

- Browser smoke can select Lovers through UI.
- Lover partner text renders only for Lovers.
- Spectator view does not reveal Lovers pair.

## Phase 7: Smoke, Docs, Release

Target files:

- `scripts/smoke-v1.mjs`
- `scripts/browser-smoke-v1.mjs`
- `scripts/remote-smoke-v1.mjs`
- `README.md`
- `CHANGELOG.md`
- `docs/superpowers/rules/2026-05-15-miller-hollow-basic-edition-rules.md`
- `docs/superpowers/rules/2026-05-15-miller-hollow-hidden-info-matrix.md`
- `docs/superpowers/rules/2026-05-15-miller-hollow-view-contract.md`
- `docs/superpowers/impl/2026-05-15-miller-hollow-release-notes.md`
- `package.json`
- `package-lock.json`
- `src/worker/index.ts`

Work:

- Add engine tests for Cupid selection, Lover private info, heartbreak chain, and Lovers win.
- Add API smoke for Cupid custom room.
- Keep browser smoke coverage on the full regression path; Cupid browser-specific interaction can be added once a deterministic custom-role browser fixture is introduced.
- Bump app version to `0.5.3`.
- Deploy, remote smoke, commit, and tag `v0.5.3`.

## Completion Definition

V5.3 is done when Cupid can create a Lovers pair, Lovers private information and public secrecy are correct, heartbreak death chains safely through existing reactions, Lovers win condition is covered by tests, and local plus remote verification pass.
