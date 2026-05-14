import type { Phase } from "./phases";
import type { Role, Team } from "./roles";

export type PlayerId = string;

export interface GamePlayer {
  id: PlayerId;
  nickname: string;
}

export interface NightActions {
  werewolfTarget?: PlayerId;
  seerViews: Record<PlayerId, Role>;
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

export interface GameState {
  phase: Phase;
  round: number;
  players: GamePlayer[];
  roles: Record<PlayerId, Role>;
  alive: Record<PlayerId, boolean>;
  nightActions: NightActions;
  votes: Record<PlayerId, PlayerId | "abstain">;
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
