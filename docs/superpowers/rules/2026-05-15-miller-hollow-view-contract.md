# Miller Hollow View Contract

Date: 2026-05-15

## Public Room View

May include:

- Room id, status, settings, host seat id.
- Room trust mode in `settings.hostMode`.
- Selected public preset id, family, rules source, label, player count, and labeled role-count summary.
- Seat nicknames, connection status, ready state, and last seen time.
- Public game phase, round, alive/dead status, public events, phase status.
- Public Sheriff holder and Sheriff election availability.
- Resolved vote results with vote weights after day vote resolution.
- Phase interaction aggregates, such as Werewolf confirmation counts and day ready counts.
- Seat controller labels, including AI test-player seats.
- Public chat messages.
- Start eligibility.
- Public waiting-state, phase timeline, and rules-reference data derived from public fields.
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
- Live vote map during day vote.
- Sheriff election live vote map.
- Hidden Hunter identity before endgame, except the dead reacting Hunter is publicly implied by `hunter_revenge`.

## Private Player View

May include:

- The player's role.
- The player's legal actions and legal targets.
- Werewolf teammates for Werewolves.
- Seer results for the Seer.
- Witch potion availability for the Witch.
- Action state for the current player.
- Pending Hunter shot action for the dead Hunter.
- Pending Sheriff successor action for the dead Sheriff.
- Thief spare role choices for the Thief during `thief_choice`.
- Cupid target controls for Cupid during `night_cupid`.
- Lover partner identity for each Lover after Cupid resolves.
- Werewolf private chat, proposed target, and Werewolf ready seat ids only for living Werewolves during Werewolf night.
- Day ready seat ids and counts for living players during day discussion.

AI-controlled seats use the same public and private view contracts as human seats. The server may submit legal actions for AI seats through dedicated-host demo controls, but that command must not add hidden role data to public, spectator, or player-host views.

Must not include another player's private-only view.

## Spectator View

Spectators receive public room views only.

Spectators must never receive:

- `private_view` WebSocket messages.
- Player reconnect tokens.
- Token hashes.
- Private role data before endgame.
- Action controls.
- Dedicated-host AI demo controls.

## Dedicated Host Console View

Only rooms created with `settings.hostMode === "dedicated_host"` may receive privileged read-only observer views. The dedicated host authenticates with a separate host token, not a player reconnect token, and does not occupy a player seat.

May include:

- Public room view fields.
- Roles before endgame.
- Werewolf private chat.
- Werewolf proposed target and ready seat ids.
- Day ready seat ids.
- AI seat controller labels.
- Vote map, missing voters, and vote tally during day vote.
- Sheriff holder, election votes, missing election voters, and succession state.
- Pending Hunter revenge state.
- Thief state, including spare roles and chosen role.
- Lovers state after Cupid resolves.
- Weighted vote tally during day vote.
- Resolved vote results.
- Seer results and night action summary.
- Witch potion state for app-basic rooms.
- AI demo step summaries returned by dedicated-host commands.

Must not include:

- Player reconnect tokens.
- Token hashes.
- Socket ticket values or hashes.
- Spectator ticket values or hashes.
- Observer ticket values or hashes.
- Dedicated host token or token hash.
- Durable Object storage internals.

Dedicated host console sockets must not accept player actions.

## Player Host Boundary

Player-host rooms use the same public and private player views as every other player. A player-host may administer the room, but must not receive observer tickets, observer state, observer sockets, full role lists, live vote maps, or other hidden-information console payloads before endgame.

Player-host rooms must not expose AI demo controls because those controls are intended for dedicated-host testing and observation.
