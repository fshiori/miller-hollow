# Miller Hollow V6.3 Design

Date: 2026-05-17

## Goal

V6.3 turns the V6.2 AI test-player tool into a usable hosted demo control surface.

V6.2 proved that a dedicated host can fill a room with AI players and push the game forward, but live observation exposed a pacing problem: one AI step can do too much at once. AI can talk, ready, vote, and advance phases so quickly that spectators cannot observe a realistic table flow.

This release keeps AI as a test/demo tool, but makes it controllable enough for hosted observation.

## Product Principle

AI demo controls should behave like a host nudging a table, not like a test script racing to completion.

Each host action should answer:

- What will happen if I press this?
- Which AI players will act?
- Will this reveal hidden information?
- Will spectators have time to see the public result?

## Scope

V6.3 covers:

- Splitting AI behavior into smaller host-triggered steps.
- Dedicated-host demo controls for single-step and timed auto-step.
- Predictable public pacing for day discussion and voting.
- Host console preview of the next AI step.
- Better spectator visibility during demo flow.
- Tests that prove AI demo controls do not bypass normal action rules.

## AI Step Model

Replace the current broad `ai-step` behavior with explicit step intents.

Required step types:

- `ai_night_action`
- `ai_day_chat`
- `ai_day_ready`
- `ai_vote`
- `ai_reaction`
- `ai_auto`

### AI Night Action

Runs only the current pending night role action:

- Thief choice.
- Cupid lovers.
- Seer investigation.
- Werewolf target proposal / confirmation.
- Witch action.

It should not send public day chat or ready the table.

### AI Day Chat

Runs only public discussion messages for living AI players.

Rules:

- Should create visible public chat.
- Should not mark players ready.
- Should not advance to voting.
- Should support more than one message burst for observation.
- Messages should be Traditional Chinese and short.

### AI Day Ready

Marks living AI players ready during day discussion.

Rules:

- Should not send new chat.
- May advance to vote if all living players are ready.
- Host copy must make that consequence clear.

### AI Vote

Submits AI votes during voting.

Rules:

- Should be able to submit one vote at a time or all remaining AI votes.
- Public players and spectators still cannot see live vote maps.
- Resolved vote reveal remains public after the vote finishes.

### AI Reaction

Handles pending Hunter revenge and Sheriff succession when the reacting player is AI.

Rules:

- Should not act for human players.
- Should use legal targets only.
- Should not skip a required human reaction.

### AI Auto

Auto mode runs one safe step every configured interval.

Defaults:

- 5 seconds between steps.
- Paused by default.
- Dedicated host can start, pause, and stop.
- Auto mode must stop at:
  - human player action requirement.
  - game end.
  - host leaving the page.
  - error response.

## Host UX Requirements

Dedicated host console should show:

- Current phase.
- Pending actor group.
- Whether the pending action belongs to AI, humans, or both.
- Next recommended AI step.
- Buttons:
  - AI 夜晚行動
  - AI 發言
  - AI 準備投票
  - AI 投票
  - AI 反應
  - 自動每 5 秒
  - 暫停自動
- Last AI step result.

Player-host rooms:

- May keep simple non-hidden host controls.
- Must not expose dedicated-host hidden state.
- Should not show privileged demo controls that imply hidden role knowledge.

## Spectator UX Requirements

Spectator view should be able to observe:

- AI day chat appearing before ready.
- Day discussion remaining visible until ready or host advance.
- Voting phase before vote reveal.
- Vote reveal after resolution.
- System log following latest public events.

Do not require spectators to refresh between steps.

## API / Data Requirements

Add or replace host endpoints as needed:

- `POST /api/rooms/:roomId/host/ai-step`
- optional `stepType`
- optional `mode`, such as one player or all eligible AI.

The endpoint should return:

- updated public room view.
- step summary:
  - step type.
  - acted AI seat ids.
  - skipped AI seat ids and reason.
  - phase before / after.

Security:

- Requires host authentication.
- Dedicated-host-only controls must still require `settings.hostMode === "dedicated_host"` when they depend on hidden role knowledge.
- Player-host rooms must not receive observer state or live vote maps through AI endpoints.

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

- AI day chat does not ready players or advance phase.
- AI day ready advances only after chat has been separately possible.
- AI vote can reveal public vote results after resolution.
- AI night action handles the current phase without acting out of phase.
- AI reaction acts only for AI Hunter / AI Sheriff.
- Auto-step can run with a 5-second cadence and pause safely.
- Spectator sees chat before voting in browser smoke.

## Not V6.3

- Strategic AI.
- Formal bot matchmaking.
- New roles.
- New player counts.
- Full UI redesign.
- Rule changes.
- Replacing the dedicated host trust model.

## Completion

V6.3 is complete when a dedicated host can open a demo room, fill it with AI, run single-step or 5-second auto-step pacing, let spectators visibly observe day chat before readiness, reveal votes only after resolution, and pause the demo without exposing hidden information outside the dedicated-host console.
