# Miller Hollow Basic Edition Rules

Date: 2026-05-15

## Scope

Basic Edition is the current V4.7 rules scope:

- Official beginner presets for 8-18 players.
- `official_basic_8`: 2 Werewolves, 1 Fortune Teller, 5 Ordinary Townsfolk.
- `official_basic_9`: 2 Werewolves, 1 Fortune Teller, 6 Ordinary Townsfolk.
- `official_basic_10`: 2 Werewolves, 1 Fortune Teller, 7 Ordinary Townsfolk.
- `official_basic_11`: 2 Werewolves, 1 Fortune Teller, 8 Ordinary Townsfolk.
- `official_basic_12`: 3 Werewolves, 1 Fortune Teller, 8 Ordinary Townsfolk.
- `official_basic_13`: 3 Werewolves, 1 Fortune Teller, 9 Ordinary Townsfolk.
- `official_basic_14`: 3 Werewolves, 1 Fortune Teller, 10 Ordinary Townsfolk.
- `official_basic_15`: 3 Werewolves, 1 Fortune Teller, 11 Ordinary Townsfolk.
- `official_basic_16`: 3 Werewolves, 1 Fortune Teller, 12 Ordinary Townsfolk.
- `official_basic_17`: 3 Werewolves, 1 Fortune Teller, 13 Ordinary Townsfolk.
- `official_basic_18`: 4 Werewolves, 1 Fortune Teller, 13 Ordinary Townsfolk.
- App-basic compatibility presets for 8-12 players keep the existing Witch workflow.
- Legacy `basic_8` through `basic_12` ids remain accepted as app-basic aliases.
- No Hunter, Cupid, Thief, Captain, Little Girl, or custom roles.

## Lobby

- A room starts with the `official_basic_8` preset by default.
- The host selects the supported basic preset before creating the room.
- The selected preset controls seat count, public role summary, and start eligibility.
- The selected preset is fixed after room creation.
- Joining assigns the first open seat.
- Joined players start as not ready.
- Players may ready or unready while the room is in lobby.
- The host can start only when every seat in the selected preset is occupied and ready.
- Host controls cannot inspect roles or override rules.

## Night

- Living Werewolves may use private night chat that is visible only to living Werewolves.
- Living Werewolves may propose one shared non-Werewolf target.
- Changing the proposed target clears existing Werewolf confirmations.
- When every living Werewolf confirms a valid proposed target, the game advances to Fortune Teller or Seer night.
- If the Werewolf timer expires, the proposed target is used when valid; otherwise a legal target is selected by timeout.
- Fortune Teller or Seer may inspect one living target and privately sees that role.
- App-basic presets include a Witch.
- Witch may save the Werewolf target once.
- Witch may poison one living target once.
- Witch cannot poison themselves.
- Official beginner presets have no Witch, so night deaths resolve after Fortune Teller action.
- App-basic night deaths resolve after Witch action.

## Day

- Living players may chat during day discussion.
- Dead players and spectators cannot send day chat.
- Living players may mark themselves ready to proceed during day discussion.
- When every living player is ready during day discussion, the game advances to day vote.
- Living players vote during day vote.
- Missing votes become abstentions on timeout.
- Tied votes execute no one.

## Win Conditions

- Village wins when all Werewolves are dead.
- Werewolves win when no non-Werewolves remain alive.
- Roles become public only after the game enters `ended`.
