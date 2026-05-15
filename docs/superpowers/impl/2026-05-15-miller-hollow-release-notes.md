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

## 0.3.5 - V3.5 Multi-Count Basic Presets

Status:

- Deployed.
- Basic edition remains the feature baseline.
- No new roles.

Completed:

- Added `basic_8`, `basic_9`, `basic_10`, `basic_11`, and `basic_12`.
- Added shared preset helpers for engine, room state, public views, and tests.
- Updated game creation to assign roles from the selected preset.
- Added room-state migration for older fixed-8 rooms.
- Added create-room preset selection.
- Added preset-based seat creation, dynamic join capacity, ready counts, and start eligibility.
- Added public preset summary with role counts only, not assigned roles.
- Updated create-room flow to select player count before opening the room.
- Updated the browser lobby to show selected preset, role mix, and dynamic seat counts.
- Expanded local smoke to create, fill, ready, start, and verify role counts for every supported preset.
- Added remote smoke support for `MILLER_HOLLOW_PRESET_ID=basic_12`.
- Updated README and changelog.

Verification:

- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run smoke:v1`
- `npm run smoke:browser`
- `npm run secrets:check`
- `npm run deploy:dry-run`
- `MILLER_HOLLOW_BASE_URL=https://miller-hollow.fshiori.workers.dev MILLER_HOLLOW_PRESET_ID=basic_8 npm run smoke:remote:quick`
- `MILLER_HOLLOW_BASE_URL=https://miller-hollow.fshiori.workers.dev MILLER_HOLLOW_PRESET_ID=basic_12 npm run smoke:remote:full`

Deployment:

- URL: `https://miller-hollow.fshiori.workers.dev`
- App version: `0.3.5`
- Runtime build sha: `local`
- Worker Version ID: `47850ce3-e5ab-4a70-9619-532e3d3a9827`
- Deployed at: `2026-05-15T05:49:43Z`
- Follow-up: player count is selected before room creation, not from inside an open lobby.
- Note: deployed from the current working tree with `npm run deploy`; code was not pushed or tagged.

## 0.4.0 - V4 Official 8-18 Preset Foundation

Status:

- Deployed.
- Basic edition remains the feature baseline.
- No new active special roles beyond the existing app-basic Witch workflow.

Completed:

- Added official beginner presets for 8-18 players:
  - Werewolves
  - Fortune Teller
  - Ordinary Townsfolk
- Added app-basic compatibility presets for the existing 8-12 player Witch workflow.
- Kept legacy `basic_8` through `basic_12` ids accepted as app-basic aliases.
- Changed new-room default to `official_basic_8`.
- Kept player count and preset selection before room creation, fixed after the room exists.
- Added role metadata for implemented roles and future basic-edition roles.
- Added public preset family, rules source, and labeled role summaries.
- Updated official no-Witch night flow to resolve deaths after the Fortune Teller action.
- Expanded unit tests, local smoke, browser smoke, and remote smoke coverage for official 18-player rooms.
- Updated README, changelog, rules, and view-contract docs.

Verification:

- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run smoke:v1`
- `npm run smoke:browser`
- `npm run secrets:check`
- `npm run deploy:dry-run`
- `MILLER_HOLLOW_BASE_URL=https://miller-hollow.fshiori.workers.dev MILLER_HOLLOW_PRESET_ID=official_basic_8 npm run smoke:remote:quick`
- `MILLER_HOLLOW_BASE_URL=https://miller-hollow.fshiori.workers.dev MILLER_HOLLOW_PRESET_ID=official_basic_18 npm run smoke:remote:full`

Deployment:

- URL: `https://miller-hollow.fshiori.workers.dev`
- App version: `0.4.0`
- Runtime build sha: `local`
- Worker Version ID: `31a71388-7cac-4d61-961b-84999454b54b`
- Deployed at: `2026-05-15T07:22:30Z`
- Note: deploy is from the current working tree; code is not pushed or tagged.

## 0.4.5 - V4.5 Traditional Chinese UX Polish

Status:

- Deployed.
- No rules changes.
- No new roles.

Completed:

- Added a browser-side Traditional Chinese copy layer for roles, teams, phases, statuses, presets, events, and common errors.
- Translated the primary player UI:
  - Create and join flow
  - Lobby seats and readiness
  - Host tools
  - Spectator view
  - Private role panel
  - Night actions
  - Day chat
  - Voting
  - Endgame reveal
  - Reconnect and connection status
- Kept API fields, internal ids, and developer diagnostics English for compatibility.
- Kept app-basic Witch presets as compatibility/API presets while translating their UI path.
- Added browser smoke checks for core Traditional Chinese labels.
- Added V4.5 design and implementation documents.
- Updated README and changelog.

Verification:

- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run smoke:v1`
- `npm run smoke:browser`
- `npm run secrets:check`
- `npm run deploy:dry-run`
- `MILLER_HOLLOW_BASE_URL=https://miller-hollow.fshiori.workers.dev MILLER_HOLLOW_PRESET_ID=official_basic_8 npm run smoke:remote:quick`
- `MILLER_HOLLOW_BASE_URL=https://miller-hollow.fshiori.workers.dev MILLER_HOLLOW_PRESET_ID=official_basic_18 npm run smoke:remote:full`

Deployment:

- URL: `https://miller-hollow.fshiori.workers.dev`
- App version: `0.4.5`
- Runtime build sha: `local`
- Worker Version ID: `a9b56ca6-6ebc-42c1-b0fe-309a15cc7969`
- Deployed at: `2026-05-15T08:13:04Z`
- Note: deploy is from the current working tree; code is not pushed or tagged.

## 0.4.6 - V4.6 Host Phase Fast-Forward

Status:

- Deployed.

Completed:

- Added host-only `/host/advance-phase`.
- Added a Traditional Chinese host tool button: `快轉階段`.
- Fast-forward behavior:
  - Day discussion advances to day vote.
  - Day vote resolves with missing votes as abstentions.
  - Night phases use the existing timeout fallback command.
- Added smoke coverage for host-only authorization and day discussion fast-forward.
- Updated browser smoke to use fast-forward instead of waiting for the full discussion timer.

Verification:

- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run smoke:v1`
- `npm run smoke:browser`
- `npm run secrets:check`
- `npm run deploy:dry-run`

Deployment:

- URL: `https://miller-hollow.fshiori.workers.dev`
- App version: `0.4.6`
- Runtime build sha: `local`
- Worker Version ID: `f630f42b-e7eb-4514-9dab-9d17c9b9ef2c`
- Deployed at: `2026-05-15T08:37:49Z`
- Note: deploy is from the current working tree; code is not pushed or tagged.

## 0.4.7 - V4.7 Werewolf Discussion And Phase Readiness

Status:

- Deployed.

Completed:

- Added private Werewolf night chat for living Werewolves.
- Added shared Werewolf target proposal and per-Werewolf confirmation.
- Werewolf night advances when all living Werewolves confirm a valid proposed target.
- Added living-player day readiness for advancing from day discussion to day vote.
- Host fast-forward and timer timeout use a valid proposed Werewolf target when one exists.
- Preserved hidden-information boundaries for public, spectator, and non-Werewolf private views.
- Updated API and browser smoke coverage for the V4.7 interaction flow.
- No new roles.

Verification:

- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run smoke:v1`
- `npm run smoke:browser`
- `npm run secrets:check`
- `npm run deploy:dry-run`
- `MILLER_HOLLOW_BASE_URL=https://miller-hollow.fshiori.workers.dev MILLER_HOLLOW_PRESET_ID=official_basic_8 npm run smoke:remote:quick`
- `MILLER_HOLLOW_BASE_URL=https://miller-hollow.fshiori.workers.dev MILLER_HOLLOW_PRESET_ID=official_basic_18 npm run smoke:remote:full`

Deployment:

- URL: `https://miller-hollow.fshiori.workers.dev`
- App version: `0.4.7`
- Runtime build sha: `local`
- Worker Version ID: `938f2ab2-dd9c-4611-aceb-94a78b7099d7`
- Deployed at: `2026-05-15T09:18:25Z`
- Note: deploy is from the current working tree; code is not pushed.

## Planned Next Versions

### V5 - Complete Official Role Flow

Planned:

- Add official special roles after the official 8-18 beginner preset foundation is stable.
- Candidate roles:
  - Hunter
  - Captain / Sheriff
  - Cupid
  - Thief
- Little Girl requires a separate online-safety design pass.
