import type { GameCommand } from "./commands";
import { getBasicPreset, v1Preset, type BasicPresetId, type RolePreset } from "./presets";
import type { RandomSource } from "./random";
import { shuffleWithRandom } from "./random";
import { teamForRole } from "./roles";
import type { Role } from "./roles";
import type { GameEvent, GamePlayer, GameState, PendingReaction, PlayerId, PublicVoteResult, ReducerResult, ResumeState } from "./state";

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

export function createGame(players: GamePlayer[], random: RandomSource, presetInput: RolePreset | BasicPresetId = v1Preset): GameState {
  const preset = typeof presetInput === "string" ? getBasicPreset(presetInput) : presetInput;
  if (players.length !== preset.playerCount) {
    throw new Error(`${preset.label} requires exactly ${preset.playerCount} players`);
  }

  const roles = shuffleWithRandom<Role>(preset.roles, random);
  const assignedRoles: Record<PlayerId, Role> = {};
  const alive: Record<PlayerId, boolean> = {};
  const privateEvents: Record<PlayerId, GameEvent[]> = {};

  players.forEach((player, index) => {
    assignedRoles[player.id] = roles[index] as Role;
    alive[player.id] = true;
    privateEvents[player.id] = [];
  });

  const thiefPlayerId = players.find((player) => assignedRoles[player.id] === "thief")?.id;
  const startEvent = event("game_started", "The game has started.");

  return {
    phase: thiefPlayerId ? "thief_choice" : preset.nightOrder === "official" ? "night_seer" : "night_werewolves",
    round: 1,
    players,
    roles: assignedRoles,
    alive,
    nightActions: { seerViews: {} },
    votes: {},
    publicVoteResults: [],
    ...(thiefPlayerId ? { thief: { playerId: thiefPlayerId, spareRoles: [...preset.spareRoles] } } : {}),
    sheriff: { electionVotes: {}, electionCount: 0 },
    pendingReactions: [],
    rules: {
      nightOrder: preset.nightOrder,
      werewolfTimeoutNoKill: preset.werewolfTimeoutNoKill,
      sheriffEnabled: preset.sheriffEnabled
    },
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
    case "submit_thief_choice":
      return submitThiefChoice(state, command.actorId, command.role);
    case "submit_werewolf_target":
      return submitWerewolfTarget(state, command.actorId, command.targetId, command.source ?? "direct");
    case "skip_werewolf_target":
      return skipWerewolfTarget(state, command.actorId);
    case "submit_seer_target":
      return submitSeerTarget(state, command.actorId, command.targetId);
    case "submit_witch_action":
      return submitWitchAction(state, command.actorId, command.saveTargetId, command.poisonTargetId);
    case "open_sheriff_election":
      return openSheriffElection(state, command.actorId);
    case "submit_sheriff_vote":
      return submitSheriffVote(state, command.actorId, command.targetId);
    case "resolve_sheriff_election":
      return resolveSheriffElection(state, command.missingVotesAsAbstain);
    case "advance_to_vote":
      return advanceToVote(state);
    case "submit_vote":
      return submitVote(state, command.actorId, command.targetId);
    case "resolve_vote":
      return resolveVote(state, command.missingVotesAsAbstain);
    case "submit_hunter_shot":
      return submitHunterShot(state, command.actorId, command.targetId);
    case "submit_sheriff_successor":
      return submitSheriffSuccessor(state, command.actorId, command.targetId);
  }
}

export function buildTimeoutCommand(state: GameState, random: RandomSource): GameCommand {
  if (state.phase === "thief_choice") {
    const thief = state.thief;
    if (!thief?.playerId || thief.spareRoles.length === 0) {
      throw new Error("No pending Thief choice");
    }
    return { type: "submit_thief_choice", actorId: thief.playerId, role: thief.spareRoles[random.nextInt(thief.spareRoles.length)] as Role };
  }

  if (state.phase === "night_werewolves") {
    const werewolf = livingPlayersWithRole(state, "werewolf")[0];
    const targets = legalWerewolfTargets(state);
    if (!werewolf || targets.length === 0) {
      throw new Error("No legal werewolf timeout command is available");
    }
    if (state.rules.werewolfTimeoutNoKill) {
      return { type: "skip_werewolf_target", actorId: werewolf };
    }
    return {
      type: "submit_werewolf_target",
      actorId: werewolf,
      targetId: targets[random.nextInt(targets.length)] as PlayerId,
      source: "timeout"
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

  if (state.phase === "sheriff_election") {
    return { type: "resolve_sheriff_election", missingVotesAsAbstain: true };
  }

  if (state.phase === "hunter_revenge") {
    const reaction = state.pendingReactions[0];
    if (reaction?.type !== "hunter_revenge") {
      throw new Error("No pending Hunter reaction");
    }
    return { type: "submit_hunter_shot", actorId: reaction.hunterId };
  }

  if (state.phase === "sheriff_succession") {
    const reaction = state.pendingReactions[0];
    if (reaction?.type !== "sheriff_succession") {
      throw new Error("No pending Sheriff succession");
    }
    return { type: "submit_sheriff_successor", actorId: reaction.fromId };
  }

  throw new Error(`No timeout command for phase ${state.phase}`);
}

function submitThiefChoice(state: GameState, actorId: PlayerId, role: Role): ReducerResult {
  assertPhase(state, "thief_choice");
  const thief = state.thief;
  if (!thief?.playerId || thief.playerId !== actorId) {
    throw new Error("No pending Thief choice for this player");
  }
  if (state.roles[actorId] !== "thief") {
    throw new Error(`Player ${actorId} is not thief`);
  }
  if (!thief.spareRoles.includes(role)) {
    throw new Error("Invalid Thief role choice");
  }
  const next = cloneState(state);
  next.roles[actorId] = role;
  next.thief = {
    ...thief,
    chosenRole: role
  };
  next.phase = firstNightPhase(next);
  const choiceEvent = event("phase_changed", "The Thief chose a role.");
  const phaseEvent = event("phase_changed", phaseMessage(next.phase));
  next.publicEvents.push(choiceEvent, phaseEvent);
  return { state: next, events: [choiceEvent, phaseEvent] };
}

function submitWerewolfTarget(
  state: GameState,
  actorId: PlayerId,
  targetId: PlayerId,
  source: "direct" | "proposal" | "timeout"
): ReducerResult {
  assertPhase(state, "night_werewolves");
  assertLivingRole(state, actorId, "werewolf");
  if (!legalWerewolfTargets(state).includes(targetId)) {
    throw new Error("Invalid werewolf target");
  }

  const next = cloneState(state);
  next.nightActions.werewolfTarget = targetId;
  next.nightActions.werewolfTargetSource = source;
  if (next.rules.nightOrder === "official") {
    if (livingPlayersWithRole(next, "witch")[0]) {
      next.phase = "night_witch";
      const phaseEvent = event("phase_changed", "The Witch wakes.");
      next.publicEvents.push(phaseEvent);
      return { state: next, events: [phaseEvent] };
    }
    const resolved = resolveNightDeaths(next, undefined, undefined);
    return { state: resolved.state, events: resolved.events };
  }
  next.phase = "night_seer";
  const phaseEvent = event("phase_changed", "The Seer wakes.");
  next.publicEvents.push(phaseEvent);
  return { state: next, events: [phaseEvent] };
}

function skipWerewolfTarget(state: GameState, actorId: PlayerId): ReducerResult {
  assertPhase(state, "night_werewolves");
  assertLivingRole(state, actorId, "werewolf");
  if (!state.rules.werewolfTimeoutNoKill) {
    throw new Error("Werewolves must choose a target");
  }
  const next = cloneState(state);
  next.nightActions.werewolfTargetSource = "timeout";
  if (livingPlayersWithRole(next, "witch")[0]) {
    next.phase = "night_witch";
    const phaseEvent = event("phase_changed", "The Witch wakes.");
    next.publicEvents.push(phaseEvent);
    return { state: next, events: [phaseEvent] };
  }
  const resolved = resolveNightDeaths(next, undefined, undefined);
  return { state: resolved.state, events: resolved.events };
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
  next.nightActions.seerSkipped = !targetId;
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
  if (next.rules.nightOrder === "official") {
    next.phase = "night_werewolves";
    const phaseEvent = event("phase_changed", "The Werewolves wake.");
    next.publicEvents.push(phaseEvent);
    events.push(phaseEvent);
    return { state: next, events };
  }
  if (livingPlayersWithRole(next, "witch")[0]) {
    next.phase = "night_witch";
    const phaseEvent = event("phase_changed", "The Witch wakes.");
    next.publicEvents.push(phaseEvent);
    events.push(phaseEvent);
    return { state: next, events };
  }

  const resolved = resolveNightDeaths(next, undefined, undefined);
  return { state: resolved.state, events: [...events, ...resolved.events] };
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

  return resolveNightDeaths(state, saveTargetId, poisonTargetId);
}

function resolveNightDeaths(
  state: GameState,
  saveTargetId: PlayerId | undefined,
  poisonTargetId: PlayerId | undefined
): ReducerResult {
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

  return finalizeDeaths(next, deaths, { phase: "day_discussion" }, [deathEvent]);
}

function openSheriffElection(state: GameState, actorId: PlayerId): ReducerResult {
  assertPhase(state, "day_discussion");
  if (!state.rules.sheriffEnabled) {
    throw new Error("Sheriff election is not enabled for this preset");
  }
  assertKnownPlayer(state, actorId);
  if (state.sheriff.holderId) {
    throw new Error("Sheriff has already been elected");
  }
  const next = cloneState(state);
  next.phase = "sheriff_election";
  next.sheriff.electionVotes = {};
  const phaseEvent = event("phase_changed", "Sheriff election begins.");
  next.publicEvents.push(phaseEvent);
  return { state: next, events: [phaseEvent] };
}

function submitSheriffVote(state: GameState, actorId: PlayerId, targetId: PlayerId | "abstain"): ReducerResult {
  assertPhase(state, "sheriff_election");
  assertLivingPlayer(state, actorId);
  if (targetId !== "abstain") {
    assertLivingPlayer(state, targetId);
  }
  const next = cloneState(state);
  next.sheriff.electionVotes[actorId] = targetId;
  return { state: next, events: [] };
}

function resolveSheriffElection(state: GameState, missingVotesAsAbstain: boolean): ReducerResult {
  assertPhase(state, "sheriff_election");
  const next = cloneState(state);
  if (missingVotesAsAbstain) {
    for (const player of state.players) {
      if (state.alive[player.id] && !next.sheriff.electionVotes[player.id]) {
        next.sheriff.electionVotes[player.id] = "abstain";
      }
    }
  }

  const counts = new Map<PlayerId, number>();
  for (const vote of Object.values(next.sheriff.electionVotes)) {
    if (vote !== "abstain") {
      counts.set(vote, (counts.get(vote) ?? 0) + 1);
    }
  }
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const top = sorted[0];
  const tied = top ? sorted.filter(([, count]) => count === top[1]).length > 1 : false;
  if (top && !tied) {
    next.sheriff.holderId = top[0];
  }
  next.sheriff.electionCount += 1;
  next.phase = "day_discussion";
  const resultEvent = event(
    "phase_changed",
    next.sheriff.holderId ? "The village elected a Sheriff." : "The Sheriff election did not elect anyone."
  );
  next.publicEvents.push(resultEvent);
  return { state: next, events: [resultEvent] };
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
  for (const [voterId, vote] of Object.entries(next.votes)) {
    if (vote !== "abstain") {
      counts.set(vote, (counts.get(vote) ?? 0) + voteWeight(next, voterId));
    }
  }

  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const top = sorted[0];
  const tied = top ? sorted.filter(([, count]) => count === top[1]).length > 1 : false;
  const killed = top && !tied ? top[0] : undefined;
  const deaths = new Set<PlayerId>();
  if (killed) {
    next.alive[killed] = false;
    deaths.add(killed);
  }
  const voteResult = buildPublicVoteResult(next, tied, killed);
  next.publicVoteResults = [...(next.publicVoteResults ?? []), voteResult];

  const voteEvent = event(
    "day_vote_resolved",
    killed ? "The village executed one player." : "The vote did not execute anyone."
  );
  next.publicEvents.push(voteEvent);

  return finalizeDeaths(
    next,
    deaths,
    { phase: firstNightPhase(next), incrementRound: true, resetNightActions: true },
    [voteEvent]
  );
}

function submitHunterShot(state: GameState, actorId: PlayerId, targetId: PlayerId | undefined): ReducerResult {
  assertPhase(state, "hunter_revenge");
  const reaction = state.pendingReactions[0];
  if (reaction?.type !== "hunter_revenge" || reaction.hunterId !== actorId) {
    throw new Error("No pending Hunter shot for this player");
  }
  if (state.roles[actorId] !== "hunter") {
    throw new Error(`Player ${actorId} is not hunter`);
  }
  if (state.alive[actorId]) {
    throw new Error("Hunter can only shoot after death");
  }

  const next = cloneState(state);
  next.pendingReactions = next.pendingReactions.slice(1);
  const deaths = new Set<PlayerId>();
  const events: GameEvent[] = [];
  if (targetId) {
    if (targetId === actorId) {
      throw new Error("Hunter cannot shoot themselves");
    }
    assertLivingPlayer(state, targetId);
    next.alive[targetId] = false;
    deaths.add(targetId);
    const shotEvent = event("phase_changed", "The Hunter shot one player.");
    next.publicEvents.push(shotEvent);
    events.push(shotEvent);
  } else {
    const skipEvent = event("phase_changed", "The Hunter did not shoot.");
    next.publicEvents.push(skipEvent);
    events.push(skipEvent);
  }
  return finalizeDeaths(next, deaths, reaction.resume, events);
}

function submitSheriffSuccessor(state: GameState, actorId: PlayerId, targetId: PlayerId | undefined): ReducerResult {
  assertPhase(state, "sheriff_succession");
  const reaction = state.pendingReactions[0];
  if (reaction?.type !== "sheriff_succession" || reaction.fromId !== actorId) {
    throw new Error("No pending Sheriff succession for this player");
  }
  if (state.alive[actorId]) {
    throw new Error("Sheriff succession is only available after death");
  }
  if (targetId) {
    assertLivingPlayer(state, targetId);
  }

  const next = cloneState(state);
  next.pendingReactions = next.pendingReactions.slice(1);
  if (targetId) {
    next.sheriff.holderId = targetId;
  } else {
    delete next.sheriff.holderId;
  }
  delete next.sheriff.successionFromId;
  const successorEvent = event("phase_changed", targetId ? "The Sheriff named a successor." : "The Sheriff did not name a successor.");
  next.publicEvents.push(successorEvent);
  return advanceReactionOrResume(next, reaction.resume, [successorEvent]);
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

function finalizeDeaths(state: GameState, deaths: Set<PlayerId>, resume: ResumeState, events: GameEvent[]): ReducerResult {
  const winner = checkWinner(state);
  if (winner) {
    state.winner = winner;
    state.phase = "ended";
    const endEvent = event("game_ended", `${winner} win.`);
    state.publicEvents.push(endEvent);
    return { state, events: [...events, endEvent] };
  }

  queueDeathReactions(state, deaths, resume);
  return advanceReactionOrResume(state, resume, events);
}

function queueDeathReactions(state: GameState, deaths: Set<PlayerId>, resume: ResumeState): void {
  const additions: PendingReaction[] = [];
  for (const playerId of deaths) {
    if (state.roles[playerId] === "hunter") {
      additions.push({ type: "hunter_revenge", hunterId: playerId, resume });
    }
  }
  if (state.sheriff.holderId && deaths.has(state.sheriff.holderId) && livingSuccessorTargets(state, state.sheriff.holderId).length > 0) {
    additions.push({ type: "sheriff_succession", fromId: state.sheriff.holderId, resume });
    state.sheriff.successionFromId = state.sheriff.holderId;
  }
  state.pendingReactions = [...state.pendingReactions, ...additions];
}

function advanceReactionOrResume(state: GameState, resume: ResumeState, events: GameEvent[]): ReducerResult {
  const reaction = state.pendingReactions[0];
  if (reaction) {
    state.resumeAfterReactions = reaction.resume;
    state.phase = reaction.type;
    const phaseEvent = event("phase_changed", reaction.type === "hunter_revenge" ? "The Hunter takes revenge." : "Sheriff succession begins.");
    state.publicEvents.push(phaseEvent);
    return { state, events: [...events, phaseEvent] };
  }

  delete state.resumeAfterReactions;
  if (resume.incrementRound) {
    state.round += 1;
  }
  if (resume.resetNightActions) {
    state.nightActions = { seerViews: state.nightActions.seerViews };
  }
  state.phase = resume.phase;
  const phaseEvent = event("phase_changed", phaseMessage(resume.phase));
  state.publicEvents.push(phaseEvent);
  return { state, events: [...events, phaseEvent] };
}

function phaseMessage(phase: GameState["phase"]): string {
  if (phase === "day_discussion") return "Day discussion begins.";
  if (phase === "thief_choice") return "The Thief chooses a role.";
  if (phase === "night_seer") return "Night falls. The Seer wakes.";
  if (phase === "night_werewolves") return "Night falls.";
  if (phase === "day_vote") return "Voting begins.";
  if (phase === "sheriff_election") return "Sheriff election begins.";
  if (phase === "hunter_revenge") return "The Hunter takes revenge.";
  if (phase === "sheriff_succession") return "Sheriff succession begins.";
  return "Game over.";
}

function firstNightPhase(state: GameState): GameState["phase"] {
  return state.rules.nightOrder === "official" ? "night_seer" : "night_werewolves";
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

function assertKnownPlayer(state: GameState, playerId: PlayerId): void {
  if (!state.players.some((player) => player.id === playerId)) {
    throw new Error("Unknown player");
  }
}

function livingSuccessorTargets(state: GameState, fromId: PlayerId): PlayerId[] {
  return state.players.filter((player) => player.id !== fromId && state.alive[player.id]).map((player) => player.id);
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
    publicVoteResults: [...(state.publicVoteResults ?? [])],
    ...(state.thief ? { thief: { ...state.thief, spareRoles: [...state.thief.spareRoles] } } : {}),
    sheriff: {
      ...state.sheriff,
      electionVotes: { ...(state.sheriff?.electionVotes ?? {}) }
    },
    pendingReactions: [...(state.pendingReactions ?? [])],
    ...(state.resumeAfterReactions ? { resumeAfterReactions: { ...state.resumeAfterReactions } } : {}),
    rules: { ...state.rules },
    publicEvents: [...state.publicEvents],
    privateEvents
  };
}

function buildPublicVoteResult(state: GameState, tied: boolean, executedPlayerId: PlayerId | undefined): PublicVoteResult {
  const votes = state.players
    .filter((player) => state.votes[player.id])
    .map((player) => ({
      voterId: player.id,
      targetId: state.votes[player.id] as PlayerId | "abstain",
      weight: voteWeight(state, player.id)
    }));
  const tally = votes.reduce<Record<string, number>>((counts, vote) => {
    counts[vote.targetId] = (counts[vote.targetId] ?? 0) + vote.weight;
    return counts;
  }, {});
  return {
    id: `vote-${state.round}-${state.publicVoteResults?.length ?? 0}`,
    round: state.round,
    votes,
    tally,
    ...(executedPlayerId ? { executedPlayerId } : {}),
    tied,
    createdAt: Date.now()
  };
}

function voteWeight(state: GameState, voterId: PlayerId): number {
  return state.sheriff.holderId === voterId ? 2 : 1;
}
