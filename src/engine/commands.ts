import type { PlayerId } from "./state";

export type GameCommand =
  | { type: "submit_werewolf_target"; actorId: PlayerId; targetId: PlayerId }
  | { type: "submit_seer_target"; actorId: PlayerId; targetId?: PlayerId }
  | {
      type: "submit_witch_action";
      actorId: PlayerId;
      saveTargetId?: PlayerId;
      poisonTargetId?: PlayerId;
    }
  | { type: "advance_to_vote" }
  | { type: "submit_vote"; actorId: PlayerId; targetId: PlayerId | "abstain" }
  | { type: "resolve_vote"; missingVotesAsAbstain: boolean };
