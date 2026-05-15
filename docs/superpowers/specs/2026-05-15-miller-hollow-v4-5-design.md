# Miller Hollow V4.5 Design

Date: 2026-05-15

Sources:

- V4 design: `docs/superpowers/specs/2026-05-15-miller-hollow-v4-design.md`
- V4 implementation plan: `docs/superpowers/impl/2026-05-15-miller-hollow-v4-impl.md`

## Goal

V4.5 should make the currently playable V4 game understandable and comfortable for Traditional Chinese players.

The release is a product polish release, not a rules expansion. It should translate the full player-facing interface to Traditional Chinese, standardize game terminology, and tighten unclear UX copy around lobby, night, day, voting, host controls, spectator mode, reconnect, errors, and endgame.

V4.5 should not add new roles or change public API contracts.

## Why This Is V4.5

V4 shipped the official 8-18 player foundation. The next risk is not game logic; it is player comprehension.

The current UI still exposes English-first labels such as Create, Join, Ready, Start, Spectator, Host, Werewolf, Fortune Teller, Villager, and phase names. For a social deduction game, unclear labels slow down onboarding and create table friction.

V4.5 should complete the V4 player experience before V5 adds new mechanics.

## Version Boundaries

### V4.5: Traditional Chinese UX

V4.5 should ship:

- Full Traditional Chinese player-facing UI.
- Consistent Traditional Chinese role, phase, status, and action terminology.
- Clear create-room, lobby, game, spectator, reconnect, and endgame copy.
- Localized validation and user-facing error messages.
- Browser smoke checks for core Traditional Chinese strings.
- Documentation updates describing localization decisions.

### V5: First Gameplay Expansion

V5 should be reserved for new gameplay or official-role implementation.

Candidate V5 work:

- Hunter.
- Sheriff / Captain.
- Cupid / Lovers.
- Thief.

V5 should not start until V4.5 has stabilized the base UI language.

## Non-Goals

- No new role behavior.
- No custom role builder.
- No API field renaming.
- No internal id renaming.
- No account system.
- No matchmaking or public lobby directory.
- No English/Chinese language switcher in V4.5 unless it is trivial and does not delay the release.
- No machine translation without terminology review.

## Localization Principle

Internal code and API ids should stay stable and English-based:

- `werewolf`
- `seer`
- `villager`
- `witch`
- `official_basic_8`
- `night_werewolves`
- `day_discussion`

User-facing text should be Traditional Chinese.

This keeps compatibility stable while improving the product experience.

## Terminology

Use the following Traditional Chinese terms consistently:

| Internal / English | Traditional Chinese |
| --- | --- |
| Miller Hollow | 米勒山谷 |
| Room | 房間 |
| Host | 房主 |
| Player | 玩家 |
| Spectator | 觀戰者 |
| Create room | 建立房間 |
| Join room | 加入房間 |
| Watch room | 觀戰 |
| Ready | 準備 |
| Unready | 取消準備 |
| Start game | 開始遊戲 |
| Reconnect | 重新連線 |
| Werewolf | 狼人 |
| Fortune Teller / Seer | 預言家 |
| Ordinary Townsfolk / Villager | 村民 |
| Witch | 女巫 |
| Village team | 村莊陣營 |
| Werewolf team | 狼人陣營 |
| Lobby | 大廳 |
| Night | 夜晚 |
| Day discussion | 白天討論 |
| Day vote | 白天投票 |
| Ended | 遊戲結束 |
| Alive | 存活 |
| Dead | 死亡 |
| Vote | 投票 |
| Abstain | 棄票 |
| Execute | 處決 |
| Winner | 勝利陣營 |

Notes:

- Public UI should use `預言家`, not `Seer` or `Fortune Teller`.
- Official rules may be described as `官方基本局`.
- The app-basic Witch compatibility presets should not appear in the primary create-room UI.
- If compatibility preset names appear in diagnostics or docs, they should be described as compatibility/API presets.

## UI Scope

V4.5 should cover every visible player-facing string in:

- Landing/create/join screen.
- Room metadata.
- Lobby seats.
- Ready/start controls.
- Host tools.
- Share links.
- Spectator entry and spectator room view.
- Private role panel.
- Night action forms.
- Day chat.
- Vote form.
- Timer and phase status.
- Reconnect and connection state.
- Endgame result and role reveal.
- Empty/loading/error states.

V4.5 should also cover browser-generated strings shown through:

- `alert()`
- `confirm()`
- toast-like inline errors
- thrown API error messages surfaced to users

## Copy Requirements

Create-room copy should communicate:

- The game supports 8-18 players.
- Player count is selected before the room is created.
- The selected player count cannot be changed after the room exists.
- The visible role mix is preset information, not assigned seat roles.

Lobby copy should communicate:

- How many players are seated.
- How many players are ready.
- Why start is blocked.
- Whether the current viewer is host, player, or spectator.

Night copy should communicate:

- Which role is acting.
- What the player is allowed to choose.
- When the player has already submitted.
- That non-acting players are waiting.

Day copy should communicate:

- Discussion state.
- Voting state.
- Abstention behavior.
- Timer behavior.

Endgame copy should communicate:

- Winning side.
- Revealed roles.
- Public event timeline.

## Error Copy Requirements

Every user-facing error should be short, actionable, and Traditional Chinese.

Examples:

- `房間不存在或已失效。`
- `房間已滿。`
- `你沒有權限執行這個操作。`
- `請先輸入暱稱。`
- `所有玩家就座並準備後才能開始。`
- `連線中斷，正在嘗試重新連線。`
- `重新連線失敗，請重新加入房間。`

Internal logs and developer diagnostics may remain English.

## Typography And Layout Requirements

Traditional Chinese copy changes text length and line breaks. V4.5 should verify:

- Buttons do not clip text.
- Seat cards do not reflow awkwardly.
- Host controls remain usable on mobile.
- Role and phase labels wrap cleanly.
- Endgame reveal cards remain readable.
- No horizontal overflow on mobile.
- No English fallback remains in primary player flows.

Use concise labels where possible. Avoid long explanatory text inside buttons.

## Testing Requirements

Unit tests do not need to localize internal ids.

Browser smoke should add checks for representative Traditional Chinese strings:

- `建立房間`
- `加入房間`
- `準備`
- `開始遊戲`
- `觀戰`
- `狼人`
- `預言家`
- `村民`
- `白天討論` or `白天投票`
- `遊戲結束`

Smoke should continue proving:

- 18-player official lobby layout.
- Full official 8-player game flow.
- Spectator hidden-information boundary.
- Reconnect preservation.

## Documentation Requirements

Update:

- `CHANGELOG.md`
- `README.md`
- `docs/superpowers/impl/2026-05-15-miller-hollow-release-notes.md`
- Basic edition rules doc if visible terminology changes.
- View contract only if new localized display fields are added.

Docs should state clearly:

- API/internal ids remain English.
- Player-facing UI is Traditional Chinese.
- V4.5 is UX polish, not a rules expansion.

## Completion Criteria

V4.5 is complete when:

- Primary player UI has no English copy in normal create, join, lobby, play, spectator, reconnect, and endgame flows.
- Role, phase, team, and action terms match the terminology table.
- Browser smoke validates core Traditional Chinese strings.
- Existing V4 tests and smoke still pass.
- Deployed app reports the expected version.
- Changelog and release notes summarize the localization work.
