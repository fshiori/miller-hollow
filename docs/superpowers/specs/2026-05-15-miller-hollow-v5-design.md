# Miller Hollow V5 Design

Date: 2026-05-15

Sources:

- V4 design: `docs/superpowers/specs/2026-05-15-miller-hollow-v4-design.md`
- V4.9 design: `docs/superpowers/specs/2026-05-15-miller-hollow-v4-9-design.md`
- Basic edition rules: `docs/superpowers/rules/2026-05-15-miller-hollow-basic-edition-rules.md`

## Goal

V5 should move beyond the current beginner flow by adding the first official special-role workflow layer:

- Hunter death reaction.
- Sheriff / Captain election, vote weight, and succession.
- Traditional Chinese player-facing UI for both role workflows.
- Host observer visibility for moderation and demos.
- Updated rules, hidden-information, and smoke coverage.

V5 should prove that the engine can handle role-triggered interrupts and weighted public voting without adding too many rule families at once.

## Why These Roles First

Hunter and Sheriff / Captain are the best first V5 roles because they stress the next missing engine capabilities:

- Hunter tests death-triggered reaction windows.
- Sheriff tests public office state, election flow, weighted vote resolution, and succession.
- Both are understandable in online play and do not require hidden pairings, alternate win conditions, or pre-game role choice.

Cupid, Thief, and Little Girl should not be included in V5.

## Version Boundaries

### V5: Hunter + Sheriff / Captain

V5 should ship:

- Hunter role metadata and preset support.
- Hunter shot phase when a living Hunter dies.
- Hunter shot UI and validation.
- Sheriff / Captain office state.
- Sheriff election flow.
- Sheriff vote weighting in day vote.
- Sheriff succession when the Sheriff dies.
- Host observer panels for Hunter and Sheriff state.
- Public vote reveal that clearly shows weighted Sheriff votes.
- Tests and smoke coverage for the new workflows.

### Not V5

- Cupid and Lovers.
- Thief opening role choice.
- Little Girl peeking mechanics.
- Elder, Scapegoat, Defender, or expansion roles.
- AI player strategy.
- Multi-language support beyond Traditional Chinese UI copy.
- Custom arbitrary role setup.

## Role Design

### Hunter

Hunter behavior:

- Hunter belongs to the village team.
- If Hunter dies during night or by day execution, the game enters a Hunter reaction phase before normal progression continues.
- Hunter may shoot one living player.
- In normal rules flow, Hunter should choose one living player to shoot.
- V5 may keep a host/timeout fallback that skips the shot only to prevent an abandoned online room from blocking forever. This fallback must be documented as an online operations behavior, not the official table rule.
- If Hunter is already unable to act because the game has ended, no reaction phase is required.
- If Hunter shoots the final Werewolf, Village wins.
- If Hunter shoots the final non-Werewolf and Werewolves reach parity or majority, Werewolves win.

Suggested phase:

```ts
"hunter_revenge"
```

Suggested state:

```ts
pendingHunterShot?: {
  hunterId: PlayerId;
  cause: "night" | "vote";
  resumePhase: Phase;
  resumeRound: number;
}
```

Rules:

- Only the dead Hunter can act in `hunter_revenge`.
- Legal targets are living players other than the Hunter.
- The shot is public after resolution.
- The shot should happen before the game advances to the next night/day phase.

### Sheriff / Captain

The project should use Traditional Chinese UI copy `警長`; internal code may use `sheriff`.

Sheriff behavior:

- Sheriff is an office, not a hidden role.
- Sheriff is publicly visible.
- Sheriff is elected by living players.
- Sheriff vote counts as 2 votes during day vote.
- If Sheriff dies, the dead Sheriff chooses a living successor.
- Sheriff may also have no successor if no legal living target remains.

Suggested phases:

```ts
"sheriff_election"
"sheriff_succession"
```

Suggested state:

```ts
sheriff?: {
  holderId?: PlayerId;
  electionVotes: Record<PlayerId, PlayerId | "abstain">;
  successionFromId?: PlayerId;
}
```

Election timing:

- V5 should let the host, meaning the room owner/moderator seat, open Sheriff election during `day_discussion`.
- The election should happen after night results are public and before day execution vote.
- This matches the rulebook's flexibility that the table may wait before voting on Sheriff.
- Smoke/demo should open Sheriff election at the start of the first day discussion so weighted voting is covered deterministically.
- Election uses public voting by living players.
- Ties elect no Sheriff for V5 unless the implementation chooses a deterministic runoff. Prefer no Sheriff on tie for the first version.
- If a Sheriff is successfully elected, no later re-election is allowed.
- If election resolves with no Sheriff because of tie or all abstentions, the host may open another Sheriff election during a later `day_discussion`.

Day vote weighting:

- During day vote resolution, if the Sheriff is alive and voted for a player, that vote contributes weight 2.
- If the Sheriff abstains, abstain receives weight 2 in the public tally, but abstain never executes.
- Vote reveal must show Sheriff weight clearly.

Suggested public vote row addition:

```ts
weight: number;
```

UI copy:

- `警長選舉`
- `投給警長`
- `警長：{player}`
- `警長票 x2`
- `警長移交`
- `選擇下一任警長`
- `不移交`

## Phase Flow

V5 should support these new phase paths:

1. Lobby starts.
2. V5 roleflow nights use the official order: Fortune Teller / Seer first, then Werewolves, then Witch if present.
3. Night deaths resolve and day discussion begins.
4. During `day_discussion`, the host may open `sheriff_election`.
5. Living players vote for Sheriff or abstain.
6. Election resolves and returns to `day_discussion`.
7. Existing day discussion to day vote flow continues.
8. If Hunter dies, enter `hunter_revenge`.
9. After Hunter action, check winner, then resume the phase that would have followed the death.
10. If Sheriff dies and living successors exist, enter `sheriff_succession`.
11. After succession, check winner, then resume the pending phase.

Werewolf timeout behavior:

- For official roleflow presets, if Werewolves do not choose a victim before timeout or host fast-forward, nobody dies from the Werewolf attack that night.
- Demo and smoke scripts should actively submit a Werewolf target; they should not rely on random timeout selection.
- The older random timeout target behavior may remain only for legacy app-basic compatibility if needed, but V5 roleflow should follow the rulebook.

If both Hunter reaction and Sheriff succession are triggered by the same death:

- Hunter reaction should resolve first if the dead player is Hunter.
- Sheriff succession should resolve after Hunter reaction if the dead player was also Sheriff.
- If Hunter shot kills the Sheriff, succession should be queued after the shot.

V5 should implement this with a small pending-reactions queue if a single pending field becomes fragile.

## Public View Contract

Public view may include:

- Current Sheriff holder id.
- Sheriff election phase status and aggregate counts.
- Resolved Sheriff election result.
- Whether Sheriff election is available during day discussion.
- Hunter shot public event after resolution.
- Vote result rows including vote weight.

Public view must not include:

- Hunter identity before endgame unless the player is dead and publicly reacting in `hunter_revenge`.
- Hidden roles before endgame.
- Live day vote map.
- Private action targets before submission resolves.

Host observer may include:

- Hunter identity.
- Pending Hunter action.
- Sheriff holder, election votes, missing election voters, and succession state.
- Weighted vote tally during day vote.
- Host-only control state for opening Sheriff election.

## UI Requirements

Player UI:

- Add role card copy for Hunter.
- Add Sheriff election action panel.
- Add Hunter revenge action panel.
- Add Sheriff succession action panel.
- Keep controls compact and mobile-safe.

Spectator UI:

- Show current Sheriff holder publicly.
- Show public phase status for election, revenge, and succession.
- Show resolved weighted vote result only after resolution.

Host observer UI:

- Show hidden Hunter role before endgame.
- Show pending Hunter target options and status.
- Show Sheriff election live votes.
- Show Sheriff vote weight in day vote.

Host UI:

- During `day_discussion`, show `開啟警長選舉` when no Sheriff has been elected yet.
- Hide the control after a Sheriff is elected.
- If an election ended with no Sheriff, allow the host to open another election during a later day discussion.

All new user-facing copy must be Traditional Chinese.

## Preset Strategy

V5 should not replace the V4 official beginner presets by default until the role mix is tested.

Add a V5 preset family:

- `official_roleflow_8`
- Optional 9-18 variants in a later version if role counts are explicitly designed.

Recommended first V5 8-player role mix:

- 2 Werewolves
- 1 Seer / Fortune Teller
- 1 Hunter
- 4 Villagers
- Sheriff is an elected office, not counted as a role card.

V5 can keep the default create-room preset as `official_basic_8` until the new roleflow preset is proven stable.

## Testing Requirements

Unit tests:

- Hunter death enters `hunter_revenge`.
- Hunter can shoot a living target.
- Host/timeout fallback can skip abandoned Hunter reaction without presenting skip as normal player rule.
- Hunter shot can end game.
- Sheriff election elects a holder.
- Sheriff election tie elects no Sheriff.
- Sheriff election can only be opened during day discussion.
- Sheriff election returns to day discussion after resolution.
- Sheriff vote counts as weight 2.
- Resolved vote result exposes row weights.
- Sheriff death enters succession.
- Sheriff succession assigns a new holder.
- Official roleflow night order is Seer/Fortune Teller before Werewolves.
- Official roleflow Werewolf timeout produces no kill.

API smoke:

- Create V5 roleflow room.
- Run first night in official order.
- Open Sheriff election from host controls during first day discussion.
- Elect Sheriff.
- Run night and day flow.
- Execute Hunter by vote.
- Submit Hunter shot.
- Assert public events and vote reveal.
- Assert public live vote map remains hidden.
- Assert host observer sees privileged election and reaction state.

Browser smoke:

- Drive Sheriff election in Chromium contexts.
- Verify `警長` visible publicly after election.
- Drive a weighted day vote.
- Verify `投票結果` shows Sheriff weight.
- Drive Hunter revenge action.

## Release Criteria

V5 is complete when:

- Hunter and Sheriff / Captain are playable through engine, API, and browser UI.
- Public hidden-info boundaries remain intact.
- Weighted vote reveal is visible after resolution.
- Host observer supports the new workflows.
- Rules, view contract, hidden-info matrix, README, changelog, release notes, and version are updated.
- Full local verification, deploy dry-run, deploy, and remote smoke pass.
