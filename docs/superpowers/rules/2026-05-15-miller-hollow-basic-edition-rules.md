# Miller Hollow Basic Edition Rules

Date: 2026-05-15

## Scope

Basic Edition is the current V6 rules scope:

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
- V5 roleflow preset `official_roleflow_8`: 2 Werewolves, 1 Fortune Teller, 1 Hunter, 4 Ordinary Townsfolk.
- Legacy `basic_8` through `basic_12` ids remain accepted as app-basic aliases.
- Sheriff / Captain is an elected public office in roleflow rooms, not a role card.
- Custom roleflow rooms may include Witch, Hunter, Thief, Cupid, and Sheriff while the official beginner presets remain stable.
- Little Girl and other expansion roles are out of scope.

## Lobby

- A room starts with the `official_basic_8` preset by default.
- The host selects the supported basic preset before creating the room.
- The host selects the room trust mode before creating the room.
- Player-host mode is the default: the host occupies a player seat and cannot inspect hidden information.
- Dedicated-host mode is explicit: the host does not occupy a player seat and may use a visible hidden-information `主持後台`.
- The selected preset controls seat count, public role summary, and start eligibility.
- The selected preset is fixed after room creation.
- Joining assigns the first open seat.
- Joined players start as not ready.
- Players may ready or unready while the room is in lobby.
- The host can start only when every seat in the selected preset is occupied and ready.
- Player-host controls cannot inspect roles or override rules.
- Dedicated-host controls can inspect hidden information only through the dedicated host console and still cannot override rules.

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
- V5 roleflow nights use official-style order: Fortune Teller first, then Werewolves, then Witch if present.
- Custom roleflow nights resolve opening roles before the normal first night: Thief chooses a spare role if present, then Cupid chooses two distinct Lovers if present.
- V5 roleflow Werewolf timeout or host fast-forward without a selected target produces no Werewolf victim.

## Day

- Living players may chat during day discussion.
- Dead players and spectators cannot send day chat.
- Living players may mark themselves ready to proceed during day discussion.
- When every living player is ready during day discussion, the game advances to day vote.
- Living players vote during day vote.
- Missing votes become abstentions on timeout.
- Tied votes execute no one.
- In V5 roleflow rooms, the host may open a Sheriff election during day discussion after night results are public and before day vote.
- Living players vote for Sheriff or abstain.
- If elected, Sheriff is public and the Sheriff's day vote counts as 2.
- If the Sheriff dies and a legal living successor exists, the dead Sheriff chooses a successor before normal phase progression continues.
- Live vote choices are hidden from public players and spectators while voting is active.
- Resolved vote details are public after day vote resolution, including voter choices, vote weights, weighted tally, abstentions, tie state, and execution result.

## Hunter

- Hunter is a village-team role in V5 roleflow rooms.
- If Hunter dies before the game has already ended, the game enters `hunter_revenge`.
- The dead Hunter chooses one living player to shoot.
- A host/timeout fallback may skip the shot only to keep abandoned online rooms from blocking forever; normal player flow should treat the shot as required.
- Winner is checked after the Hunter shot before the game resumes.

## Thief And Cupid

- Thief is available in custom roleflow rooms.
- If Thief is present, the system adds two extra Ordinary Townsfolk cards to the role deck.
- After shuffling, player-count cards are dealt to players and the two undealt cards become the hidden Thief spare cards.
- If Thief is dealt to a player, Thief chooses one spare role before the first normal night.
- If both spare cards are Werewolves, Thief must choose Werewolf.
- If Thief is not dealt to any player, no Thief choice phase occurs.
- Cupid is available in custom roleflow rooms.
- Cupid chooses two distinct players during `night_cupid`; Cupid may choose themselves as one of the Lovers.
- Lovers privately learn each other's identity after Cupid resolves.
- If one Lover dies, the other Lover dies immediately from heartbreak.
- Lover heartbreak deaths can trigger Hunter revenge and Sheriff succession.

## Win Conditions

- Village wins when all Werewolves are dead.
- Werewolves win when no non-Werewolves remain alive.
- Cross-team Lovers win together if they are the final two living players.
- Roles become public only after the game enters `ended`.
