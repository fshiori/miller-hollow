# Miller Hollow Host Authorization Matrix

Date: 2026-05-15

| Endpoint / Action | Host | Non-Host Player | Spectator | Playing Room |
| --- | --- | --- | --- | --- |
| `start_game` | Allowed when full and all ready | Denied | Denied | Denied after start |
| `host/lock` | Allowed in lobby | Denied | Denied | Denied |
| `host/unlock` | Allowed in lobby | Denied | Denied | Denied |
| `host/enable-spectators` | Allowed | Denied | Denied | Allowed |
| `host/disable-spectators` | Allowed | Denied | Denied | Allowed |
| `host/kick` | Allowed in lobby for non-host seats | Denied | Denied | Denied |
| `host/transfer` | Allowed in lobby to occupied seat | Denied | Denied | Denied |
| `host/reset-lobby` | Allowed when not playing | Denied | Denied | Denied while playing |
| `diagnostics` | Allowed | Denied | Denied | Allowed |

All host endpoints must authenticate with the host seat id and reconnect token. Responses must not include hidden roles before endgame.

