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

export interface RoleDefinition {
  id: Role;
  displayName: string;
  team: Team;
  officialName?: string;
  implemented: boolean;
  setupPhase?: boolean;
  nightOrder?: number;
  hasPrivateAction?: boolean;
  hasDeathTrigger?: boolean;
  modifiesVoting?: boolean;
  modifiesWinCondition?: boolean;
}

export const roleDefinitions: Record<Role, RoleDefinition> = {
  werewolf: {
    id: "werewolf",
    displayName: "Werewolf",
    team: "werewolves",
    implemented: true,
    nightOrder: 20,
    hasPrivateAction: true
  },
  villager: {
    id: "villager",
    displayName: "Ordinary Townsfolk",
    team: "village",
    implemented: true
  },
  seer: {
    id: "seer",
    displayName: "Fortune Teller",
    officialName: "Fortune Teller",
    team: "village",
    implemented: true,
    nightOrder: 10,
    hasPrivateAction: true
  },
  witch: {
    id: "witch",
    displayName: "Witch",
    team: "village",
    implemented: true,
    nightOrder: 30,
    hasPrivateAction: true
  },
  hunter: {
    id: "hunter",
    displayName: "Hunter",
    team: "village",
    implemented: true,
    hasDeathTrigger: true
  },
  cupid: {
    id: "cupid",
    displayName: "Cupido",
    officialName: "Cupido",
    team: "village",
    implemented: false,
    setupPhase: true,
    modifiesWinCondition: true
  },
  thief: {
    id: "thief",
    displayName: "Thief",
    team: "village",
    implemented: false,
    setupPhase: true
  },
  little_girl: {
    id: "little_girl",
    displayName: "Little Girl",
    team: "village",
    implemented: false
  },
  captain: {
    id: "captain",
    displayName: "Sheriff",
    officialName: "Sheriff",
    team: "village",
    implemented: false,
    modifiesVoting: true
  }
};

export function teamForRole(role: Role): Team {
  return roleDefinitions[role].team;
}
