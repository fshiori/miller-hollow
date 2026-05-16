# Miller Hollow V1 Rule Decisions

Date: 2026-05-14

Source design: `docs/superpowers/specs/2026-05-14-miller-hollow-v1-design.md`

This document records V1 decisions where the tabletop rules need an online implementation choice.

## Fixed Preset

V1 supports exactly 8 human players:

- 2 Werewolves
- 1 Seer
- 1 Witch
- 4 Ordinary Villagers

Other base-game roles may exist in the catalog but are not active in V1 gameplay.

## Werewolf Night Action

Any living Werewolf may submit the shared Werewolf target. The first valid submission resolves the phase and advances to the Seer phase.

If no valid target is submitted before timeout, the engine creates an explicit fallback command that chooses a random legal non-Werewolf living target.

## Seer Night Action

The living Seer may inspect one living target. The result is stored only in the Seer's private view and private event stream.

If the Seer does not act before timeout, the engine advances with no inspection.

## Witch Night Action

The Witch sees the Werewolf victim during the Witch phase.

V1 potions:

- The save potion may save only the current Werewolf victim and can be used once.
- The poison potion may target one other living player and can be used once.
- Historical V1 decision: the Witch could not poison themselves. Superseded in V6.1 to match the rulebook: the Witch may use either potion on themselves.
- The Witch may save and poison in the same night if both potions are available.

If the Witch does not act before timeout, no potion is used.

## Day Discussion and Chat

Only living players can send public day chat messages.

Night public chat is disabled. Werewolf coordination is represented by the shared Werewolf target selection instead of a separate text chat in V1.

Dead-player chat is not part of V1.

## Day Voting

Only living players can vote. Missing votes become abstentions when the vote times out.

If one living target has the highest non-abstention vote count, that player is executed. If the highest vote count is tied, no player is executed in V1.

## Phase Timing

The Durable Object owns deadlines and submits explicit engine commands when a phase times out.

V1 local defaults:

- Werewolves: 45 seconds
- Seer: 35 seconds
- Witch: 45 seconds
- Day discussion: 20 seconds
- Day vote: 60 seconds

The short day discussion default keeps local smoke tests practical. Production can tune these values without changing engine rules.

## Hidden Information

Before endgame, public room and game views must not include hidden roles. Each browser receives only:

- Public room state
- Public game view
- That seat's private role/action view

Roles are revealed in public player views only after the game ends.
