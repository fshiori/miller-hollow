# Miller Hollow View Contract

Date: 2026-05-15

## Public Room View

May include:

- Room id, status, settings, host seat id.
- Selected public preset id, family, rules source, label, player count, and labeled role-count summary.
- Seat nicknames, connection status, ready state, and last seen time.
- Public game phase, round, alive/dead status, public events, phase status.
- Phase interaction aggregates, such as Werewolf confirmation counts and day ready counts.
- Public chat messages.
- Start eligibility.
- Endgame reveal only after `phase === "ended"`.

Must not include:

- Reconnect tokens.
- Token hashes.
- Socket ticket values or hashes.
- Full `GameState`.
- `privateView`.
- Roles before endgame.
- Seer results before endgame.
- Witch potion state before endgame.
- Werewolf private chat messages.
- Werewolf proposed target id before it is committed as the actual night target.
- Werewolf ready seat ids.

## Private Player View

May include:

- The player's role.
- The player's legal actions and legal targets.
- Werewolf teammates for Werewolves.
- Seer results for the Seer.
- Witch potion availability for the Witch.
- Action state for the current player.
- Werewolf private chat, proposed target, and Werewolf ready seat ids only for living Werewolves during Werewolf night.
- Day ready seat ids and counts for living players during day discussion.

Must not include another player's private-only view.

## Spectator View

Spectators receive public room views only.

Spectators must never receive:

- `private_view` WebSocket messages.
- Player reconnect tokens.
- Token hashes.
- Private role data before endgame.
- Action controls.

## Host Observer View

Host observers receive privileged read-only observer views.

May include:

- Public room view fields.
- Roles before endgame.
- Werewolf private chat.
- Werewolf proposed target and ready seat ids.
- Day ready seat ids.
- Vote map, missing voters, and vote tally during day vote.
- Seer results and night action summary.
- Witch potion state for app-basic rooms.

Must not include:

- Player reconnect tokens.
- Token hashes.
- Socket ticket values or hashes.
- Spectator ticket values or hashes.
- Observer ticket values or hashes.
- Durable Object storage internals.

Host observer sockets must not accept player actions.
