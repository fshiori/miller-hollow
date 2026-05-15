import { roleDefinitions, type Role } from "./roles";

export type OfficialBasicPresetId =
  | "official_basic_8"
  | "official_basic_9"
  | "official_basic_10"
  | "official_basic_11"
  | "official_basic_12"
  | "official_basic_13"
  | "official_basic_14"
  | "official_basic_15"
  | "official_basic_16"
  | "official_basic_17"
  | "official_basic_18";

export type OfficialRoleflowPresetId = "official_roleflow_8";
export type AppBasicPresetId = "app_basic_8" | "app_basic_9" | "app_basic_10" | "app_basic_11" | "app_basic_12";
export type LegacyBasicPresetId = "basic_8" | "basic_9" | "basic_10" | "basic_11" | "basic_12";
export type BasicPresetId = OfficialBasicPresetId | OfficialRoleflowPresetId | AppBasicPresetId | LegacyBasicPresetId;
export type PresetFamily = "official_basic" | "official_roleflow" | "app_basic";
export type RulesSource = "official_rulebook" | "miller_hollow_app";

export interface RolePreset {
  id: BasicPresetId;
  family: PresetFamily;
  label: string;
  rulesSource: RulesSource;
  playerCount: number;
  roles: readonly Role[];
  enabled: boolean;
  nightOrder: "legacy" | "official";
  werewolfTimeoutNoKill: boolean;
  sheriffEnabled: boolean;
  aliasOf?: AppBasicPresetId;
}

export interface PublicPresetSummary {
  id: BasicPresetId;
  family: PresetFamily;
  label: string;
  rulesSource: RulesSource;
  playerCount: number;
  roleSummary: Array<{ role: Role; label: string; count: number }>;
}

const officialRoleCounts = {
  official_basic_8: { werewolf: 2, seer: 1, villager: 5 },
  official_basic_9: { werewolf: 2, seer: 1, villager: 6 },
  official_basic_10: { werewolf: 2, seer: 1, villager: 7 },
  official_basic_11: { werewolf: 2, seer: 1, villager: 8 },
  official_basic_12: { werewolf: 3, seer: 1, villager: 8 },
  official_basic_13: { werewolf: 3, seer: 1, villager: 9 },
  official_basic_14: { werewolf: 3, seer: 1, villager: 10 },
  official_basic_15: { werewolf: 3, seer: 1, villager: 11 },
  official_basic_16: { werewolf: 3, seer: 1, villager: 12 },
  official_basic_17: { werewolf: 3, seer: 1, villager: 13 },
  official_basic_18: { werewolf: 4, seer: 1, villager: 13 }
} as const satisfies Record<OfficialBasicPresetId, Partial<Record<Role, number>>>;

const appRoleCounts = {
  app_basic_8: { werewolf: 2, seer: 1, witch: 1, villager: 4 },
  app_basic_9: { werewolf: 2, seer: 1, witch: 1, villager: 5 },
  app_basic_10: { werewolf: 2, seer: 1, witch: 1, villager: 6 },
  app_basic_11: { werewolf: 3, seer: 1, witch: 1, villager: 6 },
  app_basic_12: { werewolf: 3, seer: 1, witch: 1, villager: 7 }
} as const satisfies Record<AppBasicPresetId, Partial<Record<Role, number>>>;

const officialRoleflowCounts = {
  official_roleflow_8: { werewolf: 2, seer: 1, hunter: 1, villager: 4 }
} as const satisfies Record<OfficialRoleflowPresetId, Partial<Record<Role, number>>>;

const legacyAliases = {
  basic_8: "app_basic_8",
  basic_9: "app_basic_9",
  basic_10: "app_basic_10",
  basic_11: "app_basic_11",
  basic_12: "app_basic_12"
} as const satisfies Record<LegacyBasicPresetId, AppBasicPresetId>;

export const DEFAULT_BASIC_PRESET_ID: BasicPresetId = "official_basic_8";

const officialPresets = (Object.entries(officialRoleCounts) as Array<[OfficialBasicPresetId, Partial<Record<Role, number>>]>).map(
  ([id, counts]) => {
    const playerCount = Number(id.replace("official_basic_", ""));
    return createPreset({
      id,
      family: "official_basic",
      label: `${playerCount}-player official beginner`,
      rulesSource: "official_rulebook",
      playerCount,
      counts,
      nightOrder: "legacy",
      werewolfTimeoutNoKill: false,
      sheriffEnabled: false
    });
  }
);

const officialRoleflowPresets = (
  Object.entries(officialRoleflowCounts) as Array<[OfficialRoleflowPresetId, Partial<Record<Role, number>>]>
).map(([id, counts]) => {
  const playerCount = Number(id.replace("official_roleflow_", ""));
  return createPreset({
    id,
    family: "official_roleflow",
    label: `${playerCount}-player official roleflow`,
    rulesSource: "official_rulebook",
    playerCount,
    counts,
    nightOrder: "official",
    werewolfTimeoutNoKill: true,
    sheriffEnabled: true
  });
});

const appPresets = (Object.entries(appRoleCounts) as Array<[AppBasicPresetId, Partial<Record<Role, number>>]>).map(([id, counts]) => {
  const playerCount = Number(id.replace("app_basic_", ""));
  return createPreset({
    id,
    family: "app_basic",
    label: `${playerCount}-player app basic`,
    rulesSource: "miller_hollow_app",
    playerCount,
    counts,
    nightOrder: "legacy",
    werewolfTimeoutNoKill: false,
    sheriffEnabled: false
  });
});

const legacyPresets = (Object.entries(legacyAliases) as Array<[LegacyBasicPresetId, AppBasicPresetId]>).map(([id, aliasOf]) => {
  const source = appPresets.find((preset) => preset.id === aliasOf);
  if (!source) throw new Error(`Missing legacy preset source ${aliasOf}`);
  return Object.freeze({
    ...source,
    id,
    label: source.label.replace("app basic", "legacy app basic"),
    aliasOf
  });
});

export const BASIC_PRESETS = Object.freeze([...officialPresets, ...officialRoleflowPresets, ...appPresets, ...legacyPresets]) as readonly RolePreset[];
export const v1Preset = getBasicPreset("basic_8");

export function isBasicPresetId(value: unknown): value is BasicPresetId {
  return typeof value === "string" && BASIC_PRESETS.some((preset) => preset.id === value);
}

export function getBasicPreset(presetId: unknown): RolePreset {
  const preset = BASIC_PRESETS.find((candidate) => candidate.id === presetId);
  if (!preset) {
    throw new Error("Unsupported preset");
  }
  return preset;
}

export function getPublicPresetSummary(preset: RolePreset): PublicPresetSummary {
  return {
    id: preset.id,
    family: preset.family,
    label: preset.label,
    rulesSource: preset.rulesSource,
    playerCount: preset.playerCount,
    roleSummary: roleSummary(preset.roles)
  };
}

function createPreset(input: {
  id: BasicPresetId;
  family: PresetFamily;
  label: string;
  rulesSource: RulesSource;
  playerCount: number;
  counts: Partial<Record<Role, number>>;
  nightOrder: "legacy" | "official";
  werewolfTimeoutNoKill: boolean;
  sheriffEnabled: boolean;
}): RolePreset {
  const roles = expandRoles(input.counts);
  if (roles.length !== input.playerCount) {
    throw new Error(`${input.id} has ${roles.length} roles for ${input.playerCount} players`);
  }
  for (const role of roles) {
    if (!roleDefinitions[role]?.implemented) {
      throw new Error(`${input.id} includes unimplemented role ${role}`);
    }
  }
  return Object.freeze({
    id: input.id,
    family: input.family,
    label: input.label,
    rulesSource: input.rulesSource,
    playerCount: input.playerCount,
    roles: Object.freeze(roles),
    enabled: true,
    nightOrder: input.nightOrder,
    werewolfTimeoutNoKill: input.werewolfTimeoutNoKill,
    sheriffEnabled: input.sheriffEnabled
  });
}

function expandRoles(counts: Partial<Record<Role, number>>): Role[] {
  return (["werewolf", "seer", "witch", "hunter", "villager"] as const).flatMap((role) =>
    Array.from({ length: counts[role] ?? 0 }, () => role)
  );
}

function roleSummary(roles: readonly Role[]): Array<{ role: Role; label: string; count: number }> {
  const counts = roles.reduce<Partial<Record<Role, number>>>((acc, role) => {
    acc[role] = (acc[role] ?? 0) + 1;
    return acc;
  }, {});
  return (["werewolf", "seer", "witch", "hunter", "villager"] as const)
    .map((role) => ({ role, label: roleDefinitions[role].displayName, count: counts[role] ?? 0 }))
    .filter((entry) => entry.count > 0);
}
