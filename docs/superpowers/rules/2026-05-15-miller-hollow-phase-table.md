# Miller Hollow Phase Table

Date: 2026-05-15

For V6.1 rulebook alignment decisions, see `docs/superpowers/rules/2026-05-16-miller-hollow-official-rules-audit.md`.

| Phase | Public Label | Private Actors | Public Timeout Behavior | Next Phase |
| --- | --- | --- | --- | --- |
| `night_werewolves` | Werewolves | Living Werewolves | Legacy/app-basic: valid proposal or random legal target. V5 roleflow: no kill when no target is selected. | Legacy: `night_seer`; roleflow: `night_witch` if present, otherwise `day_discussion` or reaction/ended |
| `night_seer` | Seer | Living Seer, if any | Skip vision if no Seer action | Legacy/app-basic: `night_witch`; V5 roleflow: `night_werewolves` |
| `night_witch` | Witch | Living Witch, if any | Skip potion use if no Witch action | `day_discussion` or `ended` |
| `day_discussion` | Day Discussion | Living players chat; host may open Sheriff election in V5 roleflow | Advance to vote | `day_vote` or `sheriff_election` |
| `sheriff_election` | Sheriff Election | Living players vote | Missing votes become abstentions | `day_discussion` |
| `day_vote` | Day Vote | Living players vote | Missing votes become abstentions | Next night, reaction phase, or `ended` |
| `hunter_revenge` | Hunter Revenge | Dead Hunter | Skip shot as online fallback | Resume pending phase, another reaction, or `ended` |
| `sheriff_succession` | Sheriff Succession | Dead Sheriff | No successor as online fallback | Resume pending phase or `ended` |
| `ended` | Game Over | None | None | None |

Public status may expose aggregate submitted/required counts only when it does not reveal hidden-role identity.
