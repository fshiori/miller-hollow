# Miller Hollow V4.7 Implementation Plan

Date: 2026-05-15

Source design: `docs/superpowers/specs/2026-05-15-miller-hollow-v4-7-design.md`

## Objective

Implement V4.7 as "Werewolf Discussion And Phase Readiness."

V4.7 should add private Werewolf night discussion, shared Werewolf target proposal, Werewolf confirmation, and day discussion readiness without adding new roles or weakening hidden-information boundaries.

## Implementation Principles

- Keep role ids, phase ids, and public API field names stable unless a new field is required.
- Treat Werewolf night discussion as private role state.
- Never put Werewolf chat or target proposals in public room views.
- Prefer WebSocket messages for active phase interactions.
- Keep V4.6 host fast-forward as a recovery/demo override.
- Keep all new player-facing copy Traditional Chinese.

## Phase 1: Phase Interaction State

Add phase-scoped interaction state to room state.

Target files:

- `src/worker/room-state.ts`
- `src/worker/room-object.ts`

Suggested state:

```ts
interface PhaseInteractionState {
  phase?: Phase;
  werewolfChat: WerewolfChatMessage[];
  werewolfTargetId?: string;
  werewolfReadySeatIds: string[];
  dayReadySeatIds: string[];
}

interface WerewolfChatMessage {
  id: string;
  seatId: string;
  nickname: string;
  message: string;
  createdAt: number;
}
```

Work:

- Add state fields with tolerant normalization for existing rooms.
- Reset phase interaction state when game phase changes.
- Preserve only the data relevant to the current phase.
- Cap Werewolf chat message count.
- Keep chat message length capped.

Acceptance checks:

- Existing rooms without the new fields normalize safely.
- Phase readiness resets after phase changes.
- Stored state does not include reconnect tokens in chat records.

## Phase 2: Engine Or Room-Level Advancement Helpers

Implement advancement decisions while preserving engine authority.

Target files:

- `src/worker/room-object.ts`
- Optional helper in `src/engine/reducer.ts` only if needed.

Work:

- Add helper to detect living Werewolves.
- Add helper to detect living players.
- Validate Werewolf proposed targets against engine legal targets or private view legal targets.
- When all living Werewolves are confirmed and target is valid:
  - Apply `submit_werewolf_target` using one living Werewolf as actor.
- When all living day players are ready:
  - Apply `advance_to_vote`.
- Call `afterGameMutation` after automatic phase advancement.

Acceptance checks:

- Werewolf confirmation advances only with valid target.
- Day readiness advances only when every living player is ready.
- Host fast-forward still works.

## Phase 3: WebSocket Commands

Add new authenticated player commands.

Target files:

- `src/worker/room-object.ts`

New messages:

```ts
{ "type": "werewolf_chat", "message": "..." }
{ "type": "propose_werewolf_target", "targetId": "seat-5" }
{ "type": "set_werewolf_ready", "ready": true }
{ "type": "set_day_ready", "ready": true }
```

Work:

- Extend `ClientMessage`.
- Route the new message types before generic game command mapping.
- Reject commands from unauthenticated, dead, or wrong-role players.
- Reject Werewolf commands outside `night_werewolves`.
- Reject day readiness outside `day_discussion`.
- Rate limit Werewolf chat.
- Broadcast updated room/private views after each accepted command.

Acceptance checks:

- Werewolves can chat and propose targets.
- Villagers cannot send Werewolf chat.
- Dead players cannot send phase readiness.
- Spectators cannot use player commands.

## Phase 4: Private And Public Views

Expose only the correct phase interaction state.

Target files:

- `src/worker/room-object.ts`
- `src/engine/views.ts` if private view type needs extension.
- `src/web/main.ts`

Public view additions:

- Day readiness count.
- Day readiness seat ids, if useful and acceptable because living/dead status is public.
- Generic Werewolf confirmation count without identities.

Private Werewolf additions:

- Werewolf chat.
- Proposed target.
- Werewolf ready ids or own ready state plus count.
- Legal target list.

Non-Werewolf private view:

- No Werewolf chat.
- No proposed target.
- No Werewolf identities from readiness.

Acceptance checks:

- Public JSON never contains Werewolf chat messages.
- Spectator JSON never contains Werewolf chat messages.
- Non-Werewolf private JSON never contains Werewolf chat messages.
- Werewolf private JSON contains current Werewolf chat.

## Phase 5: UI

Add active phase controls.

Target files:

- `src/web/main.ts`
- `src/web/copy.ts`
- `src/web/styles.css`

Werewolf UI:

- `狼人討論` panel.
- Chat log and message input.
- Proposed victim display.
- Target selector.
- `確認目標` / `取消確認`.
- Readiness count.

Day UI:

- `準備投票` / `取消準備` button.
- Readiness count.
- Clear waiting copy.

Host UI:

- Keep `快轉階段`.
- Do not make host fast-forward look like the normal player action.

Acceptance checks:

- Text is Traditional Chinese.
- Controls fit on mobile.
- Role-private controls render only for eligible players.

## Phase 6: Tests

Add focused coverage.

Unit-level or worker-level tests:

- Phase interaction normalization.
- Werewolf-only validation.
- Day readiness all-ready transition.
- Reset-on-phase-change behavior.

Smoke coverage:

- API/WebSocket smoke sends Werewolf chat from one Werewolf.
- Second Werewolf sees the chat in private view.
- Villager private view does not include it.
- Spectator view does not include it.
- Werewolf proposed target advances after all Werewolves confirm.
- Day readiness advances to vote.
- Host fast-forward still works.

Browser smoke:

- Find both Werewolf pages.
- Send Werewolf chat on one page.
- Verify another Werewolf page sees it.
- Verify a Villager page and spectator page do not.
- Click `準備投票` for living players.
- Verify transition to `白天投票`.

## Phase 7: Documentation And Release Notes

Update:

- `CHANGELOG.md`
- `README.md`
- `docs/superpowers/impl/2026-05-15-miller-hollow-release-notes.md`
- `docs/superpowers/rules/2026-05-15-miller-hollow-basic-edition-rules.md`
- `docs/superpowers/rules/2026-05-15-miller-hollow-view-contract.md`
- Hidden-information matrix if maintained separately.

Documentation should state:

- V4.7 adds no new roles.
- Werewolf chat is private and not shown to spectators.
- Day readiness is public and does not reveal roles.
- Host fast-forward is an override, not the normal table flow.

## Verification Plan

Before deploy:

```bash
npm run typecheck
npm test
npm run build
npm run smoke:v1
npm run smoke:browser
npm run secrets:check
npm run deploy:dry-run
```

After deploy:

```bash
MILLER_HOLLOW_BASE_URL=https://miller-hollow.fshiori.workers.dev MILLER_HOLLOW_PRESET_ID=official_basic_8 npm run smoke:remote:quick
MILLER_HOLLOW_BASE_URL=https://miller-hollow.fshiori.workers.dev MILLER_HOLLOW_PRESET_ID=official_basic_18 npm run smoke:remote:full
```

## Recommended Implementation Order

1. Add phase interaction state and normalization.
2. Add validation helpers for living Werewolves and living players.
3. Add WebSocket command handlers.
4. Extend private/public room views with safe readiness data.
5. Add Werewolf private UI.
6. Add day readiness UI.
7. Add unit and smoke tests for hidden-information boundaries.
8. Update docs and changelog.
9. Run full verification.
10. Deploy and run remote smoke.

## Risk Notes

- The main risk is leaking Werewolf identities through public readiness details.
- Reconnect must restore Werewolf private chat only to Werewolves.
- Dead Werewolves need careful handling after night or vote deaths.
- Phase reset logic can easily leave stale proposed targets or ready flags.
- Browser smoke needs role discovery helpers because role assignment is randomized.
- Avoid creating a second chat system if existing day chat patterns can be reused safely.
