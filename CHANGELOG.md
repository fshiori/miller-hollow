# Changelog

## 0.7.0 - Player Experience And Demo Pacing

### Added

- V6.3 design and implementation documents for paced AI demo controls.
- V7 design and implementation documents for formal player experience work.
- Explicit AI demo step types for night actions, day chat, day readiness, voting, reactions, and auto mode.
- Dedicated-host AI demo controls with single-step buttons and a browser-side 5-second auto-step loop.
- Player-facing waiting-state panel, phase timeline, and compact room rules reference.
- Browser smoke assertions for rules reference, phase timeline, waiting-state copy, and AI demo control isolation.

### Changed

- AI day chat no longer also readies players or advances directly to voting.
- AI demo controls are restricted to dedicated-host rooms.
- Player-host rooms no longer show AI demo controls.
- Player actions show a transient submitting state while waiting for server confirmation.
- App version reports `0.7.0`.

## 0.6.2 - Hosted Game Flow

### Added

- Host controls to fill empty lobby seats with AI test players and trigger AI actions during live games.
- AI smoke coverage for a dedicated-host room that reaches discussion, voting, and public vote reveal.
- System log follow mode with a jump-to-latest control when the user scrolls up.
- V6.2 design and implementation documents.

### Changed

- Host tools now expose phase-oriented controls for AI progression alongside discussion/vote fast-forward.
- API smoke now covers AI-driven hosted observation in addition to manual player flows.
- App version reports `0.6.2`.

## 0.6.1 - Official Rules Cleanup

### Added

- Official rulebook audit for implemented roles, terminology, phase flow, and online adaptations.
- Focused tests for Thief not being dealt and canonical Traditional Chinese role terminology.

### Fixed

- Thief setup now follows the rulebook model: enabling Thief adds two extra Ordinary Townsfolk cards, the two undealt cards become Thief's hidden choices, and double-Werewolf spare cards force Thief to choose Werewolf.
- Witch can now use the poison potion on themselves, matching the rulebook.

### Changed

- Player-facing Ordinary Townsfolk / Villager copy now uses `普通村民`.
- App version reports `0.6.1`.

## 0.6.0 - Host Trust Modes

### Added

- Explicit room host modes: default `player_host` and opt-in `dedicated_host`.
- Dedicated host identity with a separate host token hash that does not occupy a player seat.
- Dedicated host console access for hidden-information moderation/demo views.
- Public room trust labels so players and spectators can see whether a dedicated host can view hidden information.
- API smoke coverage for player-host observer rejection and dedicated-host observer access.
- V6 design and implementation documents.

### Changed

- Player-host rooms can no longer open hidden-information observer state, tickets, or sockets.
- Host observer UI copy is now `主持後台` and is reserved for dedicated-host rooms.
- Dedicated-host rooms cannot transfer hosting to a player seat.
- App version reports `0.6.0`.

## 0.5.3 - Cupid And Lovers

### Added

- `cupid` role support for custom roleflow rooms.
- `night_cupid` opening phase after Thief choice and before the normal first night.
- Cupid command, timeout fallback, private action state, and player UI for choosing two distinct Lovers.
- Lover partner identity in each Lover's private view.
- Heartbreak death chaining when one Lover dies.
- `lovers` win condition for cross-team Lovers as the final two living players.
- Host observer visibility for Cupid/Lovers state.
- Traditional Chinese copy for Cupid, Lovers, heartbreak, and Lovers victory.
- Engine tests for Cupid selection, Lover private info, heartbreak, and Lovers win.
- API smoke coverage for custom Cupid room setup.
- V5.3 design and implementation documents.

### Changed

- Custom roleflow setup now supports Cupid as a dealt role.
- Thief spare cards are derived during deal from the undealt cards.
- App version reports `0.5.3`.

## 0.5.2 - Thief Opening Choice

### Added

- `thief` role support for custom roleflow rooms.
- `thief_choice` opening phase before the normal first night.
- Custom setup support for Thief opening spare-card choice.
- Private Thief role-choice view and player action.
- Host observer visibility for Thief identity, spare cards, and chosen role.
- Engine test coverage for Thief choice.
- V5.2 design and implementation documents.

### Changed

- App version reports `0.5.2`.

## 0.5.1 - Pre-Room Custom Role Setup

### Added

- `custom_roleflow` room setup for pre-room role configuration.
- Rulebook-guided Werewolf and Seer / Fortune Teller recommendations for 8-18 players.
- Create-room UI controls for Werewolf, Seer, Witch, Hunter, Villager, and Sheriff toggle.
- Client-side warnings and submit blocking when Werewolf or Seer counts do not match the rulebook recommendation.
- Worker-side validation for custom role setup before room creation.
- Engine tests for custom roleflow validation and custom game creation.
- V5.1 design and implementation documents.

### Changed

- App version reports `0.5.1`.

## 0.5.0 - Hunter And Sheriff Role Flow

### Added

- `official_roleflow_8` preset with 2 Werewolves, 1 Fortune Teller, 1 Hunter, and 4 Ordinary Townsfolk.
- Official-style V5 night order for roleflow rooms: Fortune Teller, Werewolves, then Witch when present.
- Hunter death reaction phase with player UI, host observer visibility, timeout fallback, and chained win checks.
- Host-opened Sheriff election during day discussion, public Sheriff holder, weighted day vote, and Sheriff succession.
- Public weighted vote reveal rows showing Sheriff vote weight.
- Engine, API, browser, and remote smoke coverage for V5 roleflow.
- V5 design and implementation documents.

### Changed

- App version reports `0.5.0`.
- V5 roleflow Werewolf timeout without a selected target produces no Werewolf victim.

## 0.4.9 - Vote Reveal And Demo Flow Clarity

### Added

- Public post-resolution vote results with voter rows, tally, tie state, and execution result.
- Player, spectator, and host observer UI panel for `投票結果`.
- Host observer clarity for Werewolf target source and skipped Seer inspection state.
- Engine tests for vote result execution, ties, and abstentions.
- Smoke assertions that public/spectator views see resolved vote results but not live vote maps.
- V4.9 design and implementation documents.

### Changed

- App version reports `0.4.9`.
- API and browser smoke logs now identify V4.9.

## 0.4.8 - Host Observer Mode

### Added

- Host-authenticated `/room/:roomId/host-watch` observer route.
- Host-only observer ticket, observer state, and observer WebSocket APIs.
- Read-only host observer UI for roles, Werewolf chat, proposed target, readiness, votes, public timeline, and day chat.
- API and browser smoke coverage for host observer access and public spectator hidden-info boundaries.
- V4.8 design and implementation documents.

### Changed

- App version reports `0.4.8`.
- README and rules docs now distinguish public spectator mode from host observer mode.

## 0.4.7 - Werewolf Discussion And Phase Readiness

### Added

- Private Werewolf night chat for living Werewolves only.
- Shared Werewolf target proposal and per-Werewolf confirmation flow.
- Day discussion readiness so all living players can advance directly to voting.
- API and browser smoke coverage for Werewolf hidden-info boundaries and readiness advancement.
- V4.7 design and implementation documents.

### Changed

- Host fast-forward and timer timeout now use a valid proposed Werewolf target when one exists.
- App version reports `0.4.7`.

## 0.4.6 - Host Phase Fast-Forward

### Added

- Host-only phase fast-forward control for demo and low-friction table flow.
- `/host/advance-phase` room control for authenticated hosts.
- Smoke coverage for host-only fast-forward authorization and day discussion to vote advancement.

### Changed

- Browser smoke uses host fast-forward instead of waiting for the full day discussion timer.
- App version reports `0.4.6`.

## 0.4.5 - Traditional Chinese UX Polish

### Added

- Traditional Chinese copy layer for player-facing role, team, phase, status, preset, event, and error labels.
- Browser smoke assertions for core Traditional Chinese UI strings.
- V4.5 design and implementation documents.

### Changed

- Main create, join, lobby, spectator, gameplay, host tools, reconnect, day chat, vote, and endgame UI now renders in Traditional Chinese.
- Role summaries, private roles, Seer results, winner labels, and public timeline messages are localized in the browser UI.
- App version reports `0.4.5`.
- README and release notes now identify V4.5 as localization/UX polish, not a rules expansion.

## 0.4.0 - Official 8-18 Preset Foundation

### Added

- Official beginner presets for 8 through 18 players using Werewolves, Fortune Teller, and Ordinary Townsfolk.
- App-basic compatibility presets for the existing 8-12 player Witch workflow.
- Role metadata for implemented and future basic-edition roles.
- Public preset family, rules-source, display labels, and labeled role summaries.
- Local, browser, and remote smoke coverage for official 18-player rooms.
- V4 design and implementation documents.

### Changed

- New rooms default to `official_basic_8`.
- Player count is selected before room creation and fixed once the room exists.
- Official presets without a Witch skip directly from Fortune Teller resolution to day discussion.
- Legacy `basic_8` through `basic_12` ids remain accepted as app-basic aliases.
- README, rules, view-contract, and release notes now document the official 8-18 foundation.

## 0.3.5 - Multi-Count Basic Presets

### Added

- Basic presets for 8, 9, 10, 11, and 12 players.
- Create-room preset selection for 8-12 player rooms.
- Preset-based seat creation before players enter the lobby.
- Public preset summary with player count and role counts.
- Dynamic join capacity, ready counts, and start eligibility.
- Local smoke coverage for every supported preset.
- Remote smoke support for `MILLER_HOLLOW_PRESET_ID`, including non-8 deployments.
- V3.5 design and implementation documents.

### Changed

- Engine game creation now accepts a selected basic preset.
- Room state migrates older fixed-8 rooms to `basic_8`.
- Browser smoke now captures a 12-seat lobby layout in addition to the full play path.
- README scope now documents all supported basic presets.

## 0.3.0 - Basic Edition Complete

### Added

- Lobby ready/unready state and start eligibility.
- Start is blocked until all 8 occupied seats are ready.
- Public phase status and private player action state.
- Endgame reveal with winner, player roles, and public timeline.
- V3 design and implementation documents.
- Basic edition rules, phase table, view contract, hidden-information matrix, and host authorization matrix.
- Astro component and client module skeletons for future UI decomposition.

### Changed

- Player and spectator views now expose explicit readiness, phase status, and endgame-safe reveal fields.
- Browser and API smoke coverage now ready players before start.

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
