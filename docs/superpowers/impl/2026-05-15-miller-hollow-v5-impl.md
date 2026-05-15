# Miller Hollow V5 Implementation Plan

Date: 2026-05-15

Source design: `docs/superpowers/specs/2026-05-15-miller-hollow-v5-design.md`

## Objective

Implement V5 as "Hunter + Sheriff / Captain Role Flow."

The release should add the first official special-role workflows after the V4.9 stable table loop:

- Hunter death reaction.
- Sheriff election.
- Sheriff weighted day vote.
- Sheriff succession.
- Traditional Chinese UI and host observer support.

## Implementation Principles

- Keep role additions deterministic and testable.
- Preserve hidden-role secrecy before endgame.
- Treat Sheriff as public office state, not a hidden role.
- Add reaction phases deliberately; avoid implicit side effects hidden inside death mutation.
- Keep V5 presets separate from existing official beginner presets.
- Keep V5 roleflow closer to the rulebook than legacy app-basic behavior:
  - Seer / Fortune Teller acts before Werewolves.
  - Werewolf timeout means no Werewolf victim.
  - Sheriff election is opened by the host during day discussion.
- Do not add Cupid, Thief, or Little Girl in V5.

## Phase 1: Engine Types And Presets

Target files:

- `src/engine/roles.ts`
- `src/engine/phases.ts`
- `src/engine/state.ts`
- `src/engine/presets.ts`
- `src/engine/views.ts`
- `test/engine/reducer.test.ts`

Work:

- Add role id `hunter`.
- Add phase ids:
  - `sheriff_election`
  - `hunter_revenge`
  - `sheriff_succession`
- Add V5 preset family, starting with `official_roleflow_8`.
- Add state for Sheriff office and pending reactions.
- Extend public and private views with:
  - current Sheriff holder
  - election status
  - pending Hunter action state
  - pending Sheriff succession state

Suggested state additions:

```ts
pendingReactions: Array<
  | { type: "hunter_revenge"; hunterId: PlayerId; resume: ResumeState }
  | { type: "sheriff_succession"; fromId: PlayerId; resume: ResumeState }
>;

sheriff: {
  holderId?: PlayerId;
  electionVotes: Record<PlayerId, PlayerId | "abstain">;
};
```

Acceptance checks:

- `official_roleflow_8` creates 8 seats and expected role counts.
- Public view shows Sheriff holder only, not hidden Hunter identity before endgame.
- Private Hunter view has correct role and action state.

## Phase 2: Command Model

Target files:

- `src/engine/commands.ts`
- `src/engine/reducer.ts`
- `src/worker/room-object.ts`

Add commands:

```ts
{ type: "open_sheriff_election"; actorId: PlayerId }
{ type: "submit_sheriff_vote"; actorId: PlayerId; targetId: PlayerId | "abstain" }
{ type: "resolve_sheriff_election"; missingVotesAsAbstain: boolean }
{ type: "submit_hunter_shot"; actorId: PlayerId; targetId?: PlayerId }
{ type: "submit_sheriff_successor"; actorId: PlayerId; targetId?: PlayerId }
```

Work:

- Route WebSocket messages to new commands.
- Add timeout fallback commands for election, Hunter revenge, and succession.
- Update host fast-forward to support new phases.
- Add host control route for opening Sheriff election during `day_discussion`.
- For V5 official roleflow presets, update timeout fallback so Werewolves produce no kill when no target was submitted.

Acceptance checks:

- Non-host cannot open Sheriff election.
- Host cannot open Sheriff election outside `day_discussion`.
- Host cannot open Sheriff election after a Sheriff has already been elected.
- Non-Hunter cannot submit Hunter shot.
- Living Hunter cannot shoot unless in `hunter_revenge`.
- Non-Sheriff cannot assign successor.
- Dead/non-living players cannot vote in Sheriff election.

## Phase 3: Death Reaction Queue

Target files:

- `src/engine/reducer.ts`
- `test/engine/reducer.test.ts`

Work:

- Refactor death resolution so deaths pass through a shared reaction scheduler.
- Queue Hunter reaction when a Hunter dies and game has not already ended.
- Queue Sheriff succession when current Sheriff dies and there are legal successors.
- Resolve queued reactions in deterministic order:
  1. Hunter revenge.
  2. Sheriff succession.
- After each reaction, run win-condition checks.
- Resume the intended next phase only after reaction queue is empty.

Acceptance checks:

- Night kill of Hunter enters `hunter_revenge` before day discussion.
- Day execution of Hunter enters `hunter_revenge` before night.
- Hunter shot death can trigger Sheriff succession.
- Winner is checked after each reaction.

## Phase 4: Official Roleflow Night Order

Target files:

- `src/engine/reducer.ts`
- `src/engine/presets.ts`
- `src/engine/views.ts`
- `src/worker/room-object.ts`
- `test/engine/reducer.test.ts`

Work:

- Add preset metadata for roleflow ordering.
- For V5 roleflow presets, start in `night_seer` rather than `night_werewolves`.
- Advance from Seer / Fortune Teller to Werewolves, then Witch if present, then day discussion.
- If Werewolves time out without a target in V5 roleflow, resolve the night with no Werewolf death.
- Keep existing app-basic behavior only where needed for backward compatibility.

Acceptance checks:

- `official_roleflow_8` starts with Seer / Fortune Teller action.
- Werewolf phase follows Seer / Fortune Teller.
- Werewolf timeout without target produces no night death.
- Demo/smoke explicitly submits a Werewolf target.

## Phase 5: Sheriff Election And Weighted Vote

Target files:

- `src/engine/reducer.ts`
- `src/engine/views.ts`
- `src/worker/room-object.ts`
- `test/engine/reducer.test.ts`

Work:

- Add host-opened `sheriff_election` from `day_discussion`.
- Track election votes separately from day votes.
- Resolve election by highest count.
- Tie elects no Sheriff in V5.
- After election resolution, return to `day_discussion`.
- Once a Sheriff is elected, prevent re-election.
- If no Sheriff is elected because of tie or all abstentions, allow the host to open another election during a later `day_discussion`.
- Update day vote tally to apply Sheriff weight 2.
- Extend `PublicVoteResult.votes[]` with `weight`.
- Extend `PublicVoteResult.tally` to count weighted totals.

Acceptance checks:

- Sheriff holder is public after election.
- Host can open election only during day discussion.
- Election resolution returns to day discussion.
- Sheriff vote has weight 2 in day vote result.
- Abstaining Sheriff contributes weighted abstain but does not execute.
- Public live vote map remains hidden.

## Phase 6: Browser UI

Target files:

- `src/web/main.ts`
- `src/web/styles.css`
- `src/web/copy.ts`

Work:

- Add Traditional Chinese phase labels:
  - `警長選舉`
  - `獵人反擊`
  - `警長移交`
- Add player action panels:
  - Sheriff election vote.
  - Hunter shot.
  - Sheriff successor/skip.
- Add host day-discussion control:
  - `開啟警長選舉`
- Add public Sheriff holder display.
- Update vote result rendering for weighted rows:
  - `玩家 A → 玩家 B`
  - `玩家 A → 玩家 B（警長票 x2）`
- Keep layout mobile-safe for 18-player rooms.

Acceptance checks:

- Player can elect Sheriff through UI.
- Hunter can shoot through UI.
- Sheriff can assign successor through UI.
- Host can open Sheriff election from day discussion UI.
- Vote result panel displays weighted Sheriff vote clearly.

## Phase 7: Host Observer

Target files:

- `src/worker/room-object.ts`
- `src/web/main.ts`
- `src/web/styles.css`

Work:

- Expose observer-only Sheriff election live votes.
- Expose pending Hunter revenge state.
- Expose pending Sheriff succession state.
- Show weighted live tally during day vote.
- Show whether Sheriff election can be opened.
- Ensure observer view still excludes reconnect tokens and ticket hashes.

Acceptance checks:

- Host observer sees election vote map.
- Host observer sees pending Hunter and Sheriff reaction state.
- Host observer live vote tally reflects Sheriff weight.

## Phase 8: Smoke And Tests

Target files:

- `test/engine/reducer.test.ts`
- `scripts/smoke-v1.mjs`
- `scripts/browser-smoke-v1.mjs`
- `scripts/remote-smoke-v1.mjs`

Work:

- Add engine tests for Hunter, Sheriff election, weighted voting, and succession.
- Extend API smoke with `official_roleflow_8`.
- Extend browser smoke to drive:
  - Official roleflow night order.
  - Sheriff election.
  - Weighted day vote.
  - Hunter revenge.
- Ensure smoke actively submits Werewolf targets and does not rely on timeout random target fallback.
- Keep current official beginner smoke coverage.

Acceptance checks:

- Existing V4.9 smoke remains green.
- New V5 roleflow smoke fails if any new workflow is missing.

## Phase 9: Docs, Versioning, Deploy

Target files:

- `README.md`
- `CHANGELOG.md`
- `docs/superpowers/rules/2026-05-15-miller-hollow-basic-edition-rules.md`
- `docs/superpowers/rules/2026-05-15-miller-hollow-phase-table.md`
- `docs/superpowers/rules/2026-05-15-miller-hollow-view-contract.md`
- `docs/superpowers/rules/2026-05-15-miller-hollow-hidden-info-matrix.md`
- `docs/superpowers/impl/2026-05-15-miller-hollow-release-notes.md`
- `package.json`
- `package-lock.json`
- `src/worker/index.ts`

Work:

- Bump app version to `0.5.0`.
- Add changelog entry.
- Document roleflow preset and new phases.
- Update view contract and hidden-info matrix.
- Update release notes after deploy.

Verification:

```bash
npm run typecheck
npm test
npm run build
npm run smoke:v1
npm run smoke:browser
npm run secrets:check
npm run deploy:dry-run
```

Deploy:

```bash
npm run deploy
```

Remote smoke:

```bash
MILLER_HOLLOW_BASE_URL=https://miller-hollow.fshiori.workers.dev MILLER_HOLLOW_PRESET_ID=official_basic_8 npm run smoke:remote:quick
MILLER_HOLLOW_BASE_URL=https://miller-hollow.fshiori.workers.dev MILLER_HOLLOW_PRESET_ID=official_basic_18 npm run smoke:remote:full
MILLER_HOLLOW_BASE_URL=https://miller-hollow.fshiori.workers.dev MILLER_HOLLOW_PRESET_ID=official_roleflow_8 npm run smoke:remote:full
```

## Implementation Order

1. Add Hunter role, V5 phases, and roleflow preset.
2. Add Sheriff and pending reaction state.
3. Add command types and reducer validation.
4. Implement official roleflow night order and no-kill Werewolf timeout.
5. Implement host-opened Sheriff election.
6. Implement weighted day vote and public vote result weights.
7. Implement Hunter reaction phase.
8. Implement Sheriff succession.
9. Expose public/private/observer views.
10. Add browser UI panels and Traditional Chinese copy.
11. Extend unit tests.
12. Extend API/browser/remote smoke.
13. Update docs, version, changelog, and release notes.
14. Run full verification, deploy, remote smoke.
15. Commit and tag `v0.5.0`; do not push unless requested.

## Risks

- Death-triggered reactions can easily skip winner checks if implemented inline.
- Sheriff vote weighting can diverge between live observer tally and resolved public results.
- Hunter shot can create chained deaths that expose hidden roles too early if public events are too detailed.
- Browser smoke may need deterministic setup to ensure Hunter is executed in the test flow.
- Adding roleflow presets must not change existing official beginner default behavior.
- Changing V5 roleflow night order must not break legacy app-basic smoke.
- Host-opened Sheriff election needs clear phase resumption so day discussion does not lose chat/readiness state unexpectedly.

## Completion Definition

V5 is done when Hunter and Sheriff / Captain can be played through engine, API, browser UI, spectator view, and host observer view; all hidden-information boundaries still hold; weighted vote reveal is publicly understandable; and local plus remote verification pass.
