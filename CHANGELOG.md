# Changelog

## 0.2.1 - Astro UI shell

### Changed

- Migrated the frontend build to Astro static output.
- Reworked the browser UI shell, lobby seats, room metadata, role panel, phase panel, and host tools styling.
- Kept Worker, Durable Object, WebSocket, and rules engine surfaces unchanged.

### Fixed

- Secret scanner now skips deleted files still visible in git's staged/deleted listing.

## 0.2.0 - V2 public play

### Added

- Spectator mode with short-lived single-use spectator WebSocket tickets.
- Spectator sockets receive public room views only and cannot submit player actions.
- Host controls for locking and unlocking rooms, enabling and disabling spectators, kicking lobby seats, transferring host, and resetting non-playing lobbies.
- Join links and watch links for direct room sharing.
- Host UI controls for room sharing, spectator toggles, room locking, seat kick, and host transfer.
- Smoke coverage for spectator hidden-info boundaries and host-control authorization.
- V2 design and implementation documentation.

### Changed

- Room settings now include public `locked` and `spectatorsEnabled` flags.
- Diagnostics now include active spectator counts and safe room settings.
- `/api/health` reports version `0.2.0`.

## 0.1.1 - V1 follow-up hardening

### Added

- Host-only redacted room diagnostics.
- Host room tools for copying room links and resetting non-playing rooms.
- Redacted operational event logs for joins, starts, resets, player actions, and game end.
- Smoke coverage for diagnostics authentication and reset authorization.

### Changed

- Remote room links now prefill the join form from `/room/:roomId`.
- Follow-up documentation now treats rate limits and redacted observability as completed V1 hardening.

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
- Short-lived single-use WebSocket tickets.
- Production and smoke timer profiles.
- Basic rate limits for room creation, socket-ticket creation, socket actions, and day chat.
- Host-only redacted diagnostics and redacted operational event logs.
- Host room tools for copying room links and resetting non-playing rooms.
- Remote deployment smoke test via `npm run smoke:remote`.

### V1 Decisions

- V1 supports exactly 8 human seats and no custom role setup.
- Any living Werewolf may submit the shared Werewolf target.
- Tied day votes execute no one.
- The Witch cannot poison themselves in V1.
- Night public chat and dead-player chat are disabled.
- Roles are revealed publicly only after endgame.

### Remaining Follow-Ups

- Extend browser coverage with responsive screenshots and explicit disconnect/reconnect UI assertions.
- Add a staging environment if maintainers need separate preview and production deployments.
