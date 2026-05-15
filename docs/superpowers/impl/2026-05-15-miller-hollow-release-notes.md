# Miller Hollow Release Notes

Date: 2026-05-15

This document is the fast human-readable version history. `CHANGELOG.md` remains the package-level changelog; this file summarizes what each completed milestone means in product terms.

## v0.1.0 - V1 Playable Core

First working 8-player online game.

Completed:

- Fixed 8-player basic preset: 2 Werewolves, 1 Seer, 1 Witch, 4 Villagers.
- Pure TypeScript rules engine.
- Cloudflare Worker API.
- One Durable Object per room.
- Durable Object storage for room/game state.
- Anonymous rooms and 8 seat lobby.
- Host start.
- Reconnect tokens stored as server-side hashes.
- Short-lived WebSocket tickets.
- Player WebSocket updates.
- Private role/action view per player.
- Public view filtering so hidden roles do not leak before endgame.
- Werewolf kill, Seer vision, Witch save/poison, day discussion, day vote, death resolution, timeout handling, and win detection.
- Day chat for living players.
- Basic browser UI.
- Local API smoke, browser smoke, build, tests, and dry-run deploy.
- First Cloudflare deployment.

Status:

- Playable.
- Basic UI.
- No spectator mode yet.
- No ready state yet.

## v0.1.1 - V1 Follow-Up Hardening

Made V1 safer and easier to operate.

Completed:

- `/api/health`.
- Basic public abuse controls:
  - room creation rate limit
  - socket-ticket rate limit
  - socket action rate limit
  - day chat rate limit
- Host-only redacted diagnostics.
- Redacted operational logs.
- Host room tools:
  - copy room link
  - diagnostics
  - reset non-playing room
- Remote smoke script.
- OSS files:
  - MIT license
  - contributing guide
  - GitHub issue and PR templates
- Deployment docs clarified that V1 does not need D1, KV, R2, Queues, or a separate database.

Status:

- Safer public deployment.
- Still basic UI.
- Still fixed 8-player only.

## v0.2.0 - V2 Public Play

Made rooms shareable and watchable.

Completed:

- Spectator mode.
- `/room/:roomId/watch`.
- Spectator WebSocket tickets.
- Spectator sockets receive public room views only.
- Spectators cannot submit player actions.
- Host controls:
  - lock/unlock room
  - enable/disable spectators
  - kick lobby seats
  - transfer host
  - reset lobby
- Join/watch direct navigation fallback.
- Copy join link and watch link.
- Public room settings for locked and spectators enabled.
- Diagnostics include active spectator count.
- Browser smoke covers spectator route and player refresh/reconnect.
- Remote smoke covers spectator hidden-info boundaries.
- V2 design and implementation docs.

Status:

- Public sharing flow works.
- Spectator safety is tested.
- UI still needed stronger structure and polish.

## v0.2.1 - Astro UI Shell

Moved the frontend onto Astro and improved the visual shell.

Completed:

- Astro installed and configured.
- Static Astro shell builds into Worker-served assets.
- `src/layouts/AppShell.astro`.
- `src/pages/index.astro`.
- Build changed from Vite-only to `astro build`.
- Browser UI restyled:
  - create/join screen
  - lobby seat grid
  - room meta chips
  - role panel
  - phase panel
  - host tools
  - mobile layout
- Worker, Durable Object, WebSocket, and engine behavior preserved.
- Secret scanner fixed for deleted files.

Status:

- Better UI foundation.
- Astro is present, but most live UI rendering still happens through the client TypeScript app.

## v0.3.0 - V3 Basic Edition Complete

Completed the 8-player basic edition without adding roles or player counts.

Completed:

- Lobby ready/unready.
- Host start blocked until all 8 seats are occupied and all players are ready.
- Public `startEligibility`.
- Public `phaseStatus`.
- Private `actionState`.
- Endgame reveal:
  - winner
  - all player roles
  - alive/dead status
  - public timeline
- Endgame reveal remains absent before game end.
- Player and spectator views expose safer derived fields instead of raw game state.
- Browser smoke updated for ready flow.
- API smoke updated for ready flow.
- Engine tests cover action state and endgame reveal.
- Astro component skeletons added for future decomposition.
- Client module skeletons added for future decomposition.
- V3 design and implementation docs.
- Rules/security docs:
  - Basic edition rules
  - Phase table
  - View contract
  - Hidden-information matrix
  - Host authorization matrix
- Deployed V3 to Cloudflare.

Status:

- Current deployed version.
- 8-player basic edition is feature-complete.
- No new roles.
- No new player counts.
- Next planned step is V3.5 for multi-count basic presets.

Deployment:

- URL: `https://miller-hollow.fshiori.workers.dev`
- App version: `0.3.0`
- Runtime build sha: `71ce1ad`
- Worker Version ID: `eaa813c3-28d4-4397-92c5-1e72b6f6a014`

## Planned Next Versions

### V3.5 - Multi-Count Basic Presets

Planned:

- Add 8/9/10/11/12-player basic presets.
- Still no new roles.
- Dynamic seat count.
- Dynamic role assignment.
- Host preset/player-count selection.
- Smoke coverage for each supported count.

### V4 - New Roles

Planned:

- Add official roles after basic presets are stable.
- Candidate roles:
  - Hunter
  - Captain / Sheriff
  - Cupid
  - Thief
- Little Girl requires a separate online-safety design pass.

