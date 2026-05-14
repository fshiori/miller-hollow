# Miller Hollow V1 Implementation Plan

Date: 2026-05-14

Source design: `docs/superpowers/specs/2026-05-14-miller-hollow-v1-design.md`

## Objective

Build the first playable 8-player online version of The Werewolves of Miller's Hollow on the Cloudflare stack.

V1 should support anonymous human multiplayer rooms, private role assignment, automated phase progression, night actions, day discussion, voting, death resolution, reconnect handling, and win detection.

The implementation must keep the game rules engine separate from Durable Object room orchestration and browser UI rendering.

## Implementation Principles

- Keep the rules engine pure TypeScript with no Cloudflare, WebSocket, browser, storage, or wall-clock dependencies.
- Treat the Durable Object as the owner of room lifecycle, sessions, timers, persistence, and transport.
- Send browsers only derived public and player-private views.
- Build only the official 8-player V1 preset in UI and tests.
- Keep non-enabled base-game roles in the catalog only; they must not affect gameplay.
- Prefer testable explicit commands over hidden side effects, especially for timeout behavior.

## Proposed Project Structure

```text
src/
  engine/
    commands.ts
    events.ts
    phases.ts
    presets.ts
    roles.ts
    state.ts
    views.ts
    reducer.ts
    random.ts
    index.ts
  worker/
    env.ts
    index.ts
    room-object.ts
    room-state.ts
    sessions.ts
    tokens.ts
    websocket.ts
  web/
    main.ts
    api.ts
    state.ts
    views/
      create-room.ts
      join-room.ts
      lobby.ts
      game.ts
      end-game.ts
    styles.css
test/
  engine/
  worker/
  web/
```

Exact framework and build tooling can be adjusted during scaffolding, but module boundaries should stay intact.

## Phase 1: Repository and Tooling Scaffold

Create the baseline TypeScript and Cloudflare project.

Deliverables:

- `package.json` with scripts for build, test, typecheck, dev, and deploy preview.
- `tsconfig.json` suitable for Worker and browser code.
- `wrangler.toml` with a Worker entry point and Durable Object binding.
- Static web entry files for Cloudflare Pages or Worker-served assets.
- Test framework configuration.
- Basic lint/format setup if it does not slow initial progress.

Acceptance checks:

- `npm test` runs.
- `npm run typecheck` runs.
- `npm run build` runs.
- A local Worker dev server can start.

## Phase 2: Pure Game Engine

Implement the core rules without networking or persistence.

Core types:

- `PlayerId`
- `Role`
- `Team`
- `Phase`
- `GameState`
- `GameCommand`
- `GameEvent`
- `PublicGameView`
- `PrivatePlayerView`

V1 preset:

- 8 players exactly.
- 2 Werewolves.
- 1 Seer.
- 1 Witch.
- 4 Ordinary Villagers.

Required engine behavior:

- Create a new game from the V1 preset.
- Shuffle and assign roles through injectable randomness.
- Track alive/dead status.
- Advance through first night and repeating night/day phases.
- Calculate legal actions per player.
- Apply Werewolf target selection.
- Apply Seer vision.
- Apply Witch save and poison choices.
- Resolve night deaths.
- Apply day votes.
- Treat missing day votes as abstentions on timeout.
- Resolve lynch death.
- Check Village and Werewolf win conditions.
- Produce public views with hidden roles removed.
- Produce per-player private views with only legal private information.
- Expose timeout fallback commands for Werewolf, Seer, Witch, and day vote.

Suggested phase flow:

```text
lobby_ready
night_werewolves
night_seer
night_witch
night_resolution
day_discussion
day_vote
day_resolution
ended
```

Acceptance tests:

- Role assignment matches the 8-player preset.
- Public views do not expose hidden roles before game end.
- Each player receives their own role in private view.
- Werewolves can see living teammate identity.
- Werewolf kill resolves unless saved by Witch.
- Witch save prevents the night kill once.
- Witch poison kills a selected living player once.
- Seer receives private target role information.
- Day vote kills the highest valid target.
- Missing votes become abstentions on timeout.
- Village wins when all Werewolves are dead.
- Werewolves win when no non-Werewolves remain.
- Timeout fallback commands are deterministic when supplied deterministic randomness.

## Phase 3: Room Durable Object

Implement anonymous room lifecycle and real-time transport.

Room responsibilities:

- Create an 8-seat room.
- Accept joins by nickname until full.
- Generate reconnect tokens and store only hashes server-side.
- Preserve a seat for disconnected players.
- Reconnect a browser to its existing seat by token.
- Start the game once the room is full and the host starts, or by a clear ready rule if selected during implementation.
- Own active WebSocket sessions.
- Validate each incoming command against the connected seat.
- Call the game engine reducer.
- Persist room snapshots and event metadata to Durable Object storage.
- Broadcast public views and send private player views individually.
- Schedule timers for interactive phases.
- Submit engine timeout fallback commands when deadlines expire.

HTTP endpoints:

- `POST /api/rooms`
- `POST /api/rooms/:roomId/join`
- `POST /api/rooms/:roomId/reconnect`
- `GET /api/rooms/:roomId/socket`

WebSocket message categories:

- Client to server:
  - `start_game`
  - `night_action`
  - `vote`
  - `day_chat`
  - `ping`
- Server to client:
  - `room_view`
  - `private_view`
  - `chat_message`
  - `system_event`
  - `error`
  - `pong`

Acceptance tests:

- Room creation returns a room id and join URL.
- Joining assigns the first available seat.
- Joining a full room is rejected.
- Duplicate reconnect with a valid token returns the same seat.
- Invalid token reconnect is rejected.
- WebSocket commands from an unknown or mismatched seat are rejected.
- Full hidden game state is never broadcast as a shared message.
- Phase timer expiration submits the expected engine fallback command.

## Phase 4: Browser UI

Implement the first playable browser experience.

Screens:

- Create room.
- Join room.
- Lobby with 8 seats.
- Game screen.
- End-game screen.

Game screen regions:

- Public player list with alive/dead and connection status.
- Private role panel.
- Current phase indicator and timer.
- Day chat.
- Werewolf shared target selection during Werewolf phase.
- Seer target selection during Seer phase.
- Witch save/poison controls during Witch phase.
- Voting controls during day vote.
- System event log.
- Result panel after game end.

UI constraints:

- Do not expose non-8-player modes.
- Do not expose custom role setup.
- Do not show roles in public player list before game end unless the engine view explicitly allows it.
- Disable dead-player public chat.
- Disable night public chat.
- Store reconnect token client-side.
- Automatically attempt reconnect when a saved token exists for the room.

Acceptance checks:

- A user can create a room and see the lobby.
- Eight browser contexts can join the same room.
- The lobby shows all occupied seats.
- The host can start when the room is full.
- Each player sees their private role.
- Werewolves can submit or coordinate a target without revealing it publicly.
- Seer and Witch controls appear only to the relevant player during their phase.
- Living players can chat during day discussion.
- Living players can vote during day vote.
- The end screen shows the winning team.

## Phase 5: End-to-End Smoke Coverage

Add a minimal browser smoke test that exercises the actual multiplayer loop.

Scenario:

1. Create a room.
2. Join with 8 browser contexts.
3. Start the game.
4. Confirm each context receives a role view.
5. Submit Werewolf, Seer, and Witch actions for one night.
6. Observe transition to day discussion.
7. Send one valid day chat message.
8. Submit day votes or trigger vote timeout.
9. Observe a state transition after vote resolution.

Acceptance checks:

- The smoke test passes locally.
- No browser context receives another player's private role in pre-endgame state.
- The game can advance without manual server intervention.

## Phase 6: Hardening and Deployment Readiness

Close gaps before treating V1 as playable.

Tasks:

- Review hidden-information boundaries.
- Review reconnect token hashing and storage.
- Ensure production logs do not dump full hidden state.
- Add basic error handling for malformed WebSocket messages.
- Add clear client retry behavior for transient WebSocket disconnects.
- Confirm Durable Object storage snapshots are sufficient for restart recovery.
- Document local dev and deployment commands.

Acceptance checks:

- Typecheck, unit tests, integration tests, and smoke tests pass.
- Local dev instructions are documented.
- Deployment configuration points to the correct Worker and Durable Object binding.

## Initial Build Order

1. Scaffold TypeScript, Worker, Durable Object, and web app.
2. Implement engine state, roles, preset, reducer, and view filtering.
3. Add engine unit tests until the V1 rules loop is covered.
4. Implement room creation, joining, reconnect tokens, and seat state.
5. Add Durable Object WebSocket transport and per-player view broadcast.
6. Add timers and timeout fallback command submission.
7. Build the browser lobby and game screens against the real API.
8. Add integration and browser smoke tests.
9. Harden hidden-information and reconnect behavior.

## Explicit V1 Exclusions

- AI-controlled players.
- Account login or persistent profiles.
- Non-8-player modes.
- Custom role setup UI.
- Human moderator override controls.
- Voice or video chat.
- Dead-player chat.
- Spectator mode.
- Replay tooling.
- Official roles not in the V1 preset affecting gameplay.

## Open Implementation Decisions

These should be decided during scaffold or early implementation:

- Whether the host must explicitly start after 8 seats are full, or the room auto-starts once full.
- Whether static assets are served by Pages separately or by the Worker during local V1 development.
- Exact timer lengths for local testing and default play.
- Whether Werewolf coordination uses chat, shared target selection, or both.
- Whether tied day votes cause no death, randomized death, or another official-rule-compatible resolution.

For V1, choose the simplest option that is testable and does not create hidden-information leakage.
