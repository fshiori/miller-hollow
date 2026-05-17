# Miller Hollow V6.2 Implementation Plan

Date: 2026-05-17

Source design: `docs/superpowers/specs/2026-05-17-miller-hollow-v6-2-design.md`

## Objective

Make hosted online games smoother to run and observe by improving phase controls, discussion readiness, vote reveal, Werewolf night chat visibility, system log behavior, and AI test-player progression.

## Phase 1: Current Flow Audit

Target files:

- `src/engine/reducer.ts`
- `src/engine/views.ts`
- `src/worker/room-object.ts`
- `src/web/main.ts`
- `src/web/copy.ts`
- `src/web/styles.css`
- `scripts/smoke-v1.mjs`
- `scripts/browser-smoke-v1.mjs`

Work:

- Map current phase transitions from night to day discussion to vote resolution.
- Identify current host commands and which are allowed for player-host vs dedicated-host.
- Confirm current live vote visibility in public, player, spectator, and host views.
- Confirm current Werewolf chat storage and view filtering.
- Confirm current system log rendering behavior and scroll handling.

Acceptance:

- Implementation notes list exactly which state and view fields need changes.
- No hidden-information changes are made before the current boundary is understood.

## Phase 2: Day Discussion Readiness

Target files:

- `src/engine/types.ts`
- `src/engine/reducer.ts`
- `src/engine/views.ts`
- `src/worker/room-object.ts`
- `src/web/main.ts`
- `src/web/copy.ts`
- `test/engine/reducer.test.ts`
- `scripts/smoke-v1.mjs`

Work:

- Add discussion ready state for living players during day discussion.
- Add player command to mark ready / not ready where appropriate.
- Reset readiness when a new day discussion starts.
- Expose ready count and waiting player ids in public-safe views.
- Allow host to advance from day discussion to voting.
- Keep readiness state public; it should not reveal roles or private actions.

Acceptance:

- Living players can ready up during day discussion.
- Dead players and spectators cannot ready up.
- Host can advance to voting from day discussion.
- Ready state resets correctly on the next day.

## Phase 3: Vote Reveal

Target files:

- `src/engine/types.ts`
- `src/engine/reducer.ts`
- `src/engine/views.ts`
- `src/web/main.ts`
- `src/web/copy.ts`
- `src/web/styles.css`
- `test/engine/reducer.test.ts`
- `scripts/smoke-v1.mjs`
- `scripts/browser-smoke-v1.mjs`

Work:

- Keep live vote selections hidden from normal public/player/spectator views.
- Preserve dedicated-host visibility for live vote state in dedicated-host rooms.
- Add resolved vote reveal data after voting ends:
  - voter id/name.
  - target id/name.
  - abstain or timeout.
- Render vote reveal in the game UI and spectator UI.
- Add system log summary for the resolved vote.
- Verify tie behavior stays consistent with existing rules docs.

Acceptance:

- During voting, normal players cannot see who voted for whom.
- After voting resolves, all public views can see the final vote map.
- Dedicated host can still inspect live vote state.
- Tests assert both hidden live vote and public resolved reveal.

## Phase 4: Werewolf Night Chat Hardening

Target files:

- `src/engine/reducer.ts`
- `src/engine/views.ts`
- `src/worker/room-object.ts`
- `src/web/main.ts`
- `src/web/copy.ts`
- `test/engine/reducer.test.ts`
- `scripts/smoke-v1.mjs`
- `scripts/browser-smoke-v1.mjs`

Work:

- Ensure Werewolf chat is only accepted during the Werewolf phase.
- Ensure only living Werewolves can send Werewolf chat.
- Expose Werewolf chat to:
  - living Werewolves.
  - dedicated-host console.
- Hide Werewolf chat from:
  - non-Werewolf players.
  - dead players unless the existing rules intentionally allow post-death private access.
  - public spectators.
  - player-host observer paths.
- Add Traditional Chinese copy for private Werewolf chat status and empty states.

Acceptance:

- Werewolves can coordinate at night.
- Non-Werewolves and spectators cannot see private chat.
- Dedicated host can observe it only in dedicated-host rooms.
- Regression tests cover the visibility boundary.

## Phase 5: Host Control Surface

Target files:

- `src/worker/room-object.ts`
- `src/web/main.ts`
- `src/web/copy.ts`
- `src/web/styles.css`
- `scripts/browser-smoke-v1.mjs`

Work:

- Group host controls by current phase:
  - lobby.
  - night.
  - day discussion.
  - voting.
  - reaction phases.
- Show the current waiting state:
  - required actor group.
  - pending player names where public-safe.
  - ready count during discussion.
- Add or clarify commands:
  - advance day discussion to vote.
  - fast-forward current timer / timeout.
  - trigger AI actions in test rooms.
- Keep dedicated-host-only hidden controls out of player-host rooms.

Acceptance:

- Host sees one obvious next action for each phase.
- Player-host receives no hidden-info controls.
- Dedicated-host hidden controls are clearly labeled.

## Phase 6: System Log Auto-Follow

Target files:

- `src/web/main.ts`
- `src/web/styles.css`
- `scripts/browser-smoke-v1.mjs`

Work:

- Auto-scroll the system log to the newest entry when the user is already near the bottom.
- Stop auto-follow when the user scrolls up.
- Show a compact "jump to latest" control when new messages arrive while paused.
- Ensure high-volume logs, such as 50 day messages, remain usable on desktop and mobile.

Acceptance:

- New messages remain visible during normal observation.
- Reading older log entries is not interrupted.
- Browser smoke verifies the log can receive many messages and jump to latest.

## Phase 7: AI Test-Player Actions

Target files:

- `src/engine/reducer.ts`
- `src/engine/views.ts`
- `src/worker/room-object.ts`
- `src/web/main.ts`
- `src/web/copy.ts`
- `scripts/smoke-v1.mjs`
- `scripts/browser-smoke-v1.mjs`
- `scripts/remote-smoke-v1.mjs`
- `test/engine/reducer.test.ts`

Work:

- Add a host-triggered AI action command for test/demo rooms.
- Implement simple legal-action selection for:
  - day chat.
  - ready-up.
  - Werewolf kill choice.
  - Seer investigation.
  - Witch save / poison decision.
  - Hunter shot.
  - voting.
- Prefer deterministic choices in tests.
- Keep AI output concise and Traditional Chinese where user-visible.
- Ensure AI never receives hidden data through public/player-host paths.

Acceptance:

- A dedicated host can fill or drive a controlled test room with AI actions.
- Smoke tests can progress through at least one full day/night/vote cycle.
- Illegal AI actions are rejected or avoided by construction.

## Phase 8: Documentation And Release Notes

Target files:

- `README.md`
- `CHANGELOG.md`
- `docs/superpowers/impl/2026-05-15-miller-hollow-release-notes.md`
- `docs/superpowers/rules/2026-05-15-miller-hollow-hidden-info-matrix.md`
- `docs/superpowers/rules/2026-05-15-miller-hollow-view-contract.md`
- `docs/superpowers/rules/2026-05-15-miller-hollow-phase-table.md`

Work:

- Document discussion readiness.
- Document live vote hiding and resolved vote reveal.
- Document Werewolf chat visibility.
- Document host controls by host mode.
- Add V6.2 changelog and release notes.
- Update hidden-info matrix and view contract for any changed fields.

Acceptance:

- Docs explain what hosts, players, and spectators can see.
- Changelog summarizes the user-facing improvements.
- Hidden-info docs match implemented view behavior.

## Phase 9: Version, Verification, Release

Target files:

- `package.json`
- `package-lock.json`
- `src/worker/index.ts`

Work:

- Bump app version to `0.6.2`.
- Run:
  - `npm run typecheck`
  - `npm test`
  - `npm run build`
  - `npm run smoke:v1`
  - `npm run smoke:browser`
  - `npm run secrets:check`
  - `npm run deploy:dry-run`
- Commit.
- Tag `v0.6.2`.
- Deploy only when requested.
- Run remote smoke after deploy.

Acceptance:

- Local verification passes.
- Worktree is clean after commit/tag.
- Deployment health reports `version=0.6.2` after deploy.

## Completion Definition

V6.2 is done when:

- Hosts can move a game cleanly from night to discussion to voting.
- Discussion readiness is visible and reset correctly.
- Live votes remain hidden until resolution.
- Resolved votes are publicly revealed.
- Werewolf chat is private to Werewolves and dedicated host.
- System log auto-follow works for active observation.
- AI test actions can drive a controlled game flow.
- Hidden-information boundaries remain covered by tests.
- Version, changelog, release notes, commit, tag, and requested deployment checks are complete.
