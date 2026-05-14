# Miller Hollow V1 PR Summary

Date: 2026-05-14

## Summary

This change builds the first playable V1 of Miller Hollow: an 8-player online Werewolves of Miller's Hollow room on Cloudflare Workers and Durable Objects.

The implementation includes a pure TypeScript rules engine, Durable Object room orchestration, WebSocket transport, reconnect tokens, per-player private views, a browser UI, unit tests, API/WebSocket smoke coverage, and browser smoke coverage.

## Scope

- Fixed 8-player preset:
  - 2 Werewolves
  - 1 Seer
  - 1 Witch
  - 4 Ordinary Villagers
- Anonymous nickname-based rooms.
- Human-only seats.
- Host starts only after all 8 seats are filled.
- Automated phase progression and timeout fallback.
- Public day chat for living players.
- Hidden-role protection through public/private view separation.

## Not In Scope

- AI players.
- User accounts.
- Custom role setup.
- Non-8-player modes.
- Human moderator override controls.
- Voice/video chat.
- Dead-player chat.
- Spectator mode.

## Verification

Run:

```bash
npm run typecheck
npm test
npm run build
npm run smoke:v1
npm run smoke:browser
```

Current verified result:

- `npm run typecheck`: pass
- `npm test`: pass, 12 tests
- `npm run build`: pass
- `npm run smoke:v1`: pass
- `npm run smoke:browser`: pass

## Review Notes

- `src/engine` is deliberately pure TypeScript and does not import Worker, WebSocket, DOM, storage, or timer APIs.
- `src/worker/room-object.ts` owns transport, persistence, reconnect, broadcast, and timer concerns.
- Public room state omits `playerTokenHash` and private views.
- Public game state omits player roles until endgame.
- WebSocket messages cannot trigger moderator-only vote resolution; vote resolution happens when all living players vote or when the Durable Object alarm fires.
- V1 uses WebSocket query-string tokens for simplicity. The hardening follow-up is short-lived socket tickets.
