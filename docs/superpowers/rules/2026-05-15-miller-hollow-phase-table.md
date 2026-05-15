# Miller Hollow Phase Table

Date: 2026-05-15

| Phase | Public Label | Private Actors | Public Timeout Behavior | Next Phase |
| --- | --- | --- | --- | --- |
| `night_werewolves` | Werewolves | Living Werewolves | Select random legal non-Werewolf target | `night_seer` |
| `night_seer` | Seer | Living Seer, if any | Skip vision if no Seer action | `night_witch` |
| `night_witch` | Witch | Living Witch, if any | Skip potion use if no Witch action | `day_discussion` or `ended` |
| `day_discussion` | Day Discussion | Living players chat | Advance to vote | `day_vote` |
| `day_vote` | Day Vote | Living players vote | Missing votes become abstentions | `night_werewolves` or `ended` |
| `ended` | Game Over | None | None | None |

Public status may expose aggregate submitted/required counts only when it does not reveal hidden-role identity.

