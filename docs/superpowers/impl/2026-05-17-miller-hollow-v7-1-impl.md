# Miller Hollow V7.1 Implementation Plan

Date: 2026-05-17

Source design: `docs/superpowers/specs/2026-05-17-miller-hollow-v7-1-design.md`

## Objective

Polish the official basic game to completion before starting AI companion work.

V7.1 should keep the main product path aligned with the official basic rules: 8-18 players, Werewolves, Fortune Teller, and Ordinary Townsfolk. Existing roleflow/custom functionality can remain, but it should not distract from or weaken the official basic path.

## Phase 1: Official Basic Product Audit

Target files:

- `src/engine/presets.ts`
- `src/engine/reducer.ts`
- `src/engine/views.ts`
- `src/worker/room-object.ts`
- `src/web/main.ts`
- `src/web/copy.ts`
- `src/web/styles.css`
- `docs/superpowers/rules/2026-05-16-miller-hollow-official-rules-audit.md`
- `scripts/smoke-v1.mjs`
- `scripts/browser-smoke-v1.mjs`

Work:

- Audit create-room UI against official basic 8-18 flow.
- Audit lobby role-count display for every official basic preset.
- Audit night order for official basic rooms.
- Audit public/private views for Fortune Teller and Werewolf hidden information.
- Audit day vote resolution, tie behavior, abstentions, and vote reveal.
- Audit endgame role reveal and win-condition copy.
- Audit normal player rooms for accidental dedicated-host AI controls.

Acceptance:

- Produce an edit checklist from actual gaps.
- Confirm which existing tests already cover each official basic rule.
- Do not begin AI companion implementation.

## Phase 2: Create And Join Flow Polish

Target files:

- `src/web/main.ts`
- `src/web/copy.ts`
- `src/web/styles.css`
- `scripts/browser-smoke-v1.mjs`

Work:

- Make official basic room creation the clearest primary path.
- Keep player count selection explicit before room creation.
- Show the computed Werewolf / Fortune Teller / Ordinary Townsfolk mix before creation.
- Keep non-basic/custom controls visually secondary.
- Improve join-room form layout and copy on desktop and mobile.

Acceptance:

- First-time host can create an official basic room without touching custom role controls.
- Join-room UI is compact and readable.
- Browser smoke asserts official basic role mix is visible before start.

## Phase 3: Official Basic Rule Tightening

Target files:

- `src/engine/presets.ts`
- `src/engine/reducer.ts`
- `src/engine/views.ts`
- `src/worker/room-object.ts`
- `test/engine/reducer.test.ts`
- `scripts/smoke-v1.mjs`

Work:

- Strengthen role-count assertions for all `official_basic_8` through `official_basic_18`.
- Verify official basic night order: Fortune Teller, Werewolves, day.
- Verify Fortune Teller results are private until endgame.
- Verify Werewolf teammates/chat/target are private to Werewolves.
- Verify official basic no-victim behavior is documented and reflected in public copy.
- Verify win conditions remain correct after night deaths and day executions.

Acceptance:

- Unit or smoke tests fail if official basic role counts drift.
- Unit or smoke tests fail if hidden role information leaks.
- Official basic rooms do not require special roles to complete a game.

## Phase 4: Vote Reveal And Day Resolution UX

Target files:

- `src/engine/reducer.ts`
- `src/engine/views.ts`
- `src/web/main.ts`
- `src/web/copy.ts`
- `src/web/styles.css`
- `test/engine/reducer.test.ts`
- `test/web/copy.test.ts`
- `scripts/smoke-v1.mjs`
- `scripts/browser-smoke-v1.mjs`

Work:

- Ensure final votes are revealed after resolution.
- Show each voter and target.
- Show abstentions for missing online votes.
- Show tie/no-execution copy clearly.
- Ensure the vote reveal component fits mobile.
- Keep pre-resolution votes hidden from public/spectator views.

Acceptance:

- Tests cover execution, tie/no execution, and abstention.
- Browser smoke verifies the vote reveal is visible and readable.
- Hidden-info tests prove live votes are not public before resolution.

## Phase 5: Event Log Follow And Summary

Target files:

- `src/web/main.ts`
- `src/web/styles.css`
- `src/web/copy.ts`
- `scripts/browser-smoke-v1.mjs`

Work:

- Auto-follow the event log to the newest event by default.
- Pause auto-follow when the user scrolls upward.
- Add a `回到最新` control when new events arrive while paused.
- Keep day/night/vote/endgame summaries concise.
- Ensure generated public log entries are Traditional Chinese.

Acceptance:

- Browser smoke can append enough events to prove follow behavior.
- Manual upward scroll does not snap back unexpectedly.
- Public event logs remain free of hidden-information leaks.

## Phase 6: Waiting, Submitted, And Reconnect Polish

Target files:

- `src/web/main.ts`
- `src/web/copy.ts`
- `src/web/styles.css`
- `scripts/browser-smoke-v1.mjs`

Work:

- Tighten waiting-state copy for every official basic phase.
- Show submitted state after Fortune Teller, Werewolf target, day readiness, and vote.
- Explain disabled controls when the player cannot act.
- Verify reload/reconnect restores player role and action state.
- Keep invalid-session recovery clear and token-free.

Acceptance:

- Browser smoke covers reload/reconnect for a player.
- Copy tests cover important waiting and error strings.
- No reconnect token appears in rendered UI or committable files.

## Phase 7: AI Boundary Gate

Target files:

- `src/web/main.ts`
- `src/worker/room-object.ts`
- `scripts/smoke-v1.mjs`
- `scripts/browser-smoke-v1.mjs`
- `docs/superpowers/rules/2026-05-15-miller-hollow-hidden-info-matrix.md`
- `docs/superpowers/rules/2026-05-15-miller-hollow-view-contract.md`

Work:

- Confirm dedicated-host AI test-player controls remain hidden from normal player-host rooms.
- Confirm AI test-player controls are clearly labeled as host/demo tooling.
- Do not add AI companion logic, AI public room fill, AI personality, or model-provider calls.
- Add a documented gate for future AI companion design discussion.

Acceptance:

- Browser smoke proves normal player rooms do not expose AI controls.
- Docs say AI companion work must pause for discussion after official-basic completion.
- No model-provider integration is introduced.

## Phase 8: Completion Audit, Docs, Version, Release

Target files:

- `README.md`
- `CHANGELOG.md`
- `docs/superpowers/impl/2026-05-15-miller-hollow-release-notes.md`
- `docs/superpowers/rules/2026-05-15-miller-hollow-basic-edition-rules.md`
- `docs/superpowers/rules/2026-05-16-miller-hollow-official-rules-audit.md`
- `package.json`
- `package-lock.json`
- `src/worker/index.ts`

Work:

- Update docs to describe the official basic completeness release.
- Bump version to `0.7.1`.
- Run:
  - `npm run typecheck`
  - `npm test`
  - `npm run build`
  - `npm run smoke:v1`
  - `npm run smoke:browser`
  - `npm run secrets:check`
  - `npm run deploy:dry-run`
- Commit.
- Tag `v0.7.1`.
- Deploy only when requested.
- Run remote smoke after deploy.

Acceptance:

- Verification passes locally.
- Worktree is clean after commit/tag.
- Release notes identify remaining known online adaptations.
- AI companion implementation has not started.

## Completion Definition

V7.1 is done when:

- Official basic 8-18 rooms are the primary polished product path.
- Official basic role counts, night order, hidden-information boundaries, day vote resolution, tie behavior, abstentions, and win conditions are verified.
- Player-facing copy and UI make the full official basic flow understandable without developer explanation.
- Event log and vote reveal are usable on desktop and mobile.
- Reconnect and action-submitted states are clear.
- Dedicated-host AI test tools remain isolated from normal play.
- No AI companion feature is implemented.
- The team pauses to discuss AI companion design before starting that work.
