# Miller Hollow Hidden Information Matrix

Date: 2026-05-15

| Information | Public Before End | Player Private | Spectator Before End | Player Host | Dedicated Host Console | Public After End |
| --- | --- | --- | --- | --- | --- | --- |
| Own role | No | Yes, own role only | No | Own role only as a player | Yes | Yes |
| Other player roles | No | Werewolf teammates only for Werewolves | No | Werewolf teammates only if Werewolf | Yes | Yes |
| Seer results | No | Seer only | No | Seer only if host is Seer | Yes | Reveal-safe timeline only |
| Witch potion availability | No | Witch only | No | Witch only if host is Witch | Yes | No unless summarized |
| Werewolf target | No | Werewolf/Witch context as allowed | No | Player-private context only | Yes | Reveal-safe timeline only |
| Werewolf proposed target | No | Living Werewolves during Werewolf night | No | Only if host is living Werewolf | Yes | No unless committed through events |
| Werewolf private chat | No | Living Werewolves during Werewolf night | No | Only if host is living Werewolf | Yes | No |
| Werewolf ready ids | Aggregate count only | Living Werewolves during Werewolf night | Aggregate count only | Only if host is living Werewolf | Yes | No |
| Day ready ids | Yes during day discussion | Yes during day discussion | Yes during day discussion | Yes during day discussion | Yes | No |
| Live vote map during active vote | No | Own submitted state only | No | Own submitted state only | Yes | No |
| Sheriff election live vote map | No | Own submitted state only | No | Own submitted state only | Yes | No |
| Current Sheriff holder | Yes | Yes | Yes | Yes | Yes | Yes |
| Pending Hunter revenge actor | Publicly implied by phase | Hunter only can act | Publicly implied by phase | Hunter only if host is Hunter | Yes | Yes if roles revealed |
| Pending Sheriff successor actor | Publicly implied by phase | Sheriff only can act | Publicly implied by phase | Sheriff only if host is Sheriff | Yes | Yes if roles revealed |
| Thief spare role choice | No | Thief only during `thief_choice` | No | Thief only if host is Thief | Yes | Yes if roles revealed |
| Cupid identity and target controls | No | Cupid only during `night_cupid` | No | Cupid only if host is Cupid | Yes | Yes |
| Lover pair | No | Each Lover sees partner only | No | Own Lover partner only if host is Lover | Yes | Yes |
| Lover heartbreak cause | Public event only, no roles | Yes via public event and own alive state | Public event only, no roles | Yes via public event and own alive state | Yes | Yes |
| Resolved vote result after vote resolution | Yes, including weights | Yes, including weights | Yes, including weights | Yes, including weights | Yes | Yes |
| Votes submitted count | Aggregate only | Aggregate plus own vote submitted state | Aggregate only | Aggregate plus own vote submitted state | Yes | Yes via resolved result |
| Reconnect token | No | Browser-held only | No | Browser-held only | No | No |
| Token hash | No | No | No | No | No | No |
| Socket ticket | No | Short-lived transport only | Short-lived transport only | Short-lived transport only | No | No |
| Observer ticket | No | No | No | No | Short-lived transport only | No |
