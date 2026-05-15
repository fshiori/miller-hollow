# Miller Hollow V4.5 Implementation Plan

Date: 2026-05-15

Source design: `docs/superpowers/specs/2026-05-15-miller-hollow-v4-5-design.md`

## Objective

Implement V4.5 as "Traditional Chinese UX Polish."

V4.5 should translate all player-facing UI to Traditional Chinese, standardize terminology, and improve copy clarity without changing game rules, public API field names, or internal ids.

## Implementation Principles

- Keep internal ids and API fields stable.
- Translate player-facing copy, not developer-facing code structure.
- Prefer a shared copy/label layer over scattered string literals.
- Keep wording concise enough for mobile.
- Do not expose app-basic Witch presets in the primary create-room UI.
- Do not add new roles in V4.5.

## Phase 1: Copy Inventory

Find all player-facing strings.

Target files:

- `src/web/main.ts`
- `src/web/styles.css` if pseudo-content or visible labels exist
- `src/engine/roles.ts`
- `src/engine/presets.ts`
- `src/worker/room-object.ts`
- `src/worker/index.ts`
- smoke scripts that assert visible text

Work:

- Inventory visible English strings.
- Separate player-facing strings from internal logs and test-only labels.
- Identify browser dialogs, form labels, button labels, role labels, phase labels, and error messages.

Acceptance checks:

- Inventory covers create/join, lobby, host tools, game phases, actions, spectator, reconnect, errors, and endgame.
- Internal event log names may remain English.

## Phase 2: Shared Terminology Helpers

Create or expand a small localization layer for UI labels.

Suggested target:

- `src/web/copy.ts`

Suggested exports:

```ts
export const roleLabels = {
  werewolf: "狼人",
  seer: "預言家",
  villager: "村民",
  witch: "女巫"
} as const;

export const phaseLabels = {
  lobby: "大廳",
  night_werewolves: "狼人夜晚",
  night_seer: "預言家夜晚",
  night_witch: "女巫夜晚",
  day_discussion: "白天討論",
  day_vote: "白天投票",
  ended: "遊戲結束"
} as const;
```

Work:

- Add role label helpers.
- Add phase label helpers.
- Add team label helpers.
- Add common button/action labels where reuse is high.
- Keep fallback behavior defensive for unknown ids.

Acceptance checks:

- UI no longer hard-codes role/phase English names in multiple places.
- Role summary uses Traditional Chinese labels.
- Endgame role reveal uses Traditional Chinese labels.

## Phase 3: Create / Join / Lobby Localization

Translate first-screen and lobby flows.

Work:

- Page title and tagline.
- Create form labels and button.
- Join form labels and button.
- Watch link.
- Room id label.
- Player count label and options.
- Room metadata.
- Seat status.
- Ready/unready controls.
- Start button and blocked reason.
- Host controls:
  - lock/unlock
  - spectators enabled/disabled
  - kick
  - transfer host
  - reset lobby/game where available
- Share/copy link controls.

Acceptance checks:

- Create-room UI is Traditional Chinese.
- Lobby can explain required seats and ready count in Traditional Chinese.
- Host-only actions remain clear and short.
- Mobile lobby has no clipped button text.

## Phase 4: Game Flow Localization

Translate active gameplay screens.

Work:

- Private role panel.
- Werewolf target form.
- Seer/Fortune Teller target form.
- Witch compatibility form, even though it is not in the primary official flow.
- Waiting states for non-acting players.
- Day chat placeholder and submit button.
- Vote form.
- Timer/phase labels.
- Submitted action state.
- Endgame winner and reveal copy.
- Public timeline headings.

Acceptance checks:

- Official 8-player flow is fully Traditional Chinese.
- App-basic Witch compatibility flow remains usable if entered through API or existing rooms.
- Spectator view has no private-role text and uses Traditional Chinese public labels.

## Phase 5: Error And Connection Copy

Translate user-facing errors and connection states.

Work:

- API error display in UI.
- Join/create validation messages.
- Reconnect status.
- WebSocket connection status.
- Invalid token / unauthorized user-facing text.
- Room full / locked / missing room messages.

Acceptance checks:

- Common failure paths show Traditional Chinese messages.
- Developer logs and API JSON keys remain stable.
- Smoke still validates invalid-token behavior without requiring English UI text.

## Phase 6: Browser Smoke Updates

Add visible Traditional Chinese assertions.

Target file:

- `scripts/browser-smoke-v1.mjs`

Work:

- Assert first screen contains `建立房間` and `加入房間`.
- Assert lobby contains `準備` and start controls in Traditional Chinese.
- Assert role labels include `狼人`, `預言家`, and `村民`.
- Assert spectator page uses `觀戰`.
- Assert day phase label uses `白天討論` or `白天投票`.
- Keep existing 18-player layout screenshot.
- Keep existing full official 8-player gameplay flow.

Acceptance checks:

- Browser smoke fails if major UI labels regress to English.
- Existing hidden-information checks remain intact.

## Phase 7: Documentation And Release Notes

Update release documentation.

Target files:

- `CHANGELOG.md`
- `README.md`
- `docs/superpowers/impl/2026-05-15-miller-hollow-release-notes.md`
- Optional rules terminology note in `docs/superpowers/rules/2026-05-15-miller-hollow-basic-edition-rules.md`

Work:

- Add V4.5 changelog entry.
- Add release notes with scope, verification, and deployment facts.
- Add README note that UI is Traditional Chinese while API/internal ids remain English.
- Update planned next version: V5 for gameplay expansion.

Acceptance checks:

- Changelog and release notes identify V4.5 as localization/UX polish.
- Docs do not imply V4.5 added new roles.

## Verification Plan

Before deploy:

```bash
npm run typecheck
npm test
npm run build
npm run smoke:v1
npm run smoke:browser
npm run secrets:check
npm run deploy:dry-run
```

After deploy:

```bash
MILLER_HOLLOW_BASE_URL=https://miller-hollow.fshiori.workers.dev MILLER_HOLLOW_PRESET_ID=official_basic_8 npm run smoke:remote:quick
MILLER_HOLLOW_BASE_URL=https://miller-hollow.fshiori.workers.dev MILLER_HOLLOW_PRESET_ID=official_basic_18 npm run smoke:remote:full
```

## Recommended Implementation Order

1. Add shared copy/label helpers.
2. Translate create/join and lobby.
3. Translate role, team, and phase labels.
4. Translate night/day/endgame action UI.
5. Translate spectator and reconnect states.
6. Translate common user-facing errors.
7. Update browser smoke string assertions.
8. Update README, changelog, and release notes.
9. Run full local verification.
10. Deploy and run remote smoke.

## Risk Notes

- Traditional Chinese text may be longer than English; check mobile and small buttons.
- Some current strings may be generated from internal ids; do not simply expose ids with capitalization.
- API JSON error strings may currently be shown directly in UI. If so, map common errors to localized UI messages instead of renaming API response keys.
- App-basic Witch compatibility screens still need translation even though users do not see them in the primary create-room flow.
- Browser smoke should assert important localized strings, but avoid making every punctuation mark a brittle test requirement.
