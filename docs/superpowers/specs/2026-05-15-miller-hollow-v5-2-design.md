# Miller Hollow V5.2 Design

Date: 2026-05-15

## Goal

V5.2 should add Thief as the first pre-game role-choice workflow.

V5.1 establishes pre-room custom role setup. V5.2 builds on that by allowing the host to include Thief in the setup, and by adding the opening Thief choice phase before the normal first night flow.

## Rule Summary

Thief behavior:

- Thief is a role card included in the dealt roles.
- Two extra role cards are placed in a hidden spare pool.
- If a player is dealt Thief, they see the two spare roles at the start of the game.
- The Thief chooses one spare role and becomes that role for the rest of the game.
- The unchosen spare card remains hidden.
- After Thief resolves, the game proceeds into the normal V5 roleflow first night.

V5.2 should keep the online implementation conservative:

- Only one Thief is allowed.
- Thief choice is required when Thief exists and is alive at game start.
- Host/timeout fallback may choose a deterministic legal spare role only to avoid abandoned rooms blocking forever.
- Thief should not alter player count; the two spare cards are extra cards outside occupied seats.

## Setup Requirements

Thief can only be selected in pre-room custom setup.

Create-room setup should include:

- Player count: 8-18.
- Existing V5.1 role counts.
- Thief count: 0 or 1.
- Spare role cards: exactly 2 when Thief count is 1.

Validation:

- If Thief is 0, spare cards must be empty.
- If Thief is 1, spare cards must contain exactly 2 roles.
- Total dealt role cards must equal player count.
- Spare role cards do not count toward player count.
- Werewolf and Seer recommendations from V5.1 still apply to dealt role cards.
- Spare cards may include supported roles only: Werewolf, Seer, Witch, Hunter, Villager.

Open question for implementation:

- If both spare cards are Werewolf, official rules may force the Thief to choose Werewolf. V5.2 should explicitly implement that behavior if following the rulebook source used by the project; otherwise document a conservative fallback before coding.

## Phase Flow

New phase:

```ts
"thief_choice"
```

Flow:

1. Host creates a custom room with Thief and two spare cards.
2. Players join and ready.
3. Game starts and roles are assigned, including Thief.
4. If Thief exists, phase becomes `thief_choice`.
5. Thief sees only the two spare cards.
6. Thief selects one spare role.
7. Thief's actual role is replaced with the selected role.
8. Normal first night begins:
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
- When Thief is enabled, show two spare card selectors.
- Disable room creation until the spare cards are valid.

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
- Arbitrary unsupported spare cards.
- Public reveal of spare cards during active game.
- Mid-game role changes beyond Thief opening choice.

## Completion

V5.2 is complete when Thief can be included in pre-room custom setup, spare cards are validated before creation, the Thief choice phase resolves before the first night, hidden information remains isolated, and engine/API/browser/remote smoke pass.
