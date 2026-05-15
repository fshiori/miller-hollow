# Miller Hollow V4.7 Design

Date: 2026-05-15

Sources:

- V4 design: `docs/superpowers/specs/2026-05-15-miller-hollow-v4-design.md`
- V4.5 design: `docs/superpowers/specs/2026-05-15-miller-hollow-v4-5-design.md`
- V4.6 release notes: `docs/superpowers/impl/2026-05-15-miller-hollow-release-notes.md`

## Goal

V4.7 should make the existing official beginner game feel like an actual social deduction table by adding private Werewolf night discussion and player-driven phase readiness.

The release should not add new roles. It should improve the interaction model for roles and phases that already exist:

- Werewolves need a private night channel before choosing a victim.
- Werewolves need a visible shared target proposal.
- Werewolves need a way to confirm they are ready to end the night.
- Living players need a way to signal they are ready to move from day discussion to voting.
- The existing host fast-forward from V4.6 should remain as a host override, not the primary table flow.

## Why This Is V4.7

V4.6 added host fast-forward so demos and stuck rooms can advance. That solves tempo but not table agency.

The current Werewolf phase is still too mechanical:

- A Werewolf directly picks a victim.
- Other Werewolves may not have time or space to discuss.
- The app does not show whether the Werewolf team agrees.
- Non-Werewolf players simply wait without knowing whether the Werewolf team is still discussing.

V4.7 should add the missing social loop without expanding the role list.

## Version Boundaries

### V4.7: Werewolf Discussion And Phase Readiness

V4.7 should ship:

- Werewolf-only night chat.
- Werewolf shared target proposal display.
- Werewolf confirmation/readiness to end the Werewolf phase.
- Day discussion readiness for living players to move to vote.
- Public readiness counters that do not leak hidden roles.
- Spectator-safe hidden-information boundaries.
- Traditional Chinese UI copy for the new controls and messages.
- Smoke coverage for private Werewolf chat and phase readiness.

### V5: First Official Role Expansion

V5 should remain reserved for new gameplay roles after the core table flow is strong.

Candidate V5 work:

- Hunter.
- Sheriff / Captain.
- Cupid / Lovers.
- Thief.

## Non-Goals

- No Hunter, Sheriff, Cupid, Thief, Little Girl, or other new roles in V4.7.
- No public matchmaking.
- No accounts.
- No persistent player identity.
- No voice or video.
- No moderator-only interface.
- No endgame public reveal of Werewolf private chat in V4.7.
- No custom timer settings.
- No custom role setup.

## Product Model

V4.7 should introduce player readiness inside active phases.

There are two distinct concepts:

- Lobby ready: ready to start the game.
- Phase ready: ready to advance the current phase.

Phase readiness should reset whenever the phase changes.

## Werewolf Night Discussion

During `night_werewolves`, living Werewolves should see:

- A Werewolf-only chat panel.
- A target selector.
- The current proposed victim.
- Which living Werewolves have confirmed.
- A button to confirm or unconfirm readiness.

Werewolf target behavior:

- Any living Werewolf may propose a target.
- The proposed target is shared with all living Werewolves.
- Werewolves may change the proposed target before the phase advances.
- The proposed target must be a living non-Werewolf.
- If all living Werewolves confirm and a valid target exists, the phase advances immediately.
- If the timer expires before all confirmations, the current valid proposed target is used.
- If no valid target exists when the timer expires, the existing timeout fallback chooses a legal target.

Visibility:

- Living Werewolves can see night chat, proposed target, and Werewolf confirmations.
- Dead Werewolves should not send night chat or confirm.
- Non-Werewolf players cannot see night chat, proposed target, or confirmation identities.
- Spectators cannot see night chat, proposed target, or confirmation identities.
- Public state may show a generic counter such as `狼人正在討論：1/2 已確認`, but must not identify Werewolves.

## Day Discussion Readiness

During `day_discussion`, living players should see:

- Day chat, as today.
- A `準備投票` button.
- A readiness counter such as `5/7 已準備投票`.

Behavior:

- Any living player may mark ready or unready for vote.
- Dead players cannot mark ready.
- Spectators cannot mark ready.
- If all living players are ready, the phase advances to `day_vote` immediately.
- If the timer expires, the phase still advances to `day_vote`.
- Day discussion readiness resets when entering a new day discussion.

Public visibility:

- The ready counter is public.
- Individual ready state may be public because all living players are known during day.
- This must not expose hidden roles.

## Host Fast-Forward Relationship

V4.6 host fast-forward should remain:

- Host can still force advance a phase.
- Host fast-forward is a recovery/demo override.
- Player phase readiness is the normal table-driven path.

V4.7 UI should visually separate these:

- Player action: `準備投票`, `取消準備`
- Werewolf action: `確認目標`, `取消確認`
- Host tool: `快轉階段`

## Data Model Requirements

Room state needs phase-scoped interaction data.

Suggested room-level additions:

```ts
interface PhaseInteractionState {
  phase: Phase;
  werewolfChat: Array<{
    id: string;
    seatId: string;
    nickname: string;
    message: string;
    createdAt: number;
  }>;
  werewolfTargetId?: string;
  werewolfReadySeatIds: string[];
  dayReadySeatIds: string[];
}
```

Rules:

- Reset `werewolfChat`, `werewolfTargetId`, `werewolfReadySeatIds`, and `dayReadySeatIds` when the game enters a new phase, except when preserving chat for the current night display is explicitly needed.
- Do not persist reconnect tokens or private role state inside chat records.
- Keep messages capped by count and length.
- Reuse existing rate-limit patterns for chat.

## API And WebSocket Requirements

Preferred transport is existing player WebSocket messages.

New client messages:

```ts
{ "type": "werewolf_chat", "message": "..." }
{ "type": "propose_werewolf_target", "targetId": "seat-5" }
{ "type": "set_werewolf_ready", "ready": true }
{ "type": "set_day_ready", "ready": true }
```

Validation:

- Require authenticated player socket.
- Reject spectator sockets.
- Reject dead players.
- Reject Werewolf-only commands from non-Werewolves.
- Reject Werewolf chat outside `night_werewolves`.
- Reject day readiness outside `day_discussion`.
- Enforce message trimming, max length, and rate limits.

## View Contract Requirements

Public room view may include:

- Generic phase readiness counts.
- Day readiness by public seat id.
- Day readiness count and required count.

Public room view must not include:

- Werewolf chat.
- Werewolf target proposal.
- Werewolf ready seat ids if they identify Werewolves.

Private player view for Werewolves may include:

- Werewolf chat messages for the current night.
- Proposed target.
- Werewolf confirmation status.
- Legal Werewolf targets.

Private player view for non-Werewolves must not include:

- Werewolf chat.
- Proposed target.
- Werewolf confirmation status.

Spectator view must follow public room view only.

## UI Requirements

Werewolf private panel:

- Show `狼人討論`.
- Show private messages.
- Show message input.
- Show target selector.
- Show current proposed target.
- Show readiness counter.
- Show `確認目標` / `取消確認`.

Non-Werewolf night panel:

- Show a waiting message such as `等待狼人討論。`
- Do not show Werewolf-specific details.

Day discussion panel:

- Show day chat as today.
- Show `準備投票` / `取消準備`.
- Show readiness counter.

Host tools:

- Keep `快轉階段`.
- Avoid placing host fast-forward next to normal player readiness controls in a way that looks like the primary action for everyone.

## Security Requirements

The hidden-information boundary is the main risk.

V4.7 must prove:

- Spectator sockets never receive Werewolf chat.
- Non-Werewolf private views never receive Werewolf chat.
- Public room views never include Werewolf target proposal.
- Public room views never include Werewolf ready seat ids.
- Dead Werewolves cannot continue chatting or confirming.
- Reconnect restores correct private Werewolf discussion state only to Werewolves.

## Testing Requirements

Unit tests:

- Werewolf target proposal validates legal targets.
- All living Werewolves confirming advances to Seer.
- Non-Werewolves cannot submit Werewolf chat or readiness.
- Day readiness advances discussion to vote when all living players are ready.
- Phase readiness resets on phase change.

API / WebSocket smoke:

- Werewolf chat is accepted from Werewolves.
- Werewolf chat is rejected from Villagers.
- Spectator receives no private Werewolf data.
- Werewolf target proposal is visible only in Werewolf private view.
- Day readiness can advance to voting without waiting for timer.
- Host fast-forward still works.

Browser smoke:

- Werewolf page can send private chat.
- Another Werewolf sees the chat.
- Villager page does not see the chat.
- Spectator page does not see the chat.
- Day discussion shows `準備投票`.
- All living players ready advances to `白天投票`.

## Documentation Requirements

Update:

- `CHANGELOG.md`
- `README.md`
- `docs/superpowers/impl/2026-05-15-miller-hollow-release-notes.md`
- View contract doc for Werewolf private view and readiness visibility.
- Hidden-information matrix for Werewolf chat and target proposal.
- Basic edition rules doc to mention Werewolf discussion and phase readiness.

## Completion Criteria

V4.7 is complete when:

- Werewolves can privately discuss at night.
- Werewolves can share and confirm a proposed victim.
- All living Werewolves confirming advances the phase.
- Living players can ready the day discussion into voting.
- Host fast-forward remains available as an override.
- Public, spectator, and non-Werewolf views do not leak Werewolf private state.
- Browser smoke proves the private chat boundary.
- Remote smoke still passes for official 8-player and 18-player rooms.
