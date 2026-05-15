# Miller Hollow V4.9 Implementation Plan

Date: 2026-05-15

Source design: `docs/superpowers/specs/2026-05-15-miller-hollow-v4-9-design.md`

## Objective

Implement V4.9 as "Vote Reveal And Demo Flow Clarity."

The release should publicly reveal resolved vote results after day vote resolution, keep live votes hidden from public spectators, improve host observer clarity for skipped/fallback night actions, and make smoke/demo flows actively exercise Werewolf, Seer, discussion, and voting behavior.

## Implementation Principles

- Keep live vote secrecy during `day_vote`.
- Reveal only resolved vote results.
- Store vote results in engine state, not ad hoc UI-only state.
- Keep host observer privileged but do not make host observer the only place where post-vote results are visible.
- Keep all new UI copy Traditional Chinese.
- Do not add new roles in V4.9.

## Phase 1: Engine Vote Result State

Target files:

- `src/engine/state.ts`
- `src/engine/reducer.ts`
- `src/engine/views.ts`
- engine unit tests

Add:

```ts
export interface PublicVoteResult {
  id: string;
  round: number;
  votes: Array<{
    voterId: PlayerId;
    targetId: PlayerId | "abstain";
  }>;
  tally: Record<string, number>;
  executedPlayerId?: PlayerId;
  tied: boolean;
  createdAt: number;
}
```

Add to `GameState`:

```ts
publicVoteResults: PublicVoteResult[];
```

Work:

- Initialize `publicVoteResults: []` in `createGame`.
- In `resolveVote`, build a vote result before clearing or moving phases.
- Include missing votes as abstain when `missingVotesAsAbstain` is true.
- Include explicit abstentions in tally.
- Set `executedPlayerId` when a player is executed.
- Set `tied: true` when no one is executed because of tie.
- Preserve existing public events.

Acceptance checks:

- Unit test confirms vote result is appended.
- Unit test confirms tied vote has no executed player.
- Unit test confirms abstentions appear in tally.

## Phase 2: Public View Contract

Target files:

- `src/engine/views.ts`
- `src/web/main.ts`
- `docs/superpowers/rules/2026-05-15-miller-hollow-view-contract.md`
- `docs/superpowers/rules/2026-05-15-miller-hollow-hidden-info-matrix.md`

Work:

- Add `voteResults` to `PublicGameView`.
- Ensure `PublicGameView` still does not expose live `state.votes`.
- Include vote results in observer view through the public game view.
- Keep host observer live vote map unchanged during `day_vote`.

Acceptance checks:

- Public JSON during `day_vote` does not include `"votes"`.
- Public JSON after resolution includes `"voteResults"`.
- Public vote results include only resolved data.

## Phase 3: UI Vote Reveal

Target files:

- `src/web/main.ts`
- `src/web/styles.css`

Work:

- Add `renderVoteResultsPanel()`.
- Render it in:
  - player room view
  - spectator view
  - host observer view
- Show latest result first or all results in chronological order. Prefer latest first if space is tight.
- Render:
  - round label
  - voter rows
  - tally
  - execution/tie/no-execution result

Suggested Traditional Chinese copy:

- `投票結果`
- `第 X 輪`
- `棄票`
- `處決：{player}`
- `平票，無人被處決`
- `無人被處決`

Acceptance checks:

- Vote result is visible after day vote resolves.
- Text fits on mobile.
- Spectator view shows the same resolved result.

## Phase 4: Host Observer Night Clarity

Target files:

- `src/worker/room-object.ts`
- `src/engine/state.ts`
- `src/engine/reducer.ts` if source is stored in engine
- `src/web/main.ts`

Work:

- Track Werewolf target source:
  - `proposal`
  - `timeout`
  - optionally `direct` for legacy `night_action`
- Display in host observer:
  - `狼人目標來源：狼人提議`
  - `狼人目標來源：逾時自動選擇`
- For Seer:
  - Display living Seer name when present.
  - Display `預言家未查驗` if Seer phase resolves without target.
  - Do not publicly reveal Seer result.

Implementation choice:

- Prefer storing source in room-level observer metadata only if it is only needed for current phase.
- Prefer engine state if the source should persist through night resolution.

Acceptance checks:

- Host observer can tell whether Werewolf target was proposal or timeout.
- Host observer can tell when Seer skipped inspection.

## Phase 5: Demo And Smoke Flow

Target files:

- `scripts/smoke-v1.mjs`
- `scripts/browser-smoke-v1.mjs`
- possibly a new helper script under `scripts/` for live demo control

Work:

- Ensure local API smoke actively:
  - sends Werewolf chat
  - proposes Werewolf target
  - confirms all living Werewolves
  - sends Seer inspection if a living Seer exists
  - sends day chat
  - sends deliberate votes
- Add post-resolution vote reveal assertions.
- Keep host observer live vote assertions.
- Keep public hidden-info assertions.

Browser smoke:

- Verify host observer sees live vote rows during voting.
- Verify public spectator does not see vote rows during active voting.
- Verify public spectator sees `投票結果` after resolution.

Acceptance checks:

- Smoke does not depend on Seer timeout for the primary happy path.
- Smoke fails if vote reveal is missing after resolution.
- Smoke fails if public live vote map leaks during vote.

## Phase 6: Documentation And Versioning

Target files:

- `README.md`
- `CHANGELOG.md`
- `docs/superpowers/rules/2026-05-15-miller-hollow-basic-edition-rules.md`
- `docs/superpowers/rules/2026-05-15-miller-hollow-view-contract.md`
- `docs/superpowers/rules/2026-05-15-miller-hollow-hidden-info-matrix.md`
- `docs/superpowers/impl/2026-05-15-miller-hollow-release-notes.md`
- `package.json`
- `package-lock.json`
- `src/worker/index.ts`

Work:

- Bump app version to `0.4.9`.
- Add changelog entry.
- Update rules to state that resolved vote details are public.
- Update README command descriptions if smoke coverage changes.
- Update release notes after deploy.

Acceptance checks:

- Docs clearly distinguish live hidden votes from resolved public vote results.
- Release notes list deployed Worker Version ID.

## Verification Plan

Run before deploy:

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

Run after deploy:

```bash
MILLER_HOLLOW_BASE_URL=https://miller-hollow.fshiori.workers.dev MILLER_HOLLOW_PRESET_ID=official_basic_8 npm run smoke:remote:quick
MILLER_HOLLOW_BASE_URL=https://miller-hollow.fshiori.workers.dev MILLER_HOLLOW_PRESET_ID=official_basic_18 npm run smoke:remote:full
```

## Implementation Order

1. Add `PublicVoteResult` type and `publicVoteResults` engine state.
2. Build vote result in `resolveVote`.
3. Add unit tests for execution, tie, and abstain results.
4. Expose `voteResults` in public view.
5. Add player/spectator/observer vote result UI.
6. Add host observer clarity for Werewolf target source and skipped Seer action.
7. Update API smoke for vote reveal and active Seer action.
8. Update browser smoke for vote reveal visibility boundaries.
9. Update docs, version, README, changelog, release notes.
10. Run full verification, deploy, remote smoke.
11. Commit and tag `v0.4.9`; do not push unless requested.

## Risks

- Accidentally exposing live `votes` instead of resolved vote results.
- Vote result becoming inconsistent if vote resolution mutates `state.votes` before result construction.
- Endgame transition after vote execution still needs to append vote result before ending.
- Browser smoke may race if it expects vote result before all WebSocket updates render.
- Public vote reveal may need concise layout for 18-player rooms.

## Completion Definition

V4.9 is done when resolved voting is publicly visible, active voting remains hidden from public spectators, host observer keeps its live vote tooling, and smoke tests drive a realistic table flow including Werewolf discussion, Seer inspection, day discussion, and deliberate voting.
