import type { Phase } from "./phases";
import type { Role, Team } from "./roles";
import type { GameEvent, GameState, PlayerId, PublicVoteResult } from "./state";

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
  voteResults: PublicVoteResult[];
  sheriff: {
    holderId?: PlayerId;
    electionAvailable: boolean;
  };
  phaseStatus: {
    label: string;
    submittedCount?: number;
    requiredCount?: number;
  };
  endgameReveal?: {
    winner: Team;
    players: PublicPlayerView[];
    timeline: GameEvent[];
  };
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
  legalRoleChoices?: Role[];
  loverPartnerId?: PlayerId;
  pendingWerewolfTarget?: PlayerId;
  witchPotions: {
    saveAvailable: boolean;
    poisonAvailable: boolean;
  };
  privateEvents: GameEvent[];
  actionState: {
    required: boolean;
    submitted: boolean;
    label?: string;
    waitingFor?: string;
    cannotActReason?: string;
  };
}

export function toPublicView(state: GameState): PublicGameView {
  const revealRoles = state.phase === "ended";
  const players = state.players.map((player) => ({
    id: player.id,
    nickname: player.nickname,
    alive: state.alive[player.id] ?? false,
    ...(revealRoles ? { role: state.roles[player.id] } : {})
  }));
  return {
    phase: state.phase,
    round: state.round,
    players,
    publicEvents: state.publicEvents,
    voteResults: state.publicVoteResults ?? [],
    sheriff: {
      ...(state.sheriff.holderId ? { holderId: state.sheriff.holderId } : {}),
      electionAvailable: state.rules.sheriffEnabled && state.phase === "day_discussion" && !state.sheriff.holderId
    },
    phaseStatus: publicPhaseStatus(state),
    ...(state.phase === "ended" && state.winner
      ? {
          endgameReveal: {
            winner: state.winner,
            players,
            timeline: state.publicEvents
          }
        }
      : {}),
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
  if (alive && role === "thief" && state.phase === "thief_choice" && state.thief?.playerId === playerId) {
    legalActions.push("submit_thief_choice");
  }
  if (alive && role === "cupid" && state.phase === "night_cupid" && !state.lovers) {
    legalActions.push("submit_cupid_lovers");
  }
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
  if (alive && state.phase === "sheriff_election") {
    legalActions.push("submit_sheriff_vote");
  }
  const pendingReaction = state.pendingReactions[0];
  if (!alive && role === "hunter" && pendingReaction?.type === "hunter_revenge" && pendingReaction.hunterId === playerId) {
    legalActions.push("submit_hunter_shot");
  }
  if (!alive && pendingReaction?.type === "sheriff_succession" && pendingReaction.fromId === playerId) {
    legalActions.push("submit_sheriff_successor");
  }

  const legalTargets = state.players
    .filter((player) => state.alive[player.id])
    .filter((player) => {
      if (state.phase !== "sheriff_election" && state.phase !== "night_cupid" && player.id === playerId) {
        return false;
      }
      if (state.phase === "night_cupid") {
        return role === "cupid";
      }
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
      if (state.phase === "sheriff_election") {
        return alive;
      }
      if (state.phase === "hunter_revenge") {
        return pendingReaction?.type === "hunter_revenge" && pendingReaction.hunterId === playerId;
      }
      if (state.phase === "sheriff_succession") {
        return pendingReaction?.type === "sheriff_succession" && pendingReaction.fromId === playerId;
      }
      return false;
    })
    .map((player) => player.id);

  const actionState = privateActionState(state, playerId, role, alive, legalActions);

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
    ...(role === "thief" && state.phase === "thief_choice" && state.thief?.playerId === playerId
      ? { legalRoleChoices: state.thief.spareRoles }
      : {}),
    ...(state.lovers?.playerIds.includes(playerId)
      ? { loverPartnerId: state.lovers.playerIds.find((candidate) => candidate !== playerId) as PlayerId }
      : {}),
    ...(role === "witch" && state.nightActions.werewolfTarget
      ? { pendingWerewolfTarget: state.nightActions.werewolfTarget }
      : {}),
    witchPotions: {
      saveAvailable: role === "witch" && state.witchSaveAvailable,
      poisonAvailable: role === "witch" && state.witchPoisonAvailable
    },
    legalActions,
    privateEvents: state.privateEvents[playerId] ?? [],
    actionState
  };
}

function publicPhaseStatus(state: GameState): PublicGameView["phaseStatus"] {
  if (state.phase === "night_werewolves") {
    return {
      label: state.nightActions.werewolfTarget ? "Werewolves submitted" : "Waiting for werewolves",
      submittedCount: state.nightActions.werewolfTarget ? 1 : 0,
      requiredCount: 1
    };
  }
  if (state.phase === "night_cupid") {
    return { label: "Waiting for cupid", submittedCount: state.lovers ? 1 : 0, requiredCount: 1 };
  }
  if (state.phase === "thief_choice") {
    return { label: "Waiting for thief", submittedCount: state.thief?.chosenRole ? 1 : 0, requiredCount: 1 };
  }
  if (state.phase === "night_seer") {
    const livingSeer = state.players.find((player) => state.alive[player.id] && state.roles[player.id] === "seer");
    return {
      label: "Waiting for seer",
      submittedCount: livingSeer ? 0 : 1,
      requiredCount: 1
    };
  }
  if (state.phase === "night_witch") {
    const livingWitch = state.players.find((player) => state.alive[player.id] && state.roles[player.id] === "witch");
    return {
      label: "Waiting for witch",
      submittedCount: livingWitch ? 0 : 1,
      requiredCount: 1
    };
  }
  if (state.phase === "day_discussion") {
    return { label: "Discussion open" };
  }
  if (state.phase === "day_vote") {
    const livingCount = state.players.filter((player) => state.alive[player.id]).length;
    return {
      label: "Voting",
      submittedCount: Object.keys(state.votes).length,
      requiredCount: livingCount
    };
  }
  if (state.phase === "sheriff_election") {
    const livingCount = state.players.filter((player) => state.alive[player.id]).length;
    return {
      label: "Sheriff election",
      submittedCount: Object.keys(state.sheriff.electionVotes).length,
      requiredCount: livingCount
    };
  }
  if (state.phase === "hunter_revenge") {
    return { label: "Hunter revenge", submittedCount: 0, requiredCount: 1 };
  }
  if (state.phase === "sheriff_succession") {
    return { label: "Sheriff succession", submittedCount: 0, requiredCount: 1 };
  }
  return { label: state.winner ? `${state.winner} win` : "Game over" };
}

function privateActionState(
  state: GameState,
  playerId: PlayerId,
  role: Role,
  alive: boolean,
  legalActions: string[]
): PrivatePlayerView["actionState"] {
  const pendingReaction = state.pendingReactions[0];
  if (!alive && role === "hunter" && state.phase === "hunter_revenge" && pendingReaction?.type === "hunter_revenge" && pendingReaction.hunterId === playerId) {
    return {
      required: true,
      submitted: false,
      label: "Hunter shot",
      waitingFor: "Hunter shot"
    };
  }
  if (!alive && state.phase === "sheriff_succession" && pendingReaction?.type === "sheriff_succession" && pendingReaction.fromId === playerId) {
    return {
      required: true,
      submitted: false,
      label: "Choose Sheriff successor",
      waitingFor: "Sheriff successor"
    };
  }
  if (!alive) {
    return {
      required: false,
      submitted: false,
      cannotActReason: "Dead players cannot act."
    };
  }
  if (state.phase === "thief_choice" && role === "thief" && state.thief?.playerId === playerId) {
    return {
      required: true,
      submitted: Boolean(state.thief.chosenRole),
      label: "Choose Thief role",
      ...(state.thief.chosenRole ? {} : { waitingFor: "Thief choice" })
    };
  }
  if (state.phase === "night_cupid" && role === "cupid") {
    return {
      required: true,
      submitted: Boolean(state.lovers),
      label: "Choose Lovers",
      ...(state.lovers ? {} : { waitingFor: "Cupid lovers" })
    };
  }
  if (state.phase === "night_werewolves" && role === "werewolf") {
    return {
      required: true,
      submitted: Boolean(state.nightActions.werewolfTarget),
      label: "Choose a victim",
      ...(state.nightActions.werewolfTarget ? {} : { waitingFor: "Werewolf target" })
    };
  }
  if (state.phase === "night_seer" && role === "seer") {
    return {
      required: true,
      submitted: false,
      label: "Inspect a player",
      waitingFor: "Seer vision"
    };
  }
  if (state.phase === "night_witch" && role === "witch") {
    return {
      required: true,
      submitted: false,
      label: "Use or skip potions",
      waitingFor: "Witch action"
    };
  }
  if (state.phase === "day_vote") {
    return {
      required: true,
      submitted: Boolean(state.votes[playerId]),
      label: "Vote",
      ...(state.votes[playerId] ? {} : { waitingFor: "Your vote" })
    };
  }
  if (state.phase === "sheriff_election") {
    return {
      required: true,
      submitted: Boolean(state.sheriff.electionVotes[playerId]),
      label: "Sheriff vote",
      ...(state.sheriff.electionVotes[playerId] ? {} : { waitingFor: "Sheriff vote" })
    };
  }
  return {
    required: legalActions.length > 0,
    submitted: false,
    ...(legalActions.length > 0 ? {} : { cannotActReason: "No action available in this phase." })
  };
}
