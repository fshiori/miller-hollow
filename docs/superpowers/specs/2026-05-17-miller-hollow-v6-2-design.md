# Miller Hollow V6.2 Design

Date: 2026-05-17

## Goal

V6.2 makes a hosted online game easier to run, observe, and test end to end.

V6 fixed the trust boundary between player-host and dedicated-host rooms. V6.1 corrected rule terminology and small rule mismatches. The next gap is operational: a host can start a room, but the table still needs smoother phase control, clearer waiting states, better voting visibility, and stronger simulated players for testing.

This release should make one full online game feel controllable without adding new roles.

## Product Principle

The app should always answer:

- What phase is the room in?
- Who can act now?
- What is public, private, or host-only?
- What can the host safely do next?

When players or AI do not act, the host should be able to move the game forward without breaking hidden information rules.

## Scope

V6.2 covers:

- Host phase controls for discussion, readiness, voting, and time skips.
- Day discussion readiness and host-controlled transition into voting.
- Vote reveal behavior after the vote resolves.
- Night Werewolf chat visibility and host console observability.
- System log auto-follow and readable message volume during active games.
- AI test players that can progress through a whole game for local and remote observation.
- Spectator and dedicated-host observer clarity during discussion, night, and vote phases.

## Host Controls

### Dedicated Host

Dedicated host can:

- Start the game when player requirements are satisfied.
- Advance from day discussion to voting.
- Fast-forward a timer or timeout the current phase.
- Trigger AI players to act when available.
- See hidden information in the host console.
- See full vote details after reveal.

Dedicated host cannot:

- Participate as a player.
- Send normal player chat.
- Hide the fact that they can see hidden information.

### Player Host

Player host can:

- Use normal room administration.
- Start the game.
- Fast-forward phases using public-safe controls.
- Participate as a player.

Player host cannot:

- See hidden information.
- Use dedicated-host-only test controls that expose hidden information.

## Phase Flow Requirements

### Night

- Werewolves can chat with each other during the Werewolf phase.
- Werewolf chat is visible only to Werewolves and dedicated-host console.
- Public spectators and non-Werewolf players cannot see Werewolf chat.
- The current actor group is clearly shown.
- If all required night actions are complete, the host may advance immediately.

### Day Discussion

- Day discussion starts after night resolution.
- Players may send public day chat.
- Players may mark themselves ready.
- The UI shows ready count and who is still not ready.
- Host can advance to voting once the room is in day discussion.
- If all living players are ready, the room should make the next action obvious.

### Voting

- During live voting, players can vote but vote targets remain hidden from normal players.
- Dedicated host may see live vote state because that room type explicitly permits hidden observation.
- When voting resolves, the table reveals each vote:
  - voter.
  - target.
  - abstain / timeout if applicable.
- The system log records a compact vote summary.
- Tie behavior remains aligned with the existing rules docs.

## AI Test Players

AI players are a testing and demo tool, not a ranked or production bot feature.

V6.2 should support host-triggered AI action for:

- Day discussion messages.
- Werewolf target choice.
- Seer investigation.
- Witch save / poison decision.
- Hunter shot when applicable.
- Voting.
- Ready-up during discussion.

AI behavior should be simple and deterministic enough for tests:

- Prefer legal living targets.
- Avoid impossible actions.
- Use seeded or stable selection in tests where possible.
- Keep hidden information boundaries intact.

## Spectator And Host Console Requirements

Public spectator view:

- Shows public phase, public chat, public system log, living/dead state, and revealed votes.
- Does not show roles, private night chat, live hidden votes, or unrevealed night choices.

Dedicated host console:

- Shows roles and private night action state.
- Shows Werewolf chat.
- Shows live vote state and final vote reveal.
- Makes it visually clear that hidden information is being displayed.

Player view:

- Shows private controls only for the current player's legal actions.
- Shows private Werewolf chat only for Werewolves.
- Shows public vote reveal only after resolution.

## UX Requirements

- System log should auto-follow new messages unless the user has intentionally scrolled up.
- Log controls should make it easy to jump back to the latest message.
- Host controls should be grouped by current phase, not scattered across the page.
- Phase and waiting-state copy should be Traditional Chinese.
- Vote reveal should be easy to scan on desktop and mobile.
- Do not add large tutorial blocks inside the game surface.

## API / Data Requirements

Use existing room state patterns where possible.

Likely additions:

- Discussion readiness state per living player.
- Vote reveal payload after resolution.
- AI action endpoint or host-only command.
- System log metadata for auto-follow and compact summaries.

Security requirements:

- Host-only commands must authenticate host identity.
- Dedicated-host-only commands must still check `settings.hostMode === "dedicated_host"` when hidden information is involved.
- Player-host rooms must not gain hidden observer data through AI or vote tooling.

## Testing Requirements

Required verification:

- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run smoke:v1`
- `npm run smoke:browser`
- `npm run secrets:check`
- `npm run deploy:dry-run`

New or updated coverage should include:

- Day discussion ready state and host advance to voting.
- Hidden live vote state before reveal.
- Public vote reveal after resolution.
- Werewolf chat visible to Werewolves and dedicated host only.
- System log auto-follow behavior in browser smoke.
- AI can run a full hosted test game without illegal actions.
- Player-host still cannot see hidden observer state.

## Not V6.2

- New roles.
- Player count expansion beyond current implemented presets.
- Full UI redesign.
- Ranked accounts or persistent player profiles.
- Sophisticated AI strategy.
- Replacing the engine.

## Completion

V6.2 is complete when a host can run a full online game with clear phase controls, players can discuss and vote with correct reveal behavior, Werewolf night chat remains private, logs stay usable during active play, AI test players can complete a game for observation, and tests cover the hidden-information boundaries.
