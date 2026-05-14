export const enabledV1Roles = [
  "werewolf",
  "werewolf",
  "seer",
  "witch",
  "villager",
  "villager",
  "villager",
  "villager"
] as const;

export const baseRoleCatalog = [
  "werewolf",
  "villager",
  "seer",
  "witch",
  "hunter",
  "cupid",
  "thief",
  "little_girl",
  "captain"
] as const;

export type Role = (typeof baseRoleCatalog)[number];

export type Team = "village" | "werewolves";

export function teamForRole(role: Role): Team {
  return role === "werewolf" ? "werewolves" : "village";
}
