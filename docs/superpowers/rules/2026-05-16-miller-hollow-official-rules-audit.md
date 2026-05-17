# Miller Hollow Official Rules Audit

Date: 2026-05-16

Primary source: The Werewolves of Miller's Hollow rulebook PDF used by the project: `https://cdn.1j1ju.com/medias/af/08/f4-the-werewolves-of-millers-hollow-rulebook.pdf`.

## Terminology

### Rulebook

The official English terms include Werewolves, Ordinary Townsfolk, Fortune Teller, Hunter, Cupido, Witch, Little Girl, Sheriff, and Thief.

### Current Implementation

Internal ids use `werewolf`, `villager`, `seer`, `hunter`, `cupid`, `witch`, `little_girl`, `sheriff` / `captain`, and `thief`. Traditional Chinese UI uses role labels from `src/web/copy.ts`.

### Decision

Intentional online adaptation. Internal ids remain stable for compatibility, while player-facing Traditional Chinese should use:

- `狼人`
- `普通村民`
- `預言家`
- `女巫`
- `獵人`
- `盜賊`
- `丘比特`
- `警長`

### Required Tests

- Copy tests assert `villager` and `Ordinary Townsfolk` render as `普通村民`.

## Werewolves

### Rulebook

Each night the Werewolves wake, recognize one another, consult, and choose one victim. Moderator advice says if Werewolves cannot decide, there is no fresh victim that night.

### Current Implementation

The engine supports Werewolf teammates, hidden Werewolf chat, shared target proposal, and per-Werewolf confirmation. Official basic and roleflow rooms can produce no kill when no target is selected. App-basic legacy rooms can fall back to a legal target on timeout.

### Decision

Intentional online adaptation. The official basic and roleflow behavior matches the rulebook no-decision guidance. The legacy app-basic fallback is retained for old compatibility rooms and is documented as app-specific.

### Required Tests

- Existing smoke tests cover hidden Werewolf chat, target proposal, readiness, and public hidden-information boundaries.

## Fortune Teller / Seer

### Rulebook

Each night the Fortune Teller chooses one player and sees that player's true character.

### Current Implementation

The internal role id is `seer`. The private view exposes one inspection action during `night_seer`, stores results only for the Seer, and keeps results out of public views before endgame.

### Decision

Matches rulebook with terminology adaptation.

### Required Tests

- Existing engine and smoke tests cover Seer inspection and non-Seer result isolation.

## Witch

### Rulebook

The Witch has one healing potion and one poison potion. Each can be used once. The Witch may use either potion on themselves.

### Current Implementation

Before V6.1, the engine rejected Witch self-poison and the private view excluded the Witch from poison targets.

### Decision

Bug, fix in V6.1. Witch self-poison is now legal.

### Required Tests

- Engine test verifies Witch legal targets include self during Witch night.
- Engine test verifies Witch can poison themselves and die.

## Hunter

### Rulebook

If the Hunter is killed by Werewolves or lynched by Townsfolk, the Hunter immediately shoots one other player.

### Current Implementation

The engine enters `hunter_revenge` when Hunter dies before game end. Online timeout / host fallback may skip the shot to avoid abandoned rooms blocking forever.

### Decision

Intentional online adaptation. The required shot is preserved in normal player flow; skip is an abandonment fallback.

### Required Tests

- Existing engine and browser smoke tests cover Hunter revenge.

## Thief

### Rulebook

When Thief is used, two extra Ordinary Townsfolk cards are added before shuffling. After player cards are dealt, the two undealt cards are placed face down. During the preliminary first-night turn, Thief may exchange with one of them. If both are Werewolves, Thief must choose Werewolf.

### Current Implementation

The engine adds two extra `villager` cards when the preset contains `thief`, shuffles the full deck, deals player-count cards, and stores the two undealt cards as `thief.spareRoles`. If Thief is not dealt, there is no `thief_choice` phase. If both spare roles are Werewolves, legal choices are restricted to Werewolf.

### Decision

Matches rulebook after the V6.0 follow-up bugfix; V6.1 adds explicit coverage.

### Required Tests

- Thief spare-card derivation from extra Ordinary Townsfolk cards.
- Double-Werewolf forced choice.
- Thief not dealt skips `thief_choice`.

## Cupid / Lovers

### Rulebook

Cupid chooses two players during the first night and may choose themselves. If one Lover dies, the other immediately dies from grief. If one Lover is a Werewolf and the other is a Townsperson, their win condition changes so they must eliminate all other players.

### Current Implementation

The engine has `night_cupid`, allows two distinct targets, permits Cupid to be one of the targets, exposes Lover partner identity privately, chains heartbreak death, and supports Lovers victory when cross-team Lovers are the final two living players.

### Decision

Matches rulebook for implemented behavior.

### Required Tests

- Existing tests cover Cupid target selection, Lover private info, heartbreak, and Lovers win.

## Sheriff / Captain

### Rulebook

Sheriff is not dealt as a character. It is elected by Townsfolk vote. The Sheriff vote counts as two. If eliminated, Sheriff names a successor.

### Current Implementation

The app models Sheriff as a public office, not a role card. The host opens an online election during day discussion. Sheriff vote weight and succession are implemented.

### Decision

Intentional online adaptation. Election timing is host-opened for online flow, but the office mechanics match the rulebook.

### Required Tests

- Existing roleflow smoke covers election, weighted vote reveal, and succession-capable state.

## Ordinary Townsfolk / Villager

### Rulebook

Ordinary Townsfolk have no special ability beyond intuition and discussion.

### Current Implementation

The internal id is `villager`; player-facing copy now uses `普通村民`.

### Decision

Matches rulebook with terminology adaptation.

### Required Tests

- Copy tests cover canonical Traditional Chinese label.

## Night Order And Setup Round

### Rulebook

Setup round: Thief, then Cupido, then Lovers recognize each other. Standard night: Fortune Teller, Werewolves, Witch, then wake the town.

### Current Implementation

Official basic and roleflow rooms use the normal official night order. Custom roleflow resolves `thief_choice`, then `night_cupid`, then the normal official night order. Lovers receive private partner information after Cupid resolves; there is no separate public phase for Lovers waking.

### Decision

Intentional online adaptation. The hidden information outcome matches the rulebook, while the exact moderator narration is collapsed into private state.

### Required Tests

- Existing tests cover Thief before Cupid and Cupid before normal night.

## Day Vote And Ties

### Rulebook

During the day vote, the player with the most votes is eliminated. Sheriff vote counts as two. If there is a tie, no one is eliminated.

### Current Implementation

The engine resolves weighted day votes, abstentions for missing online votes, public vote result reveal after resolution, and no execution on tie.

### Decision

Matches rulebook with online adaptation for missing votes.

### Required Tests

- Existing tests cover ties, abstentions, execution, and weighted vote reveal.

## Online Systems

### Rulebook

The physical game assumes a moderator, face-down cards, simultaneous pointing, and table conversation.

### Current Implementation

The app adds timers, reconnect tokens, transport tickets, public spectators, player-host / dedicated-host modes, host fast-forward, and hidden-information host console for dedicated hosts.

### Decision

Intentional online adaptation. These systems must not weaken hidden-information boundaries.

### Required Tests

- Existing smoke tests cover public/private/spectator boundaries and V6 host trust modes.
