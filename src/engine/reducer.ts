import type { GameCommand } from "./commands";
import { v1Preset } from "./presets";
import type { RandomSource } from "./random";
import { shuffleWithRandom } from "./random";
import { teamForRole } from "./roles";
import type { Role } from "./roles";
import type { GameEvent, GamePlayer, GameState, PlayerId, ReducerResult } from "./state";

let eventCounter = 0;

function event(type: GameEvent["type"], message: string, extra: Partial<GameEvent> = {}): GameEvent {
  eventCounter += 1;
  return {
    id: `event-${eventCounter}`,
    visibility: extra.visibility ?? "public",
    type,
    message,
    ...extra
  };
}

export function createGame(players: GamePlayer[], random: RandomSource): GameState {
  if (players.length !== v1Preset.playerCount) {
    throw new Error(`V1 requires exactly ${v1Preset.playerCount} players`);
  }

  const roles = shuffleWithRandom<Role>(v1Preset.roles, random);
  const assignedRoles: Record<PlayerId, Role> = {};
  const alive: Record<PlayerId, boolean> = {};
  const privateEvents: Record<PlayerId, GameEvent[]> = {};

  players.forEach((player, index) => {
    assignedRoles[player.id] = roles[index] as Role;
    alive[player.id] = true;
    privateEvents[player.id] = [];
  });

  const startEvent = event("game_started", "The game has started.");

  return {
    phase: "night_werewolves",
    round: 1,
    players,
    roles: assignedRoles,
    alive,
    nightActions: { seerViews: {} },
    votes: {},
    witchSaveAvailable: true,
    witchPoisonAvailable: true,
    publicEvents: [startEvent],
    privateEvents
  };
}

export function applyCommand(state: GameState, command: GameCommand): ReducerResult {
  if (state.winner || state.phase === "ended") {
    return { state, events: [] };
  }

  switch (command.type) {
    case "submit_werewolf_target":
      return submitWerewolfTarget(state, command.actorId, command.targetId);
    case "submit_seer_target":
      return submitSeerTarget(state, command.actorId, command.targetId);
    case "submit_witch_action":
      return submitWitchAction(state, command.actorId, command.saveTargetId, command.poisonTargetId);
    case "advance_to_vote":
      return advanceToVote(state);
    case "submit_vote":
      return submitVote(state, command.actorId, command.targetId);
    case "resolve_vote":
      return resolveVote(state, command.missingVotesAsAbstain);
  }
}

export function buildTimeoutCommand(state: GameState, random: RandomSource): GameCommand {
  if (state.phase === "night_werewolves") {
    const werewolf = livingPlayersWithRole(state, "werewolf")[0];
    const targets = legalWerewolfTargets(state);
    if (!werewolf || targets.length === 0) {
      throw new Error("No legal werewolf timeout command is available");
    }
    return {
      type: "submit_werewolf_target",
      actorId: werewolf,
      targetId: targets[random.nextInt(targets.length)] as PlayerId
    };
  }

  if (state.phase === "night_seer") {
    const seer = livingPlayersWithRole(state, "seer")[0];
    if (!seer) {
      return { type: "submit_seer_target", actorId: firstLivingPlayer(state) };
    }
    return { type: "submit_seer_target", actorId: seer };
  }

  if (state.phase === "night_witch") {
    const witch = livingPlayersWithRole(state, "witch")[0];
    if (!witch) {
      return { type: "submit_witch_action", actorId: firstLivingPlayer(state) };
    }
    return { type: "submit_witch_action", actorId: witch };
  }

  if (state.phase === "day_vote") {
    return { type: "resolve_vote", missingVotesAsAbstain: true };
  }

  throw new Error(`No timeout command for phase ${state.phase}`);
}

function submitWerewolfTarget(state: GameState, actorId: PlayerId, targetId: PlayerId): ReducerResult {
  assertPhase(state, "night_werewolves");
  assertLivingRole(state, actorId, "werewolf");
  if (!legalWerewolfTargets(state).includes(targetId)) {
    throw new Error("Invalid werewolf target");
  }

  const next = cloneState(state);
  next.nightActions.werewolfTarget = targetId;
  next.phase = "night_seer";
  const phaseEvent = event("phase_changed", "The Seer wakes.");
  next.publicEvents.push(phaseEvent);
  return { state: next, events: [phaseEvent] };
}

function submitSeerTarget(state: GameState, actorId: PlayerId, targetId: PlayerId | undefined): ReducerResult {
  assertPhase(state, "night_seer");
  const livingSeer = livingPlayersWithRole(state, "seer")[0];
  if (livingSeer) {
    if (actorId !== livingSeer) {
      throw new Error(`Player ${actorId} is not the living Seer`);
    }
  } else if (targetId) {
    throw new Error("No living Seer can inspect a target");
  }

  const next = cloneState(state);
  const events: GameEvent[] = [];
  if (targetId) {
    assertLivingPlayer(state, targetId);
    const seenRole = state.roles[targetId];
    if (!seenRole) {
      throw new Error("Unknown Seer target");
    }
    next.nightActions.seerViews[targetId] = seenRole;
    const privateEvent = event("seer_saw_role", `You saw ${seenRole}.`, {
      visibility: "private",
      playerId: actorId
    });
    next.privateEvents[actorId] = [...(next.privateEvents[actorId] ?? []), privateEvent];
    events.push(privateEvent);
  }
  next.phase = "night_witch";
  const phaseEvent = event("phase_changed", "The Witch wakes.");
  next.publicEvents.push(phaseEvent);
  events.push(phaseEvent);
  return { state: next, events };
}

function submitWitchAction(
  state: GameState,
  actorId: PlayerId,
  saveTargetId: PlayerId | undefined,
  poisonTargetId: PlayerId | undefined
): ReducerResult {
  assertPhase(state, "night_witch");
  const livingWitch = livingPlayersWithRole(state, "witch")[0];
  if (livingWitch) {
    if (actorId !== livingWitch) {
      throw new Error(`Player ${actorId} is not the living Witch`);
    }
  } else if (saveTargetId || poisonTargetId) {
    throw new Error("No living Witch can use a potion");
  }
  if (saveTargetId && (!state.witchSaveAvailable || saveTargetId !== state.nightActions.werewolfTarget)) {
    throw new Error("Invalid Witch save");
  }
  if (poisonTargetId) {
    if (!state.witchPoisonAvailable) {
      throw new Error("Witch poison has already been used");
    }
    if (poisonTargetId === actorId) {
      throw new Error("Witch cannot poison themselves in V1");
    }
    assertLivingPlayer(state, poisonTargetId);
  }

  const next = cloneState(state);
  const deaths = new Set<PlayerId>();
  if (saveTargetId) {
    next.nightActions.witchSavedTarget = saveTargetId;
    next.witchSaveAvailable = false;
  }
  if (poisonTargetId) {
    next.nightActions.witchPoisonTarget = poisonTargetId;
    next.witchPoisonAvailable = false;
    deaths.add(poisonTargetId);
  }
  if (state.nightActions.werewolfTarget && state.nightActions.werewolfTarget !== saveTargetId) {
    deaths.add(state.nightActions.werewolfTarget);
  }

  for (const playerId of deaths) {
    next.alive[playerId] = false;
  }

  const deathEvent = event(
    "night_deaths",
    deaths.size === 0 ? "No one died during the night." : `${deaths.size} player(s) died during the night.`
  );
  next.publicEvents.push(deathEvent);

  const winner = checkWinner(next);
  if (winner) {
    next.winner = winner;
    next.phase = "ended";
    const endEvent = event("game_ended", `${winner} win.`);
    next.publicEvents.push(endEvent);
    return { state: next, events: [deathEvent, endEvent] };
  }

  next.phase = "day_discussion";
  const phaseEvent = event("phase_changed", "Day discussion begins.");
  next.publicEvents.push(phaseEvent);
  return { state: next, events: [deathEvent, phaseEvent] };
}

function advanceToVote(state: GameState): ReducerResult {
  assertPhase(state, "day_discussion");
  const next = cloneState(state);
  next.phase = "day_vote";
  next.votes = {};
  const phaseEvent = event("phase_changed", "Voting begins.");
  next.publicEvents.push(phaseEvent);
  return { state: next, events: [phaseEvent] };
}

function submitVote(state: GameState, actorId: PlayerId, targetId: PlayerId | "abstain"): ReducerResult {
  assertPhase(state, "day_vote");
  assertLivingPlayer(state, actorId);
  if (targetId !== "abstain") {
    assertLivingPlayer(state, targetId);
  }

  const next = cloneState(state);
  next.votes[actorId] = targetId;
  return { state: next, events: [] };
}

function resolveVote(state: GameState, missingVotesAsAbstain: boolean): ReducerResult {
  assertPhase(state, "day_vote");
  const next = cloneState(state);
  if (missingVotesAsAbstain) {
    for (const player of state.players) {
      if (state.alive[player.id] && !next.votes[player.id]) {
        next.votes[player.id] = "abstain";
      }
    }
  }

  const counts = new Map<PlayerId, number>();
  for (const vote of Object.values(next.votes)) {
    if (vote !== "abstain") {
      counts.set(vote, (counts.get(vote) ?? 0) + 1);
    }
  }

  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const top = sorted[0];
  const tied = top ? sorted.filter(([, count]) => count === top[1]).length > 1 : false;
  const killed = top && !tied ? top[0] : undefined;
  if (killed) {
    next.alive[killed] = false;
  }

  const voteEvent = event(
    "day_vote_resolved",
    killed ? "The village executed one player." : "The vote did not execute anyone."
  );
  next.publicEvents.push(voteEvent);

  const winner = checkWinner(next);
  if (winner) {
    next.winner = winner;
    next.phase = "ended";
    const endEvent = event("game_ended", `${winner} win.`);
    next.publicEvents.push(endEvent);
    return { state: next, events: [voteEvent, endEvent] };
  }

  next.round += 1;
  next.phase = "night_werewolves";
  next.nightActions = { seerViews: next.nightActions.seerViews };
  const phaseEvent = event("phase_changed", "Night falls.");
  next.publicEvents.push(phaseEvent);
  return { state: next, events: [voteEvent, phaseEvent] };
}

function checkWinner(state: GameState) {
  const living = state.players.filter((player) => state.alive[player.id]);
  const livingWerewolves = living.filter((player) => state.roles[player.id] === "werewolf");
  const livingVillage = living.filter((player) => state.roles[player.id] !== "werewolf");

  if (livingWerewolves.length === 0) {
    return "village";
  }
  if (livingVillage.length === 0) {
    return "werewolves";
  }
  return undefined;
}

function legalWerewolfTargets(state: GameState): PlayerId[] {
  return state.players
    .filter((player) => state.alive[player.id] && state.roles[player.id] !== "werewolf")
    .map((player) => player.id);
}

function livingPlayersWithRole(state: GameState, role: Role): PlayerId[] {
  return state.players
    .filter((player) => state.alive[player.id] && state.roles[player.id] === role)
    .map((player) => player.id);
}

function firstLivingPlayer(state: GameState): PlayerId {
  const player = state.players.find((candidate) => state.alive[candidate.id]);
  if (!player) {
    throw new Error("No living players");
  }
  return player.id;
}

function assertPhase(state: GameState, phase: GameState["phase"]): void {
  if (state.phase !== phase) {
    throw new Error(`Expected phase ${phase}, got ${state.phase}`);
  }
}

function assertLivingRole(state: GameState, playerId: PlayerId, role: Role): void {
  assertLivingPlayer(state, playerId);
  if (state.roles[playerId] !== role) {
    throw new Error(`Player ${playerId} is not ${role}`);
  }
}

function assertLivingPlayer(state: GameState, playerId: PlayerId): void {
  if (!state.alive[playerId]) {
    throw new Error(`Player ${playerId} is not alive`);
  }
}

function cloneState(state: GameState): GameState {
  const privateEvents: GameState["privateEvents"] = {};
  for (const [playerId, events] of Object.entries(state.privateEvents)) {
    privateEvents[playerId] = [...events];
  }
  return {
    ...state,
    players: [...state.players],
    roles: { ...state.roles },
    alive: { ...state.alive },
    nightActions: {
      ...state.nightActions,
      seerViews: { ...state.nightActions.seerViews }
    },
    votes: { ...state.votes },
    publicEvents: [...state.publicEvents],
    privateEvents
  };
}
