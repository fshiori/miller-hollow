# Miller Hollow V6.3 Implementation Plan

Date: 2026-05-17

Source design: `docs/superpowers/specs/2026-05-17-miller-hollow-v6-3-design.md`

## Objective

Make AI demo rooms observable by splitting broad AI progression into explicit paced steps and adding dedicated-host controls for single-step and timed auto-step operation.

## Phase 1: AI Flow Audit

Target files:

- `src/worker/room-object.ts`
- `src/worker/room-state.ts`
- `src/web/main.ts`
- `scripts/smoke-v1.mjs`
- `scripts/browser-smoke-v1.mjs`

Work:

- Document current `host/ai-step` behavior.
- Identify which current actions are bundled together:
  - day chat.
  - day ready.
  - vote.
  - night role action.
  - reaction action.
- Identify current points where phase auto-advance happens.
- Confirm which controls are visible in player-host vs dedicated-host rooms.

Acceptance:

- Clear list of behavior to split.
- No trust boundary regression before editing.

## Phase 2: Step Type API

Target files:

- `src/worker/room-object.ts`
- `src/worker/index.ts`
- `src/web/copy.ts`
- `scripts/smoke-v1.mjs`

Work:

- Extend `POST /host/ai-step` body with:

```ts
type AiStepType =
  | "auto"
  | "night_action"
  | "day_chat"
  | "day_ready"
  | "vote"
  | "reaction";
```

- Return a public room view plus AI step summary:
  - `stepType`
  - `phaseBefore`
  - `phaseAfter`
  - `actedSeatIds`
  - `skipped`
- Keep a compatibility path where missing `stepType` maps to `auto`.

Acceptance:

- Existing V6.2 smoke still works.
- New smoke can call each explicit step type.
- Unsupported step type returns localized error.

## Phase 3: Split AI Day Behavior

Target files:

- `src/worker/room-object.ts`
- `src/web/main.ts`
- `scripts/smoke-v1.mjs`
- `scripts/browser-smoke-v1.mjs`

Work:

- Implement `day_chat`:
  - sends public AI messages only.
  - does not ready players.
  - does not advance to vote.
- Implement `day_ready`:
  - marks AI players ready only.
  - may advance to vote if all living players are ready.
- Ensure AI day chat can be run multiple times with varied short Traditional Chinese copy.

Acceptance:

- API smoke proves chat count increases while phase stays `day_discussion`.
- API smoke proves ready can later advance to `day_vote`.
- Browser smoke proves spectator can see AI chat before voting.

## Phase 4: Split AI Night, Vote, And Reaction

Target files:

- `src/worker/room-object.ts`
- `test/engine/reducer.test.ts`
- `scripts/smoke-v1.mjs`

Work:

- Implement `night_action`:
  - one current night phase only.
  - legal actor only.
  - no public chat.
- Implement `vote`:
  - one AI vote at a time by default, or all AI votes when requested.
  - preserve live vote hidden-info rules.
- Implement `reaction`:
  - Hunter shot if dead Hunter is AI.
  - Sheriff succession if dead Sheriff is AI.
  - no action for human pending reactions.

Acceptance:

- AI cannot act out of phase.
- AI cannot act for human-only pending actions.
- Vote reveal appears only after resolution.

## Phase 5: Dedicated Host Controls

Target files:

- `src/web/main.ts`
- `src/web/copy.ts`
- `src/web/styles.css`
- `scripts/browser-smoke-v1.mjs`

Work:

- Add dedicated-host AI demo panel.
- Show:
  - current phase.
  - next recommended AI step.
  - pending actor group.
  - last AI result.
- Add controls:
  - `AI 夜晚行動`
  - `AI 發言`
  - `AI 準備投票`
  - `AI 投票`
  - `AI 反應`
  - `自動每 5 秒`
  - `暫停自動`
- Keep controls compact and phase-grouped.

Acceptance:

- Dedicated host can drive a demo without DevTools.
- Player-host does not see hidden-info demo controls.
- Controls fit desktop and mobile without overlap.

## Phase 6: Auto-Step Runtime

Target files:

- `src/web/main.ts`
- `src/web/app-state.ts` if useful
- `scripts/browser-smoke-v1.mjs`

Work:

- Implement browser-side auto-step loop for dedicated host:
  - 5-second default interval.
  - one API call per tick.
  - pause button.
  - stop at game end.
  - stop on API error.
  - stop when page unloads.
- Prefer browser-side auto-step for V6.3 to avoid Durable Object background loop complexity.

Acceptance:

- Browser smoke can start auto-step, observe at least two phase changes, and pause.
- Auto-step does not continue after host leaves page.

## Phase 7: Docs And Release Notes

Target files:

- `README.md`
- `CHANGELOG.md`
- `docs/superpowers/impl/2026-05-15-miller-hollow-release-notes.md`
- `docs/superpowers/rules/2026-05-15-miller-hollow-hidden-info-matrix.md`
- `docs/superpowers/rules/2026-05-15-miller-hollow-view-contract.md`

Work:

- Document AI demo controls as test/demo tooling.
- Explain that AI is not a formal player strategy system.
- Document hidden-info boundaries for AI endpoints.
- Add V6.3 changelog and release notes.

Acceptance:

- Users understand AI controls are for hosting demos and testing.
- Security docs cover the AI endpoint shape.

## Phase 8: Version, Verification, Release

Target files:

- `package.json`
- `package-lock.json`
- `src/worker/index.ts`

Work:

- Bump app version to `0.6.3`.
- Run:
  - `npm run typecheck`
  - `npm test`
  - `npm run build`
  - `npm run smoke:v1`
  - `npm run smoke:browser`
  - `npm run secrets:check`
  - `npm run deploy:dry-run`
- Commit.
- Tag `v0.6.3`.
- Deploy only when requested.
- Run remote smoke after deploy.

Acceptance:

- Local verification passes.
- Worktree is clean after commit/tag.
- Deployment health reports `version=0.6.3` after deploy.

## Completion Definition

V6.3 is done when:

- AI day chat and AI ready are separate host actions.
- AI vote and night action are separate host actions.
- Dedicated host can run single-step and 5-second auto-step demo pacing.
- Spectators can visibly observe AI discussion before voting.
- Hidden-information boundaries match V6 trust rules.
- Version, changelog, release notes, commit, tag, and requested deployment checks are complete.
