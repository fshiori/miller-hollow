# Miller Hollow V5.2 Design

Date: 2026-05-15

## Goal

V5.2 should add Thief as the first pre-game role-choice workflow.

V5.1 establishes pre-room custom role setup. V5.2 builds on that by allowing the host to include Thief in the setup, and by adding the opening Thief choice phase before the normal first night flow.

## Rule Summary

Thief behavior:

- Thief is a role card included in the configured role deck.
- When Thief is enabled, two extra Ordinary Townsfolk cards are added to the deck before shuffling.
- After shuffling, player-count cards are dealt and the two undealt cards become the hidden spare pool.
- If a player is dealt Thief, they see the two spare roles at the start of the game.
- The Thief chooses one spare role and becomes that role for the rest of the game.
- If both spare roles are Werewolf, the Thief must choose Werewolf.
- The unchosen spare card remains hidden.
- After Thief resolves, the game proceeds into the normal V5 roleflow first night.

V5.2 should keep the online implementation conservative:

- Only one Thief is allowed.
- Thief choice is required only when the Thief card is dealt to a player.
- Host/timeout fallback may choose a deterministic legal spare role only to avoid abandoned rooms blocking forever.
- Thief should not alter player count; the two extra Ordinary Townsfolk cards are outside occupied seats.

## Setup Requirements

Thief can only be selected in pre-room custom setup.

Create-room setup should include:

- Player count: 8-18.
- Existing V5.1 role counts.
- Thief count: 0 or 1.
- No manual spare-card selection.

Validation:

- Total dealt role cards must equal player count.
- The two extra Ordinary Townsfolk cards do not count toward player count.
- Werewolf and Seer recommendations from V5.1 still apply to dealt role cards.

## Phase Flow

New phase:

```ts
"thief_choice"
```

Flow:

1. Host creates a custom room with Thief enabled.
2. Players join and ready.
3. Game starts, two extra Ordinary Townsfolk cards are added, the deck is shuffled, and player-count cards are dealt.
4. The two undealt cards become the spare cards.
5. If Thief was dealt to a player, phase becomes `thief_choice`.
6. Thief sees only the two spare cards.
7. Thief selects one spare role.
8. Thief's actual role is replaced with the selected role.
9. Normal first night begins:
   - official roleflow: Seer / Fortune Teller first
   - legacy/app-basic if still supported by selected config

## Hidden Information

Public view must not reveal:

- Which player was dealt Thief before endgame.
- Spare role cards.
- Which role Thief chose.
- The unchosen spare role.

Private Thief view may reveal:

- Own dealt Thief role during `thief_choice`.
- The two spare cards.
- Legal choice actions.

Host observer may reveal:

- Thief identity.
- Spare cards.
- Current pending choice.
- Chosen role after resolution.

After endgame:

- Public endgame reveal should show each player's final effective role.
- If the project wants an audit timeline, it may show that Thief selected a role, but should avoid exposing unchosen spare card unless explicitly designed.

## UI Requirements

Create-room UI:

- Add Thief toggle/stepper in custom setup.
- When Thief is enabled, explain that the system adds two extra Ordinary Townsfolk cards and derives spare cards after shuffle.

Player UI:

- Add `盜賊選擇` phase label.
- Show two spare cards as selectable options to the Thief only.
- Show waiting copy to non-Thief players.

Host observer UI:

- Show Thief pending choice and spare card pool.

Suggested Traditional Chinese copy:

- `盜賊`
- `盜賊選擇`
- `選擇你的角色`
- `等待盜賊選擇角色。`
- `盜賊已選擇角色。`

## Not V5.2

- Cupid / Lovers.
- Little Girl.
- Multiple Thieves.
- Manual spare-card selection.
- Public reveal of spare cards during active game.
- Mid-game role changes beyond Thief opening choice.

## Completion

V5.2 is complete when Thief can be included in pre-room custom setup, spare cards are derived from the undealt cards after adding two extra Ordinary Townsfolk cards, the double-Werewolf forced choice is enforced, the Thief choice phase resolves before the first night when Thief is dealt, hidden information remains isolated, and engine/API/browser/remote smoke pass.
