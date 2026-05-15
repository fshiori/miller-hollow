# Miller Hollow V5.3 Design

Date: 2026-05-15

## Goal

V5.3 should add Cupid and Lovers as the first linked-player and alternate-win-condition workflow.

This should come after V5.1 custom setup and V5.2 Thief because Lovers touches death chaining, hidden information, and win-condition logic more deeply than a normal night action.

## Rule Summary

Cupid behavior:

- Cupid is a village-team role card.
- At the start of the first night, Cupid chooses two players to become Lovers.
- Cupid may choose themselves as one of the Lovers in V5.3, but the two selected players must be distinct.
- The two Lovers privately learn each other's identity.
- If one Lover dies, the other dies immediately from heartbreak.
- If the Lovers are on opposing teams and they are the only players left alive, the Lovers win together.

V5.3 should implement the smallest complete Lovers model:

- One Cupid maximum.
- One Lovers pair maximum.
- Lovers are persistent state, not roles.
- Death chaining must be deterministic and public enough to explain what happened without revealing hidden roles too early.

## Setup Requirements

Cupid can only be selected in pre-room custom setup.

Validation:

- Cupid count is 0 or 1.
- Cupid counts as a role card in player count.
- Cupid is a non-Werewolf village-team role.
- Thief spare role cards remain limited to Werewolf, Fortune Teller, Witch, Hunter, and Ordinary Townsfolk; Cupid is selected as a dealt role, not as a spare role.
- Existing V5.1 Werewolf and Seer recommendation rules still apply.
- Cupid can coexist with Hunter, Witch, Thief, and Sheriff, but reaction ordering must be explicit.

## Phase Flow

New phase:

```ts
"night_cupid"
```

Flow:

1. Game starts.
2. If Thief exists, resolve `thief_choice` first.
3. If living Cupid exists and no Lovers pair has been set, enter `night_cupid`.
4. Cupid chooses two distinct players.
5. The Lovers receive private knowledge.
6. Normal first night continues:
   - Seer / Fortune Teller
   - Werewolves
   - Witch if present

## Death Chaining

When a Lover dies:

- The paired Lover dies immediately.
- Public event should say a Lover died from heartbreak without exposing roles.
- Chained Lover death can trigger Hunter revenge or Sheriff succession if applicable.
- Winner is checked after the full death chain and reaction queue.

Reaction order for V5.3:

1. Apply primary death.
2. Apply Lover heartbreak death if needed.
3. Queue Hunter revenge for any Hunter deaths.
4. Queue Sheriff succession for any Sheriff deaths.
5. Resolve queued reactions in existing order.
6. Check winner after every reaction.

## Win Conditions

Base win conditions remain:

- Village wins when all Werewolves are dead.
- Werewolves win when no non-Werewolves remain alive.

Lovers special case:

- If exactly two players are alive and they are the Lovers, Lovers win together when they would otherwise be split across opposing teams.
- If both Lovers are Village-side, normal Village win can still apply.
- If both Lovers are Werewolves, normal Werewolf win can still apply.

The implementation must define a clear internal `winner` value for Lovers, such as:

```ts
"lovers"
```

UI should display `戀人獲勝`.

## Hidden Information

Public view must not reveal:

- Cupid identity before endgame.
- Lover pair before both are dead or game has ended.
- Lover team composition.

Private views may reveal:

- Cupid action controls during `night_cupid`.
- Lover partner identity to each Lover after Cupid resolves.

Host observer may reveal:

- Cupid identity.
- Cupid pending target choices.
- Lover pair after selection.

## UI Requirements

Create-room UI:

- Add Cupid 0/1 custom setup control.

Player UI:

- Add `丘比特夜晚` phase label.
- Cupid can select two distinct players.
- Lovers see partner identity in private panel.

Spectator UI:

- Sees public phase and public death events only.

Host observer UI:

- Shows Cupid action state and selected Lovers pair.

Suggested Traditional Chinese copy:

- `丘比特`
- `戀人`
- `丘比特夜晚`
- `選擇兩位戀人`
- `你的戀人：{player}`
- `一位戀人殉情了。`
- `戀人獲勝`

## Not V5.3

- Little Girl.
- Multiple Cupid pairs.
- Custom Lover win-condition toggles.
- Revealing Lovers publicly during active play.
- AI-assisted Cupid choices.

## Completion

V5.3 is complete when Cupid can link two Lovers at the start of the game, Lover private information is correct, heartbreak death chains through Hunter/Sheriff reactions safely, Lovers win condition is tested, and full local plus remote verification pass.
