# Miller Hollow V1 Design

Date: 2026-05-14

## Goal

Build the first playable online version of The Werewolves of Miller's Hollow for real human multiplayer rooms on the Cloudflare stack.

V1 focuses on one official-mode room size: an 8-player game using the base-game rules. The product must let 8 human players join the same room, receive private roles, play through night and day phases, vote, resolve deaths, and reach a win condition with the system acting as the moderator.

AI players are not part of V1 gameplay. The seat model will reserve a controller field so AI can be added later without redesigning the room state.

## Non-Goals

- No 6-player quick variant in V1.
- No custom player counts in V1.
- No custom role setup UI in V1.
- No AI-controlled players in V1.
- No voice or video chat in V1.
- No user accounts, OAuth, or persistent profiles in V1.
- No human moderator controls for rule adjudication.

## Product Scope

V1 supports anonymous nickname-based rooms. A player creates or joins a room, enters a nickname, receives a reconnect token in the browser, and occupies one of 8 seats.

The first playable mode is an 8-player official base-game mode. The architecture may keep generic fields such as `playerCount` and role presets, but V1 UI and tests must not expose or rely on non-8-player modes.

The system automatically moderates the entire game:

- Seat assignment
- Game start once the room is full
- Role assignment
- First-night setup phases
- Night role actions
- Day discussion timer
- Voting
- Death resolution
- Win-condition checks
- Timeout handling
- Reconnect handling

The room owner may create the room and start the game if the room is ready, but may not manually skip phases, kill players, revive players, alter votes, inspect hidden roles, or override rules.

## Rules Scope

The rules engine must implement the official-rule flow needed by the V1 8-player preset:

- Werewolf night kill
- Seer night vision
- Witch save and poison choices
- Day discussion
- Day vote
- Death resolution
- Village victory when all Werewolves are eliminated
- Werewolf victory when no non-Werewolf players remain

The project should also keep a role catalog for the base-game roles and concepts:

- Werewolf
- Ordinary Villager
- Seer
- Witch
- Hunter
- Cupid
- Thief
- Little Girl
- Captain / Sheriff

V1's default 8-player preset is the only playable setup. Roles outside that preset may exist in the catalog, but they must not affect gameplay until they have full official-rule behavior and tests.

Little Girl is not enabled in the default 8-player preset because its tabletop behavior is difficult to translate online without leaking timing or activity information.

The design should preserve official-rule intent. If a role is modeled but not enabled in the V1 preset, it must not affect gameplay.

## Recommended 8-Player Preset

The initial preset should be conservative:

- 2 Werewolves
- 1 Seer
- 1 Witch
- 4 Ordinary Villagers

This preset keeps the first version focused on the core loop: hidden teams, nightly werewolf kill, seer information, witch save/poison decisions, day discussion, voting, and win detection.

Hunter, Cupid, Thief, Little Girl, and Captain are part of the base-game catalog but are not enabled in the initial preset. They are future official-mode work, not house rules.

## Architecture

Use the Cloudflare stack:

- Cloudflare Pages for the web UI.
- Cloudflare Worker for HTTP API entry points.
- One Durable Object instance per room.
- Durable Object WebSockets for real-time room updates.
- Durable Object storage for room snapshots and event metadata.
- A pure TypeScript game engine module for rules and state transitions.

The Durable Object owns room lifecycle and transport concerns. The game engine owns rules. The UI owns rendering and player input. These responsibilities should stay separate.

## Core Modules

### Game Engine

The game engine is a pure TypeScript module. It receives a game state plus a command and returns the next state plus events.

Responsibilities:

- Create initial game state from a preset.
- Shuffle and assign roles.
- Track phases.
- Calculate legal actions for each player.
- Apply night actions.
- Apply votes.
- Resolve deaths.
- Resolve role-triggered effects.
- Check win conditions.
- Produce public and private views.
- Provide timeout fallback commands.

The engine must not depend on Durable Object APIs, WebSocket APIs, browser APIs, wall-clock timers, or persistence APIs.

### Room Durable Object

The room Durable Object manages:

- Room creation and lookup.
- Seat state.
- Player sessions.
- Reconnect tokens.
- WebSocket accept and cleanup.
- Timer scheduling.
- Calling the game engine.
- Persisting room snapshots.
- Broadcasting state updates.
- Sending private views to each player.

The Durable Object stores full room state but never broadcasts full hidden state to all players.

### Web UI

The web UI includes:

- Create room screen.
- Join room screen.
- Lobby with 8 seats.
- Game screen with public player list.
- Private role panel.
- Day chat.
- Night action panel.
- Voting panel.
- System event log.
- End-game result screen.

The UI must clearly separate public information from private information. A player should only see role and action information that the rules allow.

## Data Model

Room state includes:

- `roomId`
- `status`
- `settings`
- `seats`
- `hostSeatId`
- `game`
- `connections`
- `createdAt`
- `updatedAt`

Seat state includes:

- `seatId`
- `nickname`
- `controller: "human" | "ai"`
- `playerTokenHash`
- `connectionStatus`
- `lastSeenAt`

Game state includes:

- `phase`
- `round`
- `players`
- `roles`
- `aliveStatus`
- `nightActions`
- `votes`
- `publicEvents`
- `privateEvents`
- `timers`
- `winner`

Hidden state stays inside the Durable Object and game engine. The UI receives derived views.

## Multiplayer Flow

1. A user creates a room.
2. The Worker routes the request to the room Durable Object.
3. The Durable Object creates an 8-seat lobby and returns a room URL.
4. Players join with nicknames.
5. Each browser receives a reconnect token.
6. When all 8 seats are occupied, the game can start.
7. The Durable Object initializes the game engine with the 8-player preset.
8. Each player receives a private role view.
9. The system advances through night and day phases.
10. Players submit actions through WebSocket messages.
11. The Durable Object validates the session, forwards commands to the engine, persists the result, and broadcasts updated views.
12. The game ends when the engine reports a winner.

## Chat

Day chat is real-time public chat for living players. Dead players cannot send public day chat messages in V1.

Night public chat is disabled. If the initial preset includes Werewolves, Werewolf players need a way to coordinate their night kill. V1 should support a private Werewolf night channel or shared Werewolf target selection UI visible only to living Werewolves.

Dead-player chat is not part of V1.

## Timeout Rules

Every interactive phase has a deadline. The system must be able to advance without human intervention.

Timeout behavior:

- Werewolf kill: if living Werewolves do not choose a valid target in time, the system randomly chooses a legal target.
- Seer: no vision if no target is selected in time.
- Witch: no potion is used if no action is selected in time.
- Day vote: missing votes count as abstentions.

Timeout decisions must be implemented in the game engine as explicit fallback commands so they are testable.

## Reconnect and Disconnect

Anonymous identity is maintained by a browser-held reconnect token.

If a player disconnects:

- Their seat remains reserved.
- Their connection status changes to disconnected.
- They can reconnect with the token.
- The game continues according to timers.
- The system does not grant the host manual control over their seat.

If a disconnected player misses an action, the timeout rule for that phase applies.

## Information Security

The system must prevent hidden-role leakage:

- Full game state is never sent to the browser.
- Each WebSocket receives only a player-specific view.
- Public events must not reveal hidden actions unless the rules require it.
- Server logs should avoid dumping full hidden game state in production mode.
- Reconnect tokens should be stored client-side as secrets and hashed server-side.

## Testing Strategy

Game engine tests:

- Role assignment for the 8-player preset.
- Legal action calculation for each phase.
- Werewolf kill resolution.
- Seer vision.
- Witch save and poison resolution.
- Day voting and abstention behavior.
- Death resolution.
- Win-condition checks.
- Timeout fallback commands.
- Public/private view filtering.

Durable Object integration tests:

- Create room.
- Join room.
- Reject joining a full room.
- Reconnect to an existing seat.
- WebSocket message validation.
- Broadcast public updates.
- Send private player views.
- Timer-driven phase advancement.

Frontend smoke tests:

- Create a room.
- Join with multiple browser contexts.
- Fill 8 seats.
- Start a game.
- Submit at least one night action.
- Submit day chat.
- Complete a vote.
- Observe a visible state transition.

## Future Work

After V1 is stable:

- Add AI-controlled seats.
- Add 8-18 player official presets.
- Add configurable official role setups.
- Add Little Girl online behavior if a faithful and non-leaky interpretation is selected.
- Add dead-player spectator chat.
- Add account-based identity.
- Add replay or event history tools.
- Add non-official quick variants such as 6-player rooms as clearly labeled house rules.
