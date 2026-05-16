# Miller Hollow V6 Implementation Plan

Date: 2026-05-16

Source design: `docs/superpowers/specs/2026-05-16-miller-hollow-v6-design.md`

## Objective

Separate player-host rooms from dedicated-host rooms so hidden-information observer access is never available to a participating player-host.

## Phase 1: Room Mode Data Model

Target files:

- `src/worker/room-state.ts`
- `src/worker/room-object.ts`
- `src/worker/index.ts`
- `src/web/main.ts`

Work:

- Add:

```ts
type HostMode = "player_host" | "dedicated_host";
```

- Add `settings.hostMode`.
- Default new rooms to `player_host`.
- Accept `hostMode` on `POST /api/rooms`.
- Normalize old room state with missing `hostMode` to `player_host`.
- Include `hostMode` in public room views.

Acceptance:

- Existing rooms load as `player_host`.
- New rooms without explicit mode are `player_host`.
- Public API exposes mode but no host secrets.

## Phase 2: Dedicated Host Identity

Target files:

- `src/worker/room-state.ts`
- `src/worker/room-object.ts`
- `src/worker/tokens.ts`

Work:

- Add dedicated host token hash storage separate from player seats:

```ts
hostTokenHash?: string;
```

- For `dedicated_host` rooms:
  - create a host token at room creation / initialization.
  - return it only to the creator.
  - do not occupy a player seat.
- For `player_host` rooms:
  - keep current join-as-host flow.
  - no separate host token.

Acceptance:

- Dedicated host can authenticate without a player seat.
- Host token is never present in public room view.
- Player reconnect tokens are not accepted as dedicated host tokens.

## Phase 3: Create And Join Flow

Target files:

- `src/worker/index.ts`
- `src/worker/room-object.ts`
- `src/web/main.ts`
- `src/web/copy.ts`

Work:

- Create-room UI adds explicit host mode choice:
  - `玩家房主（參與遊戲，不可查看隱藏資訊）`
  - `專職主持（不參與遊戲，可查看隱藏資訊）`
- Default selected mode is `player_host`.
- Player-host creation:
  - create room.
  - join creator as first player seat.
- Dedicated-host creation:
  - create room.
  - store host token in browser session.
  - do not join a player seat.
  - show lobby as host admin without a private player view.
- Join form remains for players.

Acceptance:

- Player-host flow remains one-click create-and-join.
- Dedicated-host room opens lobby with all seats empty.
- Dedicated host can copy invite links and start once seats are filled/ready.

## Phase 4: Observer Gate

Target files:

- `src/worker/room-object.ts`
- `src/web/main.ts`
- `src/web/copy.ts`
- `test` / smoke scripts

Work:

- Require `room.settings.hostMode === "dedicated_host"` for:
  - `/observer-state`
  - `/observer-ticket`
  - `/observer-socket`
- Authenticate dedicated host with host token.
- Reject player-host observer access with:
  - `Player-host rooms cannot reveal hidden information`
- Update UI localizations:
  - `此房間為玩家房主模式，房主不可查看隱藏資訊。`

Acceptance:

- Player-host cannot get observer state.
- Player-host cannot get observer ticket.
- Dedicated host can open host console.
- Non-host still cannot open host console.

## Phase 5: Host Console Rename And Trust Copy

Target files:

- `src/web/main.ts`
- `src/web/copy.ts`
- `src/web/styles.css`
- `README.md`
- rules docs

Work:

- Rename UI copy from generic host observer to dedicated host console:
  - `主持後台`
  - `會揭露隱藏資訊`
- Show trust mode in:
  - lobby/player room meta.
  - spectator view.
  - dedicated host console.
- Add warning copy when opening dedicated host console.

Acceptance:

- Players can see whether hidden-info host exists.
- Dedicated-host rooms clearly disclose hidden-information visibility.
- Player-host rooms clearly state there is no hidden-info backend.

## Phase 6: Tests And Smoke

Target files:

- `scripts/smoke-v1.mjs`
- `scripts/browser-smoke-v1.mjs`
- `scripts/remote-smoke-v1.mjs`
- worker tests if introduced

Work:

- Update existing observer smoke:
  - player-host observer access should now be rejected.
- Add dedicated-host smoke:
  - create dedicated-host room.
  - fill seats with players.
  - start game.
  - verify dedicated host console sees roles.
  - verify players/spectators do not see roles.
- Keep public spectator hidden-info tests.
- Keep player-host regression tests.

Acceptance:

- API smoke covers both trust modes.
- Browser smoke covers visible trust labels and dedicated host console.
- Remote smoke remains compatible with default player-host mode.

## Phase 7: Version, Docs, Release

Target files:

- `package.json`
- `package-lock.json`
- `src/worker/index.ts`
- `CHANGELOG.md`
- `README.md`
- `docs/superpowers/rules/2026-05-15-miller-hollow-basic-edition-rules.md`
- `docs/superpowers/rules/2026-05-15-miller-hollow-hidden-info-matrix.md`
- `docs/superpowers/rules/2026-05-15-miller-hollow-view-contract.md`
- `docs/superpowers/impl/2026-05-15-miller-hollow-release-notes.md`

Work:

- Bump app version to `0.6.0`.
- Document trust modes.
- Document that player-host cannot see hidden information.
- Document dedicated host as a non-player moderator/demo mode.
- Run:
  - `npm run typecheck`
  - `npm test`
  - `npm run build`
  - `npm run smoke:v1`
  - `npm run smoke:browser`
  - `npm run secrets:check`
  - `npm run deploy:dry-run`
  - deploy and remote smoke when ready
- Commit and tag `v0.6.0`.

## Completion Definition

V6 is done when default player-host rooms have no hidden-information observer path, dedicated-host rooms support a non-player authenticated host console, trust mode is visible to players and spectators, and local plus remote verification pass.
