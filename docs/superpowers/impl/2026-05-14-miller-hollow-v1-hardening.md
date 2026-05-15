# Miller Hollow V1 Hardening Notes

Date: 2026-05-14

## Completed Hardening

- Added explicit V1 rule decisions for tied votes, Witch self-poison, Werewolf target selection, timeout behavior, and hidden information.
- Added engine tests for tied day votes and Witch self-poison rejection.
- Expanded `npm run smoke:v1` to cover:
  - Room creation
  - Eight successful joins
  - Ninth-player rejection
  - Invalid reconnect token rejection
  - Invalid private view token rejection
  - Valid reconnect to the same seat
  - Duplicate start rejection
  - Public-state hidden-role filtering
  - Token-hash filtering from public state
  - Private-view separation
  - Invalid night chat rejection
  - WebSocket night actions
  - Day chat
  - Durable Object alarm transition from discussion to vote
  - Vote submission and vote resolution
- Added UI connection state, reconnect messaging, server-error banner, and leave-room control.
- Added `npm run smoke:browser`, which uses 8 isolated Playwright Chromium browser contexts to exercise the real browser UI.
- Replaced reconnect-token WebSocket URLs with short-lived single-use socket tickets.
- Split timers into `production` and `smoke` profiles through `MILLER_HOLLOW_TIMER_PROFILE`.
- Added basic public abuse controls for room creation, socket-ticket creation, socket actions, and day chat.
- Added host-only diagnostics with redacted operational counters.
- Added redacted JSON event logs for joins, starts, resets, player actions, and game end.
- Documented local verification and deployment commands in `README.md`.

## V1 Security Boundaries

- Public room views do not include `playerTokenHash`.
- Public game views do not include player roles until `phase === "ended"`.
- Per-player private views are sent only through token-authenticated `/private` and WebSocket connections.
- Reconnect tokens are generated client-facing secrets and stored server-side only as SHA-256 hashes.
- WebSocket connections use single-use tickets issued through a token-authenticated HTTP endpoint.
- No production-path code logs full room snapshots or hidden game state.
- Diagnostics and logs must not include reconnect tokens, token hashes, socket ticket values, private views, or full room state.

## Remaining Future Hardening

These are outside the current V1 completion pass:

- Extend Playwright coverage with responsive layout screenshots and explicit disconnect/reconnect UI assertions.
