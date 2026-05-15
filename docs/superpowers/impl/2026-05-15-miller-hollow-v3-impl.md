# Miller Hollow V3 Implementation Plan

Date: 2026-05-15

Source design: `docs/superpowers/specs/2026-05-15-miller-hollow-v3-design.md`

## Objective

Implement V3 as "Basic Edition Complete" for the existing 8-player Miller Hollow game.

V3 should complete the basic product experience without adding roles or player counts. It should improve maintainability, lobby flow, action-state feedback, endgame replay, host/spectator polish, reconnect behavior, documentation, and regression coverage.

## Implementation Principles

- Do not add roles in V3.
- Do not add player counts in V3.
- Keep the current 8-player basic preset.
- Do not weaken hidden-information boundaries.
- Treat public/private/spectator view contracts as explicit API contracts.
- Prefer derived view fields over exposing raw engine state.
- Keep Astro components presentational where possible and keep client state/actions in TypeScript modules.

## Phase 1: UI Component Architecture

Break the current browser UI into maintainable modules.

Target deliverables:

- `src/components/AuthPanel.astro`
- `src/components/RoomHeader.astro`
- `src/components/RoomMeta.astro`
- `src/components/SeatGrid.astro`
- `src/components/SeatCard.astro`
- `src/components/RolePanel.astro`
- `src/components/PhasePanel.astro`
- `src/components/ActionPanel.astro`
- `src/components/HostTools.astro`
- `src/components/ChatPanel.astro`
- `src/components/EventLog.astro`
- `src/components/EndgamePanel.astro`
- `src/components/SpectatorShell.astro`
- Client modules:
  - `src/web/api.ts`
  - `src/web/app-state.ts`
  - `src/web/socket.ts`
  - `src/web/actions.ts`
  - `src/web/render.ts`

Acceptance checks:

- `src/web/main.ts` becomes an app entrypoint, not the owner of all markup.
- Existing create/join/start/play/watch flows still pass browser smoke.
- No Worker, Durable Object, or engine logic is moved into Astro components.

## Phase 2: Lobby Ready State

Add player ready/unready.

Data model:

```ts
interface SeatState {
  ready?: boolean;
  readyAt?: number;
}
```

Endpoints and socket messages:

- Player WebSocket message: `set_ready`
- Body: `{ ready: boolean }`
- Host start should require:
  - room status is `lobby`
  - all 8 seats are occupied
  - all occupied seats are ready
  - requester is host

Behavior:

- New joins default to `ready: false`.
- Reconnect preserves readiness.
- Kick/reset clears readiness.
- Starting the game clears or ignores readiness.
- Public room view includes ready state.

Acceptance checks:

- Host cannot start with unready players.
- Player can ready/unready.
- Ready state broadcasts to all players and spectators.
- Reconnect preserves ready state.
- Kick/reset clears ready state.

## Phase 3: Start Eligibility and Lobby UX

Expose derived start eligibility to the UI.

Public room view should include:

```ts
startEligibility: {
  canStart: boolean;
  occupiedSeats: number;
  readySeats: number;
  requiredSeats: 8;
  blockedReason?: string;
}
```

Acceptance checks:

- Host start button is disabled with a clear reason until eligible.
- Non-hosts see the same room readiness summary but no host-only start control.
- Spectators see readiness summary without controls.
- Smoke tests verify start is blocked before readiness and succeeds after readiness.

## Phase 4: Action State Views

Add explicit action state to private views and safe aggregate state to public views.

Private view additions:

```ts
actionState: {
  required: boolean;
  submitted: boolean;
  label?: string;
  waitingFor?: string;
  cannotActReason?: string;
}
```

Public view additions:

```ts
phaseStatus: {
  label: string;
  submittedCount?: number;
  requiredCount?: number;
}
```

Important security rule:

- Public `phaseStatus` must not reveal hidden-role identities before endgame.

Acceptance checks:

- Werewolf sees whether their group has submitted.
- Seer sees submitted state after choosing.
- Witch sees submitted state after choosing.
- Voters see submitted state after voting.
- Dead players see a cannot-act reason.
- Spectators see only public aggregate status.

## Phase 5: Endgame Reveal and Replay

Create an endgame-safe reveal model.

Engine or view layer should produce:

```ts
endgameReveal?: {
  winner: string;
  players: Array<{
    id: string;
    nickname: string;
    role: string;
    alive: boolean;
  }>;
  timeline: Array<{
    id: string;
    round: number;
    phase: string;
    message: string;
  }>;
}
```

Before endgame:

- `endgameReveal` must be absent from public and spectator views.

After endgame:

- Players and spectators may see all roles.
- Timeline may include revealed summaries.

Acceptance checks:

- Public state has no `endgameReveal` before endgame.
- Endgame state includes all player roles.
- Spectators can see endgame reveal after game end.
- Replay messages do not expose token/session data.

## Phase 6: Host and Spectator Polish

Organize host tools and spectator view.

Host UI sections:

- Share
- Lobby controls
- Seat controls
- Diagnostics

Spectator UI:

- Read-only header state.
- Public phase panel.
- Seat grid.
- Chat and event log without inputs.
- Endgame reveal after game end.

Acceptance checks:

- Host-only controls do not render for non-hosts.
- Spectator controls never include action forms or chat input.
- Disabling spectators disconnects existing watchers with a clear message.
- Browser smoke covers spectator refresh/reconnect.

## Phase 7: Reconnect and Multi-Connection Behavior

Harden reconnection.

Work:

- Bound reconnect retry delay.
- Clear stale error banners after successful reconnect.
- Preserve private view after refresh.
- Treat seat connected while at least one socket for that seat remains open.
- Verify multi-tab close does not mark the seat disconnected until all sockets close.

Acceptance checks:

- Refreshing one player restores the same role and action state.
- Closing one of two tabs for the same seat keeps the seat connected.
- Closing all tabs marks the seat disconnected.
- Spectator refresh reconnects public view.

## Phase 8: Rules and Security Docs

Add formal V3 rule/security docs.

Deliverables:

- `docs/superpowers/rules/2026-05-15-miller-hollow-basic-edition-rules.md`
- `docs/superpowers/rules/2026-05-15-miller-hollow-phase-table.md`
- `docs/superpowers/rules/2026-05-15-miller-hollow-view-contract.md`
- `docs/superpowers/rules/2026-05-15-miller-hollow-hidden-info-matrix.md`
- `docs/superpowers/rules/2026-05-15-miller-hollow-host-auth-matrix.md`

Acceptance checks:

- Docs identify every public/private/spectator field.
- Docs identify what becomes public only after endgame.
- Docs identify every host-control endpoint and authorization rule.
- Tests reference these contracts where practical.

## Phase 9: Verification Expansion

Add targeted regression coverage beyond smoke.

Worker/API tests:

- Ready/unready authorization.
- Start blocked until all ready.
- Start succeeds when full and ready.
- Public view readiness redaction is safe.
- Action-state public/private boundaries.
- Endgame reveal absent before endgame.
- Endgame reveal present after endgame.
- Host-control auth matrix.
- Spectator read-only matrix.

Browser smoke:

- Ready/unready lobby path.
- Start blocked reason.
- Start after all ready.
- Player refresh and reconnect.
- Spectator refresh and reconnect.
- Endgame reveal view.
- Desktop and mobile screenshots for lobby, game, spectator, and endgame.

Remote smoke:

- Quick mode: health, create, join, spectator, hidden-info checks.
- Full mode: full 8-player path through at least one day vote and endgame reveal if feasible.

## Release Plan

Target version: `0.3.0`.

Recommended sequence:

1. Split UI modules while preserving current behavior.
2. Add ready state to room model and public view.
3. Add ready/unready socket/API behavior.
4. Update lobby UI and browser smoke.
5. Add start eligibility view.
6. Add action state view fields.
7. Add endgame reveal and replay model.
8. Polish host/spectator/reconnect UX.
9. Add V3 rules/security docs.
10. Add targeted worker and browser regression tests.
11. Run full local gates.
12. Deploy with `npm run deploy:versioned`.
13. Run remote smoke.
14. Update deployment facts.
15. Commit and tag `v0.3.0`.

## Completion Gate

Before tagging V3, run:

```bash
npm run typecheck
npm test
npm run build
npm run smoke:v1
npm run smoke:browser
npm run smoke:remote:quick
npm run smoke:remote:full
npm run secrets:check
npm run deploy:dry-run
```

After deploy, run:

```bash
npm run smoke:remote:quick
npm run smoke:remote:full
```

V3 is not complete until readiness, action-state, endgame reveal, reconnect, spectator, and host-control contracts are covered by concrete tests or smoke assertions.

## V3.5 Preparation Notes

While implementing V3, avoid hard-coding assumptions that make V3.5 difficult.

Prepare for but do not ship:

- `playerCount` values other than 8.
- Preset ids other than the current 8-player basic preset.
- Seat grid that can handle 9-12 seats.
- Role assignment code that can accept a preset object.

V3.5 should be the release that actually enables multi-count basic presets.

