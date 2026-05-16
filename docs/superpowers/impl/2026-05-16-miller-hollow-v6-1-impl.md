# Miller Hollow V6.1 Implementation Plan

Date: 2026-05-16

Source design: `docs/superpowers/specs/2026-05-16-miller-hollow-v6-1-design.md`

## Objective

Audit and harden the current implemented rules against the official rulebook, then fix small mismatches in existing roles and terminology before adding new gameplay features.

## Phase 1: Official Rules Audit

Target files:

- `docs/superpowers/rules/2026-05-16-miller-hollow-official-rules-audit.md`
- `docs/superpowers/rules/2026-05-15-miller-hollow-basic-edition-rules.md`
- `docs/superpowers/rules/2026-05-15-miller-hollow-phase-table.md`
- `docs/superpowers/rules/2026-05-15-miller-hollow-hidden-info-matrix.md`
- `docs/superpowers/rules/2026-05-15-miller-hollow-view-contract.md`

Work:

- Create the official rules audit document.
- Audit each implemented role / flow:
  - Werewolves.
  - Fortune Teller / Seer.
  - Witch.
  - Hunter.
  - Thief.
  - Cupid / Lovers.
  - Sheriff / Captain.
  - Ordinary Townsfolk / Villager.
  - Night order.
  - Day vote and tie behavior.
- For each item, record:
  - rulebook behavior.
  - current implementation.
  - decision.
  - required tests.

Acceptance:

- Audit document exists and covers every implemented role / flow.
- Each mismatch is classified as bug, online adaptation, deferred, or matches rulebook.
- Follow-up implementation work is scoped to V6.1-sized fixes.

## Phase 2: Terminology Canonicalization

Target files:

- `src/web/copy.ts`
- `src/web/main.ts`
- `README.md`
- `CHANGELOG.md`
- rules docs
- specs / impl docs touched by V6.1
- smoke tests that assert user-facing text

Work:

- Choose canonical player-facing Traditional Chinese terms:
  - Werewolf: `狼人`
  - Fortune Teller / Seer: `預言家`
  - Witch: `女巫`
  - Hunter: `獵人`
  - Thief: `盜賊`
  - Cupid: `丘比特`
  - Ordinary Townsfolk / Villager: `普通村民`
  - Sheriff / Captain: `警長`
- Keep internal ids stable:
  - `seer`
  - `villager`
  - `sheriff`
- Update docs to explain English aliases where useful.
- Remove inconsistent player-facing references to `平民` unless explicitly explaining that it is a common alias.

Acceptance:

- UI and rules docs use consistent Traditional Chinese terms.
- README explains internal ids may differ from official English labels.
- Browser smoke still verifies key Traditional Chinese copy.

## Phase 3: Focused Rule Fixes

Target files depend on audit findings. Likely areas:

- `src/engine/reducer.ts`
- `src/engine/views.ts`
- `src/engine/presets.ts`
- `src/worker/room-object.ts`
- `src/web/main.ts`
- `src/web/copy.ts`
- `test/engine/reducer.test.ts`
- `scripts/smoke-v1.mjs`
- `scripts/browser-smoke-v1.mjs`

Known fixed baseline before V6.1 planning:

- Thief spare cards are derived by adding two extra Ordinary Townsfolk cards before shuffle.
- The two undealt cards become the Thief choices.
- If both spare cards are Werewolves, Thief must choose Werewolf.

Potential V6.1 fixes after audit:

- Add tests for "Thief not dealt" behavior.
- Tighten timeout fallback for Thief to use legal choices only.
- Confirm Cupid can choose self plus another player.
- Confirm Lovers win / heartbreak ordering against Hunter and Sheriff reactions.
- Confirm Sheriff election timing is explicitly online-hosted and documented.
- Confirm official beginner presets and app-basic compatibility presets are labeled clearly.

Acceptance:

- Every V6.1 code fix has a focused engine or smoke test.
- No new roles are introduced.
- Public/private/spectator hidden-information boundaries remain unchanged or stricter.

## Phase 4: Test Coverage

Target files:

- `test/engine/reducer.test.ts`
- `test/web/copy.test.ts`
- `scripts/smoke-v1.mjs`
- `scripts/browser-smoke-v1.mjs`
- `scripts/remote-smoke-v1.mjs` if a targeted remote check is practical

Work:

- Add focused engine tests for audited rules.
- Add browser smoke assertions only for user-visible text or critical UI flows.
- Add API smoke assertions for rule bugs that can regress without UI changes.
- Keep remote smoke quick by default.

Minimum required new tests:

- Thief spare-card derivation after adding two Ordinary Townsfolk cards.
- Double-Werewolf Thief forced choice.
- Thief absent from dealt players skips `thief_choice`.
- Terminology copy test for `普通村民`.

Acceptance:

- `npm test` covers rule details.
- `npm run smoke:v1` covers at least one corrected rule through Worker/API.
- `npm run smoke:browser` remains stable.

## Phase 5: Docs And Release Notes

Target files:

- `CHANGELOG.md`
- `README.md`
- `docs/superpowers/impl/2026-05-15-miller-hollow-release-notes.md`
- `docs/superpowers/rules/2026-05-16-miller-hollow-official-rules-audit.md`
- existing rule docs touched by audit

Work:

- Add V6.1 changelog entry.
- Update README with official-rules audit note.
- Add V6.1 section to release notes.
- Link audit document from relevant rules docs.
- Clearly mark online adaptations:
  - timers.
  - host fast-forward.
  - public spectators.
  - dedicated host console.
  - reconnect / transport behavior.

Acceptance:

- A reader can quickly see what V6.1 fixed and what remains intentionally app-specific.
- Changelog is short and scannable.
- Release notes summarize product impact.

## Phase 6: Version, Verification, Deploy

Target files:

- `package.json`
- `package-lock.json`
- `src/worker/index.ts`

Work:

- Bump app version to `0.6.1`.
- Run:
  - `npm run typecheck`
  - `npm test`
  - `npm run build`
  - `npm run smoke:v1`
  - `npm run smoke:browser`
  - `npm run secrets:check`
  - `npm run deploy:dry-run`
- Commit.
- Tag `v0.6.1`.
- Deploy when requested.
- Run remote smoke after deploy.

Acceptance:

- Local verification passes.
- Working tree is clean after commit/tag.
- Deployment health reports `version=0.6.1` and the expected build SHA.

## Completion Definition

V6.1 is done when:

- The official rules audit exists.
- Known mismatches in implemented roles are fixed or documented as intentional online adaptations.
- Terminology is consistent in player-facing UI and rules docs.
- Focused tests cover corrected behavior.
- Version, changelog, release notes, commit, tag, and deployment checks are complete.
