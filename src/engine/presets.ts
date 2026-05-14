import { enabledV1Roles } from "./roles";

export const v1Preset = {
  id: "official_8_player_base_v1",
  playerCount: 8,
  roles: enabledV1Roles
} as const;
