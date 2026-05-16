# Miller Hollow V6.1 Design

Date: 2026-05-16

## Goal

V6.1 aligns the already implemented game with the official rulebook before adding more roles or larger product features.

Recent Thief work exposed the risk: the application had a playable Thief workflow, but the setup model was wrong. The official rule is not "host chooses any two spare cards"; it is "add two Ordinary Townsfolk cards, deal the player seats, and let Thief choose from the two undealt cards." V6.1 should treat that as a signal to audit the current rules surface.

This release is a rules-correctness and terminology release, not a new-role release.

## Product Principle

The project should be able to answer three questions for every implemented rule:

- What does the rulebook say?
- What does the app currently do?
- If the app differs, is that an intentional online adaptation or a bug?

Unintentional differences should be fixed. Intentional differences should be documented in player-facing rules docs and developer-facing audit docs.

## Scope

Audit and harden the current implemented surface:

- Werewolves.
- Fortune Teller / Seer.
- Witch.
- Hunter.
- Thief.
- Cupid / Lovers.
- Sheriff / Captain.
- Ordinary Townsfolk / Villager.
- Night order and opening-role order.
- Day discussion, vote, tie, and reveal behavior.
- Player-host and dedicated-host trust boundaries only as they affect rules visibility.

## Current Known Issues / Risks

### Terminology Drift

The app currently uses mixed names:

- `seer`, Fortune Teller, Seer, 預言家.
- Ordinary Townsfolk, Villager, 普通村民, 平民.
- Sheriff, Captain, 警長.

Internal ids can stay stable for compatibility, but player-facing copy and rules docs should be consistent.

### Rulebook vs Online Adaptations

Some app behavior is necessarily online-specific:

- Timers and timeout fallbacks.
- Host fast-forward.
- Public spectator mode.
- Dedicated host console.
- Reconnect tokens and transport tickets.

These should not be mistaken for official rules. V6.1 should explicitly label them as online adaptations.

### Test Gaps

Some rule details are covered by engine tests but not smoke tests, and some smoke tests exercise broad flows without asserting the exact official rule detail.

V6.1 should add focused tests for known fragile rules, especially:

- Thief spare-card derivation.
- Double-Werewolf Thief forced choice.
- Thief not being dealt to any player.
- Terminology-sensitive UI copy.
- Public/private hidden-information boundaries after rule corrections.

## Rule Audit Document

Add a canonical audit document:

`docs/superpowers/rules/2026-05-16-miller-hollow-official-rules-audit.md`

Each section should use this shape:

```md
## Role Or Rule Name

### Rulebook

What the official rule requires.

### Current Implementation

What the app does today, with source references where useful.

### Decision

One of:

- Matches rulebook.
- Bug, fix in V6.1.
- Intentional online adaptation.
- Deferred.

### Required Tests

Focused checks that prevent regression.
```

## Required Fix Categories

V6.1 should fix only issues discovered during audit that are:

- Already in implemented roles / flows.
- Small enough to patch safely.
- Required to prevent misleading gameplay.

Large feature work discovered during audit should become a later design document.

## UX Requirements

Create-room UI:

- Keep role controls concise.
- Add short rules hints only when they prevent setup mistakes.
- Do not add long instructions inside the main tool surface.

Hero / marketing copy:

- Keep the current story copy.
- Do not expand this release into a landing-page redesign.

Rules visibility:

- Rules docs should distinguish:
  - official rulebook behavior.
  - online adaptation.
  - app-specific security / host behavior.

## API / Data Requirements

V6.1 should avoid breaking existing room state unless a bug requires migration.

If state shape changes are needed:

- Normalize old rooms conservatively.
- Preserve public view contracts.
- Do not expose hidden information to public or player-host views.

## Testing Requirements

Required verification:

- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run smoke:v1`
- `npm run smoke:browser`
- `npm run secrets:check`
- `npm run deploy:dry-run`

Recommended remote checks after deploy:

- `npm run smoke:remote:quick`
- Targeted remote smoke for any corrected setup flow when feasible.

## Not V6.1

- New roles.
- AI players.
- Ranked / persistent accounts.
- Full rules encyclopedia UI.
- Replacing the current create-room layout.
- Rewriting the engine.

## Completion

V6.1 is complete when the implemented rule set has a written official-rules audit, known rule mismatches in existing roles are either fixed or explicitly documented as online adaptations, terminology is consistent in user-facing copy and rules docs, and regression tests cover the corrected behavior.
