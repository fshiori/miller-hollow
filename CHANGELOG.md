# Changelog

## 0.1.0 - Miller Hollow V1

Initial playable V1 implementation.

### Added

- Cloudflare Worker, Durable Object, Vite, TypeScript, Vitest, and Playwright project scaffold.
- Pure TypeScript game engine for the fixed 8-player V1 preset.
- V1 preset roles: 2 Werewolves, 1 Seer, 1 Witch, and 4 Ordinary Villagers.
- Automated rules for Werewolf kill, Seer vision, Witch save/poison, day discussion, day voting, death resolution, timeout fallback commands, and win detection.
- Public and per-player private game views with hidden-role filtering.
- Anonymous room lifecycle with nickname seats, host start, reconnect tokens, token hashing, WebSocket updates, day chat, phase timers, and Durable Object alarms.
- Browser UI for create, join, lobby, private role view, night actions, day chat, voting, connection state, reconnect messaging, and end-game result.
- API/WebSocket smoke test via `npm run smoke:v1`.
- 8-browser-context UI smoke test via `npm run smoke:browser`.
- V1 design, implementation, hardening, and rule-decision documentation.

### V1 Decisions

- V1 supports exactly 8 human seats and no custom role setup.
- Any living Werewolf may submit the shared Werewolf target.
- Tied day votes execute no one.
- The Witch cannot poison themselves in V1.
- Night public chat and dead-player chat are disabled.
- Roles are revealed publicly only after endgame.

### Known Follow-Ups

- Replace WebSocket query-string tokens with short-lived socket tickets.
- Add rate limiting for room creation and message submission.
- Add deployment observability with explicit hidden-state redaction.
- Extend browser coverage with responsive screenshots and explicit disconnect/reconnect UI assertions.
