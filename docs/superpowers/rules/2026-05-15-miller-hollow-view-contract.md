# Miller Hollow View Contract

Date: 2026-05-15

## Public Room View

May include:

- Room id, status, settings, host seat id.
- Selected public preset id, family, rules source, label, player count, and labeled role-count summary.
- Seat nicknames, connection status, ready state, and last seen time.
- Public game phase, round, alive/dead status, public events, phase status.
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

## Private Player View

May include:

- The player's role.
- The player's legal actions and legal targets.
- Werewolf teammates for Werewolves.
- Seer results for the Seer.
- Witch potion availability for the Witch.
- Action state for the current player.

Must not include another player's private-only view.

## Spectator View

Spectators receive public room views only.

Spectators must never receive:

- `private_view` WebSocket messages.
- Player reconnect tokens.
- Token hashes.
- Private role data before endgame.
- Action controls.
