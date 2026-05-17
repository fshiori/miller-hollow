# Miller Hollow V7 Design

Date: 2026-05-17

## Goal

V7 makes Miller Hollow feel like a complete player-facing online game instead of a capable rules engine with host tools.

V6 focused on trust boundaries, rules cleanup, hosted flow, and demo controls. After V6.3, the host should be able to run a good observed demo. V7 should shift attention to normal players: entering a room, understanding what to do, acting on mobile, recovering from disconnects, and reading the game state without developer help.

This release is a product-experience release, not a new-role release.

## Product Principle

A first-time player should be able to complete a game without asking:

- What am I waiting for?
- Is it my turn?
- What can I click?
- Did my action submit?
- What happened last night?
- Why did the phase change?
- How do I reconnect?

The game surface should be dense enough for repeated play, but clear enough for new players.

## Scope

V7 covers:

- Player waiting-state clarity.
- Mobile-first action ergonomics.
- Better reconnect and connection-state UX.
- Room-level rules quick reference.
- Clear phase timeline and recent event summary.
- Host controls separated from normal player controls.
- Demo/AI tools scoped away from normal rooms.
- Traditional Chinese copy polish for player-facing game states.
- Accessibility and keyboard/focus basics for forms and actions.

## Player Experience Requirements

### Waiting State

Every player view should show:

- Current phase.
- Whether this player must act.
- If not acting, what the room is waiting for.
- Public-safe pending counts.
- Submitted state for own action.

Examples:

- `等待預言家行動`
- `你已完成投票，等待其他玩家`
- `白天討論中，3/6 名存活玩家已準備`
- `等待房主開始遊戲`

### Action Confirmation

After a player submits an action:

- Show immediate local pending state.
- Show server-confirmed submitted state.
- Prevent accidental double submit where appropriate.
- Keep a clear way to change actions only when the rules allow it.

### Mobile Ergonomics

Mobile UI should prioritize:

- Current action.
- Role identity.
- Phase status.
- Living player list.
- Chat / event log.

Requirements:

- Main action controls fit within one mobile viewport where feasible.
- Buttons are large enough for touch.
- Select controls remain readable.
- Vote reveal does not overflow horizontally.
- Seat list is scannable without huge cards.

### Reconnect UX

Players should understand connection state:

- connected.
- reconnecting.
- disconnected.
- reconnect failed.

The UI should offer:

- retry reconnect.
- leave room.
- explain that reconnect identity is browser-held.

Do not expose reconnect tokens.

## Room Rules Quick Reference

Add a compact rules panel or modal available from lobby and in-game:

- Current preset / custom role setup.
- Enabled roles.
- Current host mode.
- Spectator mode.
- Night order.
- Sheriff enabled / disabled.
- Werewolf timeout behavior.
- Vote reveal behavior.

Do not build a full rules encyclopedia in V7.

## Phase Timeline

Add a public phase timeline component:

- Shows current phase.
- Shows completed recent phases.
- Shows likely next phase when public-safe.
- Does not reveal hidden role identity.

The timeline should work for:

- official basic presets.
- official roleflow.
- custom roleflow with Thief / Cupid / Witch / Hunter / Sheriff.

## Host / Player Separation

Normal player UI should not be visually dominated by host tools.

Requirements:

- Host tools are collapsed or grouped separately.
- Player action panel remains primary.
- Dedicated-host console remains explicit and labeled.
- AI/demo controls are hidden unless the room is a dedicated-host demo/test context.

## Copy Requirements

Player-facing copy should be Traditional Chinese and direct.

Polish areas:

- Waiting states.
- Error messages.
- Host trust mode labels.
- Vote reveal outcomes.
- Night death summaries.
- Reconnect messages.
- AI/demo labels.

Internal ids and diagnostics can remain English.

## Accessibility Requirements

Minimum V7 accessibility baseline:

- All forms have labels.
- Buttons have clear text.
- Disabled controls have adjacent reason text where important.
- Focus remains usable after render.
- Important status changes use visible text.
- Color is not the only state indicator.

## Testing Requirements

Required verification:

- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run smoke:v1`
- `npm run smoke:browser`
- `npm run secrets:check`
- `npm run deploy:dry-run`

New coverage should include:

- Mobile screenshots for lobby, night action, day discussion, vote, and endgame.
- Browser assertions for waiting-state copy.
- Reconnect failure / recovery flow.
- Rules quick reference visibility.
- Vote reveal fits mobile.
- Player-host room does not show dedicated-host demo controls.
- Dedicated-host demo room can still access demo controls.

## Not V7

- New roles.
- Ranked accounts.
- Persistent user profiles.
- Matchmaking.
- Chat moderation system.
- Strategic AI.
- Full rules encyclopedia.
- Complete visual redesign from scratch.

## Completion

V7 is complete when a normal player can join, understand the room setup, know when and how to act, recover from ordinary reconnect states, use the game comfortably on mobile, and finish a game without needing host/developer explanation.
