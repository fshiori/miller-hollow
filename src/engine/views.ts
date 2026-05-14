import type { Phase } from "./phases";
import type { Role, Team } from "./roles";
import type { GameEvent, GameState, PlayerId } from "./state";

export interface PublicPlayerView {
  id: PlayerId;
  nickname: string;
  alive: boolean;
  role?: Role;
}

export interface PublicGameView {
  phase: Phase;
  round: number;
  players: PublicPlayerView[];
  publicEvents: GameEvent[];
  winner?: Team;
}

export interface PrivatePlayerView {
  playerId: PlayerId;
  role: Role;
  alive: boolean;
  werewolfTeammates: PlayerId[];
  seerResults: Record<PlayerId, Role>;
  legalActions: string[];
  legalTargets: PlayerId[];
  pendingWerewolfTarget?: PlayerId;
  witchPotions: {
    saveAvailable: boolean;
    poisonAvailable: boolean;
  };
  privateEvents: GameEvent[];
}

export function toPublicView(state: GameState): PublicGameView {
  const revealRoles = state.phase === "ended";
  return {
    phase: state.phase,
    round: state.round,
    players: state.players.map((player) => ({
      id: player.id,
      nickname: player.nickname,
      alive: state.alive[player.id] ?? false,
      ...(revealRoles ? { role: state.roles[player.id] } : {})
    })),
    publicEvents: state.publicEvents,
    ...(state.winner ? { winner: state.winner } : {})
  };
}

export function toPrivatePlayerView(state: GameState, playerId: PlayerId): PrivatePlayerView {
  const role = state.roles[playerId];
  if (!role) {
    throw new Error("Unknown player");
  }

  const alive = state.alive[playerId] ?? false;
  const legalActions: string[] = [];
  if (alive && role === "werewolf" && state.phase === "night_werewolves") {
    legalActions.push("submit_werewolf_target");
  }
  if (alive && role === "seer" && state.phase === "night_seer") {
    legalActions.push("submit_seer_target");
  }
  if (alive && role === "witch" && state.phase === "night_witch") {
    legalActions.push("submit_witch_action");
  }
  if (alive && state.phase === "day_vote") {
    legalActions.push("submit_vote");
  }

  const legalTargets = state.players
    .filter((player) => player.id !== playerId && state.alive[player.id])
    .filter((player) => {
      if (state.phase === "night_werewolves") {
        return role === "werewolf" && state.roles[player.id] !== "werewolf";
      }
      if (state.phase === "night_seer") {
        return role === "seer";
      }
      if (state.phase === "night_witch") {
        return role === "witch";
      }
      if (state.phase === "day_vote") {
        return alive;
      }
      return false;
    })
    .map((player) => player.id);

  return {
    playerId,
    role,
    alive,
    werewolfTeammates:
      role === "werewolf"
        ? state.players
            .filter((player) => player.id !== playerId && state.roles[player.id] === "werewolf")
            .map((player) => player.id)
        : [],
    seerResults: role === "seer" ? state.nightActions.seerViews : {},
    legalTargets,
    ...(role === "witch" && state.nightActions.werewolfTarget
      ? { pendingWerewolfTarget: state.nightActions.werewolfTarget }
      : {}),
    witchPotions: {
      saveAvailable: role === "witch" && state.witchSaveAvailable,
      poisonAvailable: role === "witch" && state.witchPoisonAvailable
    },
    legalActions,
    privateEvents: state.privateEvents[playerId] ?? []
  };
}
