export const gamePhases = [
  "night_werewolves",
  "night_seer",
  "night_witch",
  "day_discussion",
  "day_vote",
  "ended"
] as const;

export type Phase = (typeof gamePhases)[number];
