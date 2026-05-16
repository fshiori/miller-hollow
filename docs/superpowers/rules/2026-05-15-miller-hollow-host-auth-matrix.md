# Miller Hollow Host Authorization Matrix

Date: 2026-05-15

| Endpoint / Action | Player Host | Dedicated Host | Non-Host Player | Spectator | Playing Room |
| --- | --- | --- | --- | --- | --- |
| `start_game` | Allowed when full and all ready | Allowed when full and all ready | Denied | Denied | Denied after start |
| `host/lock` | Allowed in lobby | Allowed in lobby | Denied | Denied | Denied |
| `host/unlock` | Allowed in lobby | Allowed in lobby | Denied | Denied | Denied |
| `host/enable-spectators` | Allowed | Allowed | Denied | Denied | Allowed |
| `host/disable-spectators` | Allowed | Allowed | Denied | Denied | Allowed |
| `host/kick` | Allowed in lobby for non-host seats | Allowed in lobby | Denied | Denied | Denied |
| `host/transfer` | Allowed in lobby to occupied seat | Denied | Denied | Denied | Denied |
| `host/reset-lobby` | Allowed when not playing | Allowed when not playing | Denied | Denied | Denied while playing |
| `host/advance-phase` | Allowed when playing | Allowed when playing | Denied | Denied | Allowed |
| `host/open-sheriff-election` | Allowed during day discussion when no Sheriff is elected | Allowed during day discussion when no Sheriff is elected | Denied | Denied | Allowed only in V5 roleflow-compatible state |
| `diagnostics` | Allowed | Allowed | Denied | Denied | Allowed |
| `observer-ticket` | Denied | Allowed | Denied | Denied | Allowed |
| `observer-state` | Denied | Allowed | Denied | Denied | Allowed |
| `observer-socket` | Denied | Allowed with observer ticket | Denied | Denied | Allowed |

Player-host endpoints authenticate with the host seat id and reconnect token. Dedicated-host endpoints authenticate with the dedicated host token. Responses must not include hidden roles before endgame except through dedicated-host console endpoints.

Dedicated-host console endpoints are the exception to hidden-role redaction: they are privileged, read-only, require `settings.hostMode === "dedicated_host"`, and may reveal gameplay-hidden information to the authenticated dedicated host. They must still never include reconnect tokens, token hashes, host token hashes, or ticket hashes.
