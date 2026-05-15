# Miller Hollow V4.8 Implementation Plan

Date: 2026-05-15

Source design: `docs/superpowers/specs/2026-05-15-miller-hollow-v4-8-design.md`

## Objective

Implement V4.8 as "Host Observer Mode."

The release should add a host-authenticated observer view that can see hidden game information for demos and moderation while preserving the existing public spectator hidden-information boundary.

## Implementation Principles

- Do not change public spectator semantics.
- Do not expose reconnect tokens, token hashes, or ticket hashes in observer payloads.
- Reuse existing host auth and short-lived ticket patterns.
- Keep observer sockets read-only.
- Keep UI copy Traditional Chinese.
- Keep the first version focused on visibility, not moderation actions.

## Phase 1: Observer Tickets

Target files:

- `src/worker/room-state.ts`
- `src/worker/room-object.ts`
- `src/worker/index.ts`

Work:

- Add `observerTickets: Record<string, ObserverTicket>` to `RoomState`.
- Add tolerant normalization for existing rooms.
- Add `ObserverTicket` with `expiresAt`.
- Add pruning helper similar to spectator tickets.
- Clear observer tickets on reset.
- Clear observer tickets on host transfer.
- Add route allow-list entries:
  - `observer-ticket`
  - `observer-socket`
  - `observer-state`

Acceptance checks:

- Existing rooms load without observer ticket state.
- Host can mint observer ticket.
- Non-host cannot mint observer ticket.
- Observer tickets are not present in public room view.

## Phase 2: Observer View Builder

Target files:

- `src/worker/room-object.ts`
- Optional type-only additions in `src/engine/views.ts`

Add a room-object-level method:

```ts
private observerRoomView(room: RoomState) {
  return {
    ...safe public room fields,
    observer: {
      players: [...roles and alive state...],
      phaseInteraction: {...hidden phase context...},
      votes: room.game?.phase === "day_vote" ? room.game.votes : undefined,
      nightActions: safeNightActionSummary(room),
      seerResults: room.game?.nightActions.seerViews,
      witch: app-basic potion state when relevant
    }
  };
}
```

Work:

- Include roles for every player before endgame.
- Include Werewolf chat and proposed target.
- Include Werewolf ready seat ids.
- Include day ready seat ids.
- Include vote map during day vote.
- Include missing voters and tally helper for UI.
- Include current night target summary for host observer.
- Explicitly omit all token/ticket/hash fields.

Acceptance checks:

- Observer view includes hidden gameplay state.
- Observer view does not include auth secrets.
- Public room view remains unchanged except for existing V4.7 public-safe fields.

## Phase 3: Observer APIs And Socket

Target files:

- `src/worker/room-object.ts`

Work:

- Add `createObserverTicket(request)`.
- Add `observerState(request)`.
- Add `openObserverSocket(request)`.
- Add `observerSessions = new Set<WebSocket>()`.
- Broadcast observer views from `broadcastRoom`.
- Reject all observer socket messages except `ping`.
- Send `pong` for observer `ping`.
- Send localized/server error for action attempts.
- Close observer sockets on host transfer and reset.

Suggested socket messages:

```json
{ "type": "observer_view", "room": { "...": "..." } }
{ "type": "pong" }
{ "type": "error", "error": "Host observers cannot act" }
```

Acceptance checks:

- Observer socket receives observer view.
- Observer socket cannot submit `night_action`, `vote`, `day_chat`, or readiness.
- Host transfer disconnects existing observer sockets.

## Phase 4: Frontend Route And Session Gate

Target files:

- `src/web/main.ts`
- `src/web/copy.ts`
- `src/web/styles.css`
- Astro route handling if a static page path needs explicit support.

Work:

- Recognize `/room/:roomId/host-watch`.
- Require local browser session for the same room.
- Fetch observer ticket with session `seatId` and `token`.
- Open observer WebSocket.
- Render `主持觀戰` UI.
- If auth fails:
  - Show `只有房主可以開啟主持觀戰。`
  - Link back to `/room/:roomId`.
- Ensure normal player and public spectator modes continue to work.

Acceptance checks:

- Host can open host-watch route.
- Non-host session is rejected.
- Browser without session is rejected.
- Public watch route is unaffected.

## Phase 5: Host Observer UI

Target files:

- `src/web/main.ts`
- `src/web/styles.css`

Sections:

- Header:
  - `主持觀戰`
  - room id
  - phase chip
  - timer
  - link back to room
  - copy public watch link

- Player table:
  - nickname
  - seat id
  - role
  - alive/dead
  - connection
  - host marker

- Hidden phase panel:
  - Werewolf night:
    - Werewolf chat
    - proposed target
    - confirmed Werewolves
  - Seer night:
    - Seer player
    - submitted state if available
  - Witch night:
    - victim
    - potion availability
  - Day discussion:
    - ready players
    - missing ready players
  - Day vote:
    - vote map
    - missing voters
    - current tally

- Logs:
  - public timeline
  - day chat

Acceptance checks:

- Host observer can inspect hidden state without scrolling away from the current phase.
- Logs auto-follow latest entries.
- Mobile layout remains usable.

## Phase 6: Hidden-Information Regression Tests

Target files:

- `scripts/smoke-v1.mjs`
- `scripts/browser-smoke-v1.mjs`
- Possibly `scripts/remote-smoke-v1.mjs`

API smoke additions:

- Mint observer ticket as host.
- Assert non-host observer ticket fails.
- Connect observer socket.
- Assert observer view includes roles before endgame.
- Send Werewolf chat.
- Assert observer view includes Werewolf chat.
- Assert public state and spectator socket do not include Werewolf chat.
- Advance to vote.
- Submit at least one vote.
- Assert observer view includes vote map.
- Assert public spectator does not include vote map.

Browser smoke additions:

- From host browser session, open `/room/:roomId/host-watch`.
- Assert `主持觀戰` renders.
- Assert role names render before endgame.
- Assert public spectator still has no private role.
- Assert observer log/chat panels auto-follow latest entries.

Acceptance checks:

- Existing V4.7 smoke still passes.
- New observer assertions fail if public spectator receives hidden data.

## Phase 7: Documentation And Versioning

Target files:

- `README.md`
- `CHANGELOG.md`
- `docs/superpowers/rules/2026-05-15-miller-hollow-view-contract.md`
- `docs/superpowers/rules/2026-05-15-miller-hollow-hidden-info-matrix.md`
- `docs/superpowers/rules/2026-05-15-miller-hollow-host-auth-matrix.md`
- `docs/superpowers/impl/2026-05-15-miller-hollow-release-notes.md`
- `package.json`
- `package-lock.json`
- `src/worker/index.ts`

Work:

- Bump app version to `0.4.8`.
- Add changelog entry.
- Update README testing/scope copy.
- Update view contract with host observer mode.
- Update hidden-info matrix with observer column or explicit observer rows.
- Update host auth matrix for observer ticket/state/socket.
- Add release notes after deployment.

Acceptance checks:

- Docs clearly distinguish public spectator from host observer.
- Release notes summarize hidden-info protections.

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

1. Add observer ticket state and route allow-list.
2. Add observer view builder.
3. Add observer ticket/state/socket APIs.
4. Add observer socket broadcasting.
5. Add host transfer/reset cleanup.
6. Add frontend route detection and auth gate.
7. Build host observer UI.
8. Add smoke assertions for observer and public spectator boundaries.
9. Update docs, changelog, README, and version.
10. Run verification, deploy, remote smoke.
11. Commit and tag `v0.4.8`; do not push unless requested.

## Risks

- Accidentally leaking observer fields into public room view.
- Forgetting to clear observer sockets on host transfer.
- Reusing player private view types in a way that includes auth-adjacent state.
- Browser route fallback may make `/host-watch` look like normal room route if path parsing is incomplete.
- Observer UI can become cluttered on mobile if hidden context is not grouped by phase.

## Completion Definition

V4.8 is done when a host can open a separate observer page, see all hidden gameplay state needed for moderation/demo, and the existing public spectator route still passes hidden-information regression tests.
