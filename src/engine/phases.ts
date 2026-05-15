export const gamePhases = [
  "night_werewolves",
  "thief_choice",
  "night_cupid",
  "night_seer",
  "night_witch",
  "day_discussion",
  "sheriff_election",
  "day_vote",
  "hunter_revenge",
  "sheriff_succession",
  "ended"
] as const;

export type Phase = (typeof gamePhases)[number];
