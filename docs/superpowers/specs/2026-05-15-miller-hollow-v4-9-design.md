# Miller Hollow V4.9 Design

Date: 2026-05-15

Sources:

- V4.7 design: `docs/superpowers/specs/2026-05-15-miller-hollow-v4-7-design.md`
- V4.8 design: `docs/superpowers/specs/2026-05-15-miller-hollow-v4-8-design.md`
- V4.8 live demo findings from 2026-05-15

## Goal

V4.9 should tighten the hosted-game flow exposed during live testing:

- Vote details should remain hidden while voting is active, but should be publicly revealed after vote resolution.
- Night role phases should make pending or skipped action states clearer.
- Demo/control scripts should simulate real player choices for Werewolf, Seer, day discussion, and voting instead of relying on timeout fallback.
- Host observer should remain privileged, but public spectators should receive the same post-resolution vote result that players receive.

This version should not add new roles.

## Findings From The V4.8 Demo

The V4.8 host observer worked, but the session surfaced several UX and rules clarity gaps:

1. Public spectators correctly could not see Werewolf chat.
2. Host observer correctly could see Werewolf chat.
3. If Werewolves did not propose a target, timeout fallback selected a random living non-Werewolf, but the UI did not make that fallback behavior obvious.
4. If Seer did not act, timeout fallback skipped inspection, but the host/demo flow made that look like a missing feature.
5. During voting, host observer could see the vote map, while public spectators could not. That was correct during active voting.
6. After voting resolved, there was no public "亮票" result showing who voted for whom.
7. Demo control should show realistic table behavior: night discussion, target proposal, Seer inspection, day discussion, and votes.

## Version Boundaries

### V4.9: Vote Reveal And Demo Flow Clarity

V4.9 should ship:

- Public vote reveal after day vote resolution.
- Vote reveal UI for players and public spectators.
- Host observer keeps live vote map during voting.
- Public view still hides live vote map during voting.
- Clear phase status/copy for skipped Seer inspection.
- Clear host observer context when Werewolf target was selected by timeout fallback.
- Demo smoke flow that actively performs Werewolf, Seer, day chat, and voting actions.

### Not V4.9

- No Hunter, Sheriff, Cupid, Thief, Little Girl, or new roles.
- No permanent replay archive.
- No public reveal of Werewolf chat after game.
- No public live vote map before voting resolves.
- No AI player framework.
- No host impersonation controls.
- No full moderator action console.

## Vote Reveal Model

V4.9 should distinguish live voting from resolved voting.

During `day_vote`:

- Public room view may show only aggregate status:
  - submitted count
  - required count
- Player private view may show own submitted state.
- Host observer may show full vote map, missing voters, and current tally.

After vote resolution:

- Public room view should include the resolved vote result for the most recent day vote.
- Spectators should see the same resolved result.
- Players should see the same resolved result.
- Host observer should continue to see resolved result plus any privileged context.

The reveal should answer:

- Who voted for whom.
- Who abstained.
- Final tally.
- Whether there was a tie.
- Who was executed, if anyone.
- Which round/day the vote belongs to.

## Data Model

The engine should retain public vote resolution records, not live mutable vote maps.

Suggested addition to `GameState`:

```ts
interface PublicVoteResult {
  id: string;
  round: number;
  votes: Array<{
    voterId: PlayerId;
    targetId: PlayerId | "abstain";
  }>;
  tally: Record<PlayerId | "abstain", number>;
  executedPlayerId?: PlayerId;
  tied: boolean;
  createdAt: number;
}
```

Suggested `GameState` field:

```ts
publicVoteResults: PublicVoteResult[];
```

Rules:

- Append one result when `resolve_vote` runs.
- Do not expose `state.votes` directly through public view.
- Keep `state.votes` as current live vote state during `day_vote`.
- Clear `state.votes` only when the next vote starts, as today.
- Public view can expose recent or all public vote results. V4.9 should start with all public vote results because games are short.

## Public View Contract

Public game view may include:

- `voteResults` after votes resolve.
- Each vote result's round, votes, tally, executed player, and tie status.

Public game view must not include:

- `votes` live map during `day_vote`.
- Missing voter identities during live voting.
- Host observer-only state.

## UI Requirements

Add a `投票結果` panel visible to players and spectators when at least one resolved vote exists.

Panel content:

- Round/day label.
- Vote rows:
  - `玩家 A → 玩家 B`
  - `玩家 C → 棄票`
- Final tally.
- Result line:
  - `處決：玩家 B`
  - or `平票，無人被處決`
  - or `無人被處決`

Placement:

- In player view, near the phase panel or below endgame panel.
- In spectator view, near the public timeline.
- In host observer view, keep current live vote map during `day_vote`, and also show resolved vote results after resolution.

Copy must be Traditional Chinese.

## Seer Action Clarity

The current engine correctly lets timeout skip Seer inspection. V4.9 should make this understandable:

- Host observer should show whether a living Seer exists.
- If Seer phase ends without target, public event copy should remain minimal, but host observer should show `預言家未查驗`.
- Private Seer view after skipped inspection should not falsely imply a result exists.
- Demo smoke should actively submit Seer inspection when a living Seer exists.

V4.9 does not need to publicly reveal Seer inspection results.

## Werewolf Fallback Clarity

If no proposed target exists and timeout fallback chooses a target:

- Host observer should indicate that the target came from timeout fallback.
- Public view should still not reveal the target until night deaths resolve.
- Werewolf private view may show current proposed target only during Werewolf night. After phase advances, proposed target is cleared as today.

Potential implementation options:

1. Add a night action source field, such as `werewolfTargetSource: "proposal" | "timeout"`.
2. Add a private/observer-only event when timeout chooses target.

V4.9 should choose the smallest durable model that supports host observer clarity without public leakage.

## Demo Flow Requirements

Local and browser smoke should stop relying on role timeouts for the main happy path.

Expected simulated table flow:

1. Start official 8-player room.
2. Werewolves send at least one private chat message.
3. Werewolves propose a target and confirm.
4. Seer inspects a target when alive.
5. Day discussion sends multiple chat lines.
6. Players ready into vote.
7. Players cast votes deliberately.
8. Public vote result appears after resolution.
9. Public spectator sees vote result but never sees live vote map or Werewolf chat.
10. Host observer sees live vote map during voting.

## Testing Requirements

API smoke:

- Assert public state during `day_vote` does not include live `votes`.
- Submit deliberate votes.
- Assert public state after resolution includes `voteResults`.
- Assert vote result contains each voter and target.
- Assert spectator receives vote result after resolution.
- Assert host observer still sees live votes during `day_vote`.
- Assert Seer action is actively submitted when living Seer exists.

Browser smoke:

- Drive a real vote.
- Assert `投票結果` appears after vote resolution.
- Assert public spectator sees `投票結果`.
- Assert public spectator does not see live vote rows before resolution.
- Assert host observer sees vote rows during active voting.

Unit tests:

- `resolve_vote` appends vote result.
- Tied vote result has `tied: true` and no `executedPlayerId`.
- Abstentions are included in tally.
- Public view includes vote results after resolution.
- Public view still does not include live `votes`.

## Release Criteria

V4.9 is complete when:

- Resolved votes are publicly visible as "亮票" results.
- Live votes remain hidden from public and spectators.
- Host observer still sees live votes.
- Seer action is actively exercised in smoke when possible.
- Werewolf timeout fallback is clearer in host observer.
- `npm run typecheck`, `npm test`, `npm run build`, local smoke, browser smoke, secret scan, dry-run deploy, deploy, and remote smoke pass.
