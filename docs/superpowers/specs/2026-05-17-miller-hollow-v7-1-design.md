# Miller Hollow V7.1 Design

Date: 2026-05-17

## Goal

V7.1 finishes the product around the official basic rule experience before any AI companion work begins.

The project already supports official 8-18 player beginner presets, roleflow extensions, host trust modes, spectators, and V7 player-state clarity. The next step is not to add more roles or AI players as a product feature. The next step is to make the official basic game feel complete, rule-consistent, and understandable from room creation through endgame.

After this completeness gate passes, pause and discuss the concrete AI companion design before implementing AI companions.

## Product Position

V7.1 is a polish and correctness release.

It should answer:

- Can a normal player create or join an official basic room and understand the setup?
- Does the game flow match the official basic rules and documented online adaptations?
- Can players complete a whole game without host/developer explanation?
- Are voting, deaths, win conditions, reconnect states, and logs clear enough?
- Are AI/demo controls still isolated from normal product play?

## Official Basic Scope

The official basic product path is:

- 8-18 players.
- Werewolves.
- Fortune Teller / internal `seer`.
- Ordinary Townsfolk / internal `villager`.
- No Witch, Hunter, Thief, Cupid, Little Girl, Sheriff, or custom role setup in the primary basic flow.

Existing roleflow and custom-role functionality can remain available, but V7.1 should keep the main product path focused on official basic rooms.

## Rule-Consistency Requirements

### Setup

- Create-room UI should make official basic rooms the clearest default path.
- Player count must map to the documented official basic role counts:
  - 8-11 players: 2 Werewolves, 1 Fortune Teller, remaining Ordinary Townsfolk.
  - 12-17 players: 3 Werewolves, 1 Fortune Teller, remaining Ordinary Townsfolk.
  - 18 players: 4 Werewolves, 1 Fortune Teller, remaining Ordinary Townsfolk.
- The lobby must show the selected role mix before the game starts.
- Normal players should not see custom role controls unless they are intentionally creating a non-basic room.

### Night

- Fortune Teller acts before Werewolves.
- Fortune Teller result is private to the Fortune Teller until endgame.
- Werewolves may discuss privately, recognize teammates, and choose one victim.
- If the Werewolves do not choose a victim in the official basic path, the documented online behavior must be clear.
- Public night summaries must not leak hidden role identity.

### Day

- Day discussion should be readable and easy to follow.
- Players should understand when discussion is open, when the room is waiting for readiness, and when voting begins.
- Voting should reveal final votes after resolution.
- Ties should produce no execution.
- Missing online votes should be documented as online abstentions.

### Endgame

- Win-condition copy should clearly state which team won and why.
- Endgame may reveal roles.
- The event log should make the final sequence understandable.

## Product Polish Requirements

### Main Flow

The primary create/join/play flow should be smooth on desktop and mobile:

- Create official basic room.
- Share room code.
- Join as player.
- Ready/start.
- Complete night action.
- Discuss.
- Vote.
- Resolve day/night cycle.
- End game.
- Start a new room if desired.

### Event Log

The system log should be useful without manual scrolling:

- Follow the newest event by default.
- Stop following when the user scrolls upward.
- Provide a `回到最新` affordance.
- Keep public log entries concise and Traditional Chinese.
- Keep hidden-information details out of public logs.

### Vote Reveal

After voting resolves:

- Show who voted for whom.
- Show abstentions if applicable.
- Show weighted results only when a rule gives vote weight.
- Show tie/no-execution copy clearly.
- Keep the layout readable on mobile.

### Waiting And Actions

The V7 waiting-state work should be tightened:

- Every phase should show what is expected next.
- A player who already acted should see that their action was received.
- Public-safe counts should be available where useful.
- Disabled actions should explain why they are disabled.

### Room Recovery

Reconnect and reload should feel normal:

- Player identity remains browser-held.
- A reloaded player should recover their role/action state.
- Invalid or expired sessions should show clear recovery copy.
- The app must never expose reconnect tokens.

## AI Boundary

V7.1 must not introduce AI companions.

Allowed:

- Existing dedicated-host AI test-player tools used for smoke testing and demos.
- Test-only helpers that are hidden from normal player rooms.
- Internal deterministic choices needed by automated tests.

Not allowed in V7.1:

- AI players presented as normal companions.
- AI strategy/chat meant to replace humans in normal rooms.
- AI matchmaking.
- AI personality settings.
- AI-generated hidden-information reasoning visible to players.

Before starting AI companion work, stop and discuss:

- Whether AI players are allowed in public rooms.
- How AI identity is labeled.
- Whether AI can receive hidden roles.
- How AI chat is generated.
- What data is sent to any model provider.
- How to avoid leaking hidden information.
- What cost/rate limits apply.

## UX Copy Requirements

All primary player-facing copy should be Traditional Chinese:

- Room creation and join flow.
- Lobby readiness.
- Role identity.
- Phase status.
- Night summaries.
- Day discussion and readiness.
- Vote reveal and tie/no-execution outcomes.
- Endgame results.
- Reconnect and error states.

Internal ids, test output, and developer diagnostics may remain English.

## Testing Requirements

Required verification:

- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run smoke:v1`
- `npm run smoke:browser`
- `npm run secrets:check`
- `npm run deploy:dry-run`

New or strengthened coverage should include:

- Official basic 8-18 role count assertions.
- Complete official basic game path through at least one endgame.
- Fortune Teller privacy.
- Werewolf teammate/chat/target privacy.
- Day vote reveal with execution.
- Day vote tie with no execution.
- Missing vote abstention behavior.
- Event log auto-follow behavior.
- Reload/reconnect recovery.
- Normal player rooms do not expose dedicated-host AI tools.

## Not V7.1

- New official roles.
- AI companions.
- Matchmaking.
- Accounts or persistent profiles.
- Ranked play.
- Full rules encyclopedia.
- Large visual redesign unrelated to the official basic game flow.

## Completion

V7.1 is complete when the official basic 8-18 player path is the primary product path, the implemented behavior is consistent with the project official-rules audit and documented online adaptations, players can complete a whole game without developer explanation, hidden information remains protected, and AI companion work has not started.
