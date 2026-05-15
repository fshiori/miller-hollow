# Miller Hollow V5.1 Design

Date: 2026-05-15

## Goal

V5.1 should add pre-room custom role setup for the roles that already exist in the engine:

- Werewolf
- Seer / Fortune Teller
- Witch
- Hunter
- Villager
- Sheriff as a rule toggle, not a role card

The setup must happen before room creation. Once the room exists, player count and role counts are locked.

## Rulebook-Guided Counts

Custom setup should not feel like an arbitrary sandbox by default. Werewolf and Seer / Fortune Teller counts should be guided by the rulebook beginner table.

Recommended values:

| Players | Recommended Werewolves | Recommended Seer / Fortune Teller |
| --- | --- | --- |
| 8 | 2 | 1 |
| 9 | 2 | 1 |
| 10 | 2 | 1 |
| 11 | 2 | 1 |
| 12 | 3 | 1 |
| 13 | 3 | 1 |
| 14 | 3 | 1 |
| 15 | 3 | 1 |
| 16 | 3 | 1 |
| 17 | 3 | 1 |
| 18 | 4 | 1 |

Behavior:

- Selecting a player count auto-fills Werewolf and Seer counts from the table.
- If Werewolf count is lower or higher than the recommended count, show an immediate warning.
- If Seer count is lower or higher than 1, show an immediate warning.
- On create-room submit, show an alert if either count is outside the recommendation.
- The alert should explain the recommended count for the selected player count.
- The room should not be created until the host fixes the warned count.

Suggested Traditional Chinese copy:

- `依規則書建議，{count} 人局應有 {wolves} 位狼人。`
- `依規則書建議，預言家應為 1 位。`
- `目前角色配置和規則書建議不一致，請先調整後再建立房間。`

## Custom Role Builder

Create-room form fields:

- Player count: 8-18.
- Werewolves: numeric stepper.
- Seer: 0-1 numeric stepper.
- Witch: 0-1 numeric stepper.
- Hunter: 0-1 numeric stepper.
- Villagers: derived from remaining player slots.
- Sheriff enabled: toggle.
- Night order: official by default.

Validation:

- Total role cards must equal player count.
- Werewolves must be at least 1.
- Non-Werewolves must be at least 1.
- Seer, Witch, and Hunter are each limited to 0 or 1 in V5.1.
- Villager count cannot be negative.
- Werewolf and Seer counts must match the rulebook recommendation before creation.

## Room Locking

The custom configuration is persisted in room settings at creation time.

After the room is created:

- The lobby shows role summary only.
- The host cannot edit role counts.
- Reconnect, observer, smoke, and diagnostics all read the same fixed config.

## Not V5.1

- In-room role editing.
- Arbitrary multiple Seers, Witches, or Hunters.
- Cupid, Thief, Little Girl, Elder, Defender, or expansion roles.
- Custom win-condition rules.
- Mid-game rule changes.

## Completion

V5.1 is complete when a host can create an 8-18 player custom roleflow room before lobby creation, with rulebook-guided Werewolf/Seer validation, fixed room settings after creation, complete engine/API/browser smoke coverage, and no hidden-info regression.
