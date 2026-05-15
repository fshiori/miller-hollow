import type { Phase } from "./phases";
import type { Role, Team } from "./roles";

export type PlayerId = string;

export interface GamePlayer {
  id: PlayerId;
  nickname: string;
}

export interface NightActions {
  werewolfTarget?: PlayerId;
  werewolfTargetSource?: "direct" | "proposal" | "timeout";
  seerViews: Record<PlayerId, Role>;
  seerSkipped?: boolean;
  witchSavedTarget?: PlayerId;
  witchPoisonTarget?: PlayerId;
}

export interface GameEvent {
  id: string;
  visibility: "public" | "private";
  playerId?: PlayerId;
  type:
    | "game_started"
    | "phase_changed"
    | "seer_saw_role"
    | "night_deaths"
    | "day_vote_resolved"
    | "game_ended";
  message: string;
}

export interface PublicVoteResult {
  id: string;
  round: number;
  votes: Array<{
    voterId: PlayerId;
    targetId: PlayerId | "abstain";
    weight: number;
  }>;
  tally: Record<string, number>;
  executedPlayerId?: PlayerId;
  tied: boolean;
  createdAt: number;
}

export interface SheriffState {
  holderId?: PlayerId;
  electionVotes: Record<PlayerId, PlayerId | "abstain">;
  electionCount: number;
  successionFromId?: PlayerId;
}

export interface ResumeState {
  phase: Phase;
  incrementRound?: boolean;
  resetNightActions?: boolean;
}

export type PendingReaction =
  | { type: "hunter_revenge"; hunterId: PlayerId; resume: ResumeState }
  | { type: "sheriff_succession"; fromId: PlayerId; resume: ResumeState };

export interface GameRules {
  nightOrder: "legacy" | "official";
  werewolfTimeoutNoKill: boolean;
  sheriffEnabled: boolean;
}

export interface ThiefState {
  playerId?: PlayerId;
  spareRoles: Role[];
  chosenRole?: Role;
}

export interface GameState {
  phase: Phase;
  round: number;
  players: GamePlayer[];
  roles: Record<PlayerId, Role>;
  alive: Record<PlayerId, boolean>;
  nightActions: NightActions;
  votes: Record<PlayerId, PlayerId | "abstain">;
  publicVoteResults: PublicVoteResult[];
  thief?: ThiefState;
  sheriff: SheriffState;
  pendingReactions: PendingReaction[];
  resumeAfterReactions?: ResumeState;
  rules: GameRules;
  witchSaveAvailable: boolean;
  witchPoisonAvailable: boolean;
  publicEvents: GameEvent[];
  privateEvents: Record<PlayerId, GameEvent[]>;
  winner?: Team;
}

export interface ReducerResult {
  state: GameState;
  events: GameEvent[];
}
