# Miller Hollow V7 Implementation Plan

Date: 2026-05-17

Source design: `docs/superpowers/specs/2026-05-17-miller-hollow-v7-design.md`

## Objective

Improve the normal player experience so the game is understandable, usable on mobile, resilient to reconnect states, and not dominated by host/demo tooling.

## Phase 1: Player Experience Audit

Target files:

- `src/web/main.ts`
- `src/web/copy.ts`
- `src/web/styles.css`
- `src/engine/views.ts`
- `src/worker/room-object.ts`
- `scripts/browser-smoke-v1.mjs`

Work:

- Capture current browser screenshots for:
  - lobby.
  - night action.
  - day discussion.
  - day vote.
  - endgame.
  - spectator view.
  - dedicated-host console.
- List confusing copy and missing waiting states.
- Identify mobile overflow / cramped controls.
- Identify host controls that compete with player actions.

Acceptance:

- Audit notes become a concrete edit checklist.
- No broad redesign begins before current problems are named.

## Phase 2: Waiting-State Model

Target files:

- `src/engine/views.ts`
- `src/worker/room-object.ts`
- `src/web/main.ts`
- `src/web/copy.ts`
- `test/engine/reducer.test.ts`
- `scripts/smoke-v1.mjs`

Work:

- Extend public and private view-derived status as needed:
  - current actor group.
  - own submitted state.
  - waiting reason.
  - public-safe submitted counts.
- Normalize copy for:
  - waiting for role action.
  - waiting for votes.
  - waiting for discussion readiness.
  - waiting for host.
  - action already submitted.

Acceptance:

- Player always sees whether they need to act.
- Public views do not reveal hidden role identity.
- Tests cover representative phases.

## Phase 3: Action Confirmation UX

Target files:

- `src/web/main.ts`
- `src/web/copy.ts`
- `src/web/styles.css`
- `scripts/browser-smoke-v1.mjs`

Work:

- Add client-side submitting state for action forms.
- Disable duplicate submits while awaiting server response.
- Show server-confirmed result in the action panel.
- Keep legal change/re-submit behavior where the engine permits it.
- Improve error display near action controls.

Acceptance:

- Player can tell whether an action submitted.
- Failed action keeps the form usable.
- Browser smoke checks at least one night action and one vote confirmation.

## Phase 4: Mobile Game Layout

Target files:

- `src/web/styles.css`
- `src/web/main.ts`
- `scripts/browser-smoke-v1.mjs`

Work:

- Rebalance mobile layout order:
  - phase/action first.
  - role summary.
  - chat/log.
  - seats.
  - host tools lower or collapsed.
- Ensure select controls and buttons fit.
- Improve vote result mobile layout.
- Reduce oversized repeated seat cards on mobile.
- Preserve desktop density.

Acceptance:

- Browser smoke captures mobile screenshots for lobby, night, discussion, vote, and endgame.
- No important text overflows its container.
- Host tools do not push player action below the fold on mobile.

## Phase 5: Reconnect UX

Target files:

- `src/web/main.ts`
- `src/web/copy.ts`
- `src/web/socket.ts` if adopted
- `scripts/browser-smoke-v1.mjs`

Work:

- Add explicit reconnect states:
  - connecting.
  - reconnecting.
  - retry available.
  - reconnect failed.
- Add retry button.
- Keep leave-room button visible.
- Explain browser-held identity without showing tokens.

Acceptance:

- Browser smoke reloads a player and verifies role/action state is restored.
- Browser smoke verifies invalid session produces clear recovery UI.

## Phase 6: Rules Quick Reference

Target files:

- `src/web/main.ts`
- `src/web/copy.ts`
- `src/web/styles.css`
- `README.md`
- `scripts/browser-smoke-v1.mjs`

Work:

- Add compact rules panel/modal in lobby and game.
- Show:
  - preset/custom role setup.
  - enabled roles.
  - host mode.
  - spectators on/off.
  - night order.
  - Sheriff status.
  - Werewolf timeout behavior.
  - vote reveal rule.
- Keep it compact; no full rules encyclopedia.

Acceptance:

- Player can inspect room setup without leaving game.
- Spectator can also inspect public-safe setup.
- Browser smoke asserts panel opens and includes current preset/host mode.

## Phase 7: Phase Timeline

Target files:

- `src/web/main.ts`
- `src/web/copy.ts`
- `src/web/styles.css`
- `docs/superpowers/rules/2026-05-15-miller-hollow-phase-table.md`

Work:

- Add phase timeline component.
- Highlight current phase.
- Show recent completed public phases.
- Show public-safe likely next phase.
- Support official basic, official roleflow, and custom roleflow.

Acceptance:

- Timeline never reveals hidden roles before endgame.
- Timeline remains readable on mobile.

## Phase 8: Host / Demo Tool Separation

Target files:

- `src/web/main.ts`
- `src/web/styles.css`
- `src/web/copy.ts`
- `scripts/browser-smoke-v1.mjs`

Work:

- Collapse or group host tools away from primary player action.
- Hide AI/demo controls unless dedicated-host demo/test context applies.
- Keep player-host tools public-safe.
- Keep dedicated-host console explicit.

Acceptance:

- Normal player screen prioritizes player action.
- Player-host does not see hidden-info demo affordances.
- Dedicated host still has needed controls.

## Phase 9: Copy And Accessibility Pass

Target files:

- `src/web/copy.ts`
- `src/web/main.ts`
- `src/web/styles.css`
- `test/web/copy.test.ts`
- `scripts/browser-smoke-v1.mjs`

Work:

- Polish Traditional Chinese copy for:
  - waiting states.
  - errors.
  - reconnect.
  - vote reveal.
  - night summaries.
  - host mode.
- Ensure forms have labels.
- Ensure important disabled controls have reason text.
- Avoid color-only state.
- Preserve keyboard focus where practical after render.

Acceptance:

- Copy tests cover important labels.
- Browser smoke catches major visible copy.

## Phase 10: Docs, Version, Verification, Release

Target files:

- `README.md`
- `CHANGELOG.md`
- `docs/superpowers/impl/2026-05-15-miller-hollow-release-notes.md`
- `package.json`
- `package-lock.json`
- `src/worker/index.ts`

Work:

- Add V7 changelog and release notes.
- Update README with player-experience features.
- Bump app version to `0.7.0`.
- Run:
  - `npm run typecheck`
  - `npm test`
  - `npm run build`
  - `npm run smoke:v1`
  - `npm run smoke:browser`
  - `npm run secrets:check`
  - `npm run deploy:dry-run`
- Commit.
- Tag `v0.7.0`.
- Deploy only when requested.
- Run remote smoke after deploy.

Acceptance:

- Local verification passes.
- Worktree is clean after commit/tag.
- Deployment health reports `version=0.7.0` after deploy.

## Completion Definition

V7 is done when:

- Normal players can understand what to do in every phase.
- Action submission and waiting states are clear.
- Mobile gameplay screens are usable.
- Reconnect recovery is understandable.
- Rules quick reference is available in room.
- Host/demo controls do not dominate normal player UI.
- Browser smoke covers representative mobile and reconnect flows.
- Version, changelog, release notes, commit, tag, and requested deployment checks are complete.
