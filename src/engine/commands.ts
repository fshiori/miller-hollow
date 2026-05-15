import type { PlayerId } from "./state";

export type GameCommand =
  | { type: "submit_werewolf_target"; actorId: PlayerId; targetId: PlayerId; source?: "direct" | "proposal" | "timeout" }
  | { type: "skip_werewolf_target"; actorId: PlayerId }
  | { type: "submit_seer_target"; actorId: PlayerId; targetId?: PlayerId }
  | {
      type: "submit_witch_action";
      actorId: PlayerId;
      saveTargetId?: PlayerId;
      poisonTargetId?: PlayerId;
    }
  | { type: "open_sheriff_election"; actorId: PlayerId }
  | { type: "submit_sheriff_vote"; actorId: PlayerId; targetId: PlayerId | "abstain" }
  | { type: "resolve_sheriff_election"; missingVotesAsAbstain: boolean }
  | { type: "advance_to_vote" }
  | { type: "submit_vote"; actorId: PlayerId; targetId: PlayerId | "abstain" }
  | { type: "resolve_vote"; missingVotesAsAbstain: boolean }
  | { type: "submit_hunter_shot"; actorId: PlayerId; targetId?: PlayerId }
  | { type: "submit_sheriff_successor"; actorId: PlayerId; targetId?: PlayerId };
