import { describe, expect, it } from "vitest";
import {
  applyCommand,
  buildTimeoutCommand,
  createCustomRoleflowPreset,
  createGame,
  recommendedSeerCount,
  recommendedWerewolfCount,
  toPrivatePlayerView,
  toPublicView,
  type GamePlayer,
  type GameState,
  type PlayerId,
  type RandomSource,
  type Role
} from "../../src/engine";
import { BASIC_PRESETS } from "../../src/engine";

const zeroRandom: RandomSource = {
  nextInt: () => 0
};

const identityRandom: RandomSource = {
  nextInt: (maxExclusive) => maxExclusive - 1
};

function players(count = 8): GamePlayer[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `p${index + 1}`,
    nickname: `Player ${index + 1}`
  }));
}

function gameWithRoles(roles: Record<PlayerId, Role>): GameState {
  const game = createGame(players(), zeroRandom);
  return { ...game, roles };
}

function fixedRoleGame(): GameState {
  return gameWithRoles({
    p1: "werewolf",
    p2: "werewolf",
    p3: "seer",
    p4: "witch",
    p5: "villager",
    p6: "villager",
    p7: "villager",
    p8: "villager"
  });
}

describe("Miller Hollow V1 engine", () => {
  it("assigns the exact role preset for every basic player count", () => {
    const expected = {
      official_basic_8: { werewolf: 2, seer: 1, villager: 5 },
      official_basic_9: { werewolf: 2, seer: 1, villager: 6 },
      official_basic_10: { werewolf: 2, seer: 1, villager: 7 },
      official_basic_11: { werewolf: 2, seer: 1, villager: 8 },
      official_basic_12: { werewolf: 3, seer: 1, villager: 8 },
      official_basic_13: { werewolf: 3, seer: 1, villager: 9 },
      official_basic_14: { werewolf: 3, seer: 1, villager: 10 },
      official_basic_15: { werewolf: 3, seer: 1, villager: 11 },
      official_basic_16: { werewolf: 3, seer: 1, villager: 12 },
      official_basic_17: { werewolf: 3, seer: 1, villager: 13 },
      official_basic_18: { werewolf: 4, seer: 1, villager: 13 },
      official_roleflow_8: { werewolf: 2, seer: 1, hunter: 1, villager: 4 },
      app_basic_8: { werewolf: 2, seer: 1, witch: 1, villager: 4 },
      app_basic_9: { werewolf: 2, seer: 1, witch: 1, villager: 5 },
      app_basic_10: { werewolf: 2, seer: 1, witch: 1, villager: 6 },
      app_basic_11: { werewolf: 3, seer: 1, witch: 1, villager: 6 },
      app_basic_12: { werewolf: 3, seer: 1, witch: 1, villager: 7 },
      basic_8: { werewolf: 2, seer: 1, witch: 1, villager: 4 },
      basic_9: { werewolf: 2, seer: 1, witch: 1, villager: 5 },
      basic_10: { werewolf: 2, seer: 1, witch: 1, villager: 6 },
      basic_11: { werewolf: 3, seer: 1, witch: 1, villager: 6 },
      basic_12: { werewolf: 3, seer: 1, witch: 1, villager: 7 }
    };

    for (const preset of BASIC_PRESETS) {
      const game = createGame(players(preset.playerCount), zeroRandom, preset);
      const counts = Object.values(game.roles).reduce<Record<string, number>>((acc, role) => {
        acc[role] = (acc[role] ?? 0) + 1;
        return acc;
      }, {});

      expect(counts).toEqual(expected[preset.id as keyof typeof expected]);
      expect(game.phase).toBe(preset.id === "official_roleflow_8" ? "night_seer" : "night_werewolves");
    }
  });

  it("rejects a player count that does not match the selected preset", () => {
    expect(() => createGame(players(8), zeroRandom, "basic_9")).toThrow("requires exactly 9 players");
  });

  it("assigns the exact V1 role preset by default", () => {
    const game = createGame(players(), zeroRandom);
    const counts = Object.values(game.roles).reduce<Record<string, number>>((acc, role) => {
      acc[role] = (acc[role] ?? 0) + 1;
      return acc;
    }, {});

    expect(counts).toEqual({
      werewolf: 2,
      seer: 1,
      witch: 1,
      villager: 4
    });
    expect(game.phase).toBe("night_werewolves");
  });

  it("validates V5.1 rulebook recommendations for custom roleflow setup", () => {
    expect(Array.from({ length: 4 }, (_, index) => recommendedWerewolfCount(index + 8))).toEqual([2, 2, 2, 2]);
    expect(Array.from({ length: 6 }, (_, index) => recommendedWerewolfCount(index + 12))).toEqual([3, 3, 3, 3, 3, 3]);
    expect(recommendedWerewolfCount(18)).toBe(4);
    expect(recommendedSeerCount(18)).toBe(1);

    expect(() =>
      createCustomRoleflowPreset({
        playerCount: 12,
        roles: { werewolf: 2, seer: 1, hunter: 1, villager: 8 },
        sheriffEnabled: true,
        nightOrder: "official",
        werewolfTimeoutNoKill: true
      })
    ).toThrow("Recommended Werewolf count");

    expect(() =>
      createCustomRoleflowPreset({
        playerCount: 8,
        roles: { werewolf: 2, seer: 0, hunter: 1, villager: 5 },
        sheriffEnabled: true,
        nightOrder: "official",
        werewolfTimeoutNoKill: true
      })
    ).toThrow("Recommended Seer count");
  });

  it("creates a V5.1 custom roleflow game from a locked pre-room setup", () => {
    const preset = createCustomRoleflowPreset({
      playerCount: 12,
      roles: { werewolf: 3, seer: 1, witch: 1, hunter: 1, villager: 6 },
      sheriffEnabled: true,
      nightOrder: "official",
      werewolfTimeoutNoKill: true
    });
    const game = createGame(players(12), zeroRandom, preset);
    const counts = Object.values(game.roles).reduce<Record<string, number>>((acc, role) => {
      acc[role] = (acc[role] ?? 0) + 1;
      return acc;
    }, {});

    expect(game.phase).toBe("night_seer");
    expect(game.rules.sheriffEnabled).toBe(true);
    expect(game.rules.werewolfTimeoutNoKill).toBe(true);
    expect(counts).toEqual({ werewolf: 3, seer: 1, witch: 1, hunter: 1, villager: 6 });
  });

  it("runs V5.2 Thief choice before the first night", () => {
    const preset = createCustomRoleflowPreset({
      playerCount: 8,
      roles: { werewolf: 2, seer: 1, thief: 1, hunter: 1, villager: 3 },
      sheriffEnabled: true,
      nightOrder: "official",
      werewolfTimeoutNoKill: true
    });
    let game = createGame(players(8), identityRandom, preset);
    const thief = game.players.find((player) => game.roles[player.id] === "thief")?.id as PlayerId;

    expect(game.phase).toBe("thief_choice");
    expect(toPrivatePlayerView(game, thief).legalActions).toContain("submit_thief_choice");
    expect(toPrivatePlayerView(game, thief).legalRoleChoices).toEqual(["villager"]);
    expect(game.thief?.spareRoles).toEqual(["villager", "villager"]);
    expect(toPublicView(game).players.every((player) => player.role === undefined)).toBe(true);

    game = applyCommand(game, { type: "submit_thief_choice", actorId: thief, role: "villager" }).state;
    expect(game.roles[thief]).toBe("villager");
    expect(game.thief?.chosenRole).toBe("villager");
    expect(game.phase).toBe("night_seer");
  });

  it("forces Thief to choose Werewolf when both spare cards are Werewolves", () => {
    const game = createGame(players(), zeroRandom);
    const thiefState: GameState = {
      ...game,
      phase: "thief_choice",
      roles: { ...game.roles, p1: "thief" },
      thief: { playerId: "p1", spareRoles: ["werewolf", "werewolf"] }
    };

    expect(toPrivatePlayerView(thiefState, "p1").legalRoleChoices).toEqual(["werewolf"]);
    expect(() => applyCommand(thiefState, { type: "submit_thief_choice", actorId: "p1", role: "villager" })).toThrow("Invalid Thief role choice");
    const resolved = applyCommand(thiefState, { type: "submit_thief_choice", actorId: "p1", role: "werewolf" }).state;
    expect(resolved.roles.p1).toBe("werewolf");
  });

  it("runs V5.3 Cupid choice before the first night and reveals Lovers privately", () => {
    const preset = createCustomRoleflowPreset({
      playerCount: 8,
      roles: { werewolf: 2, seer: 1, cupid: 1, villager: 4 },
      sheriffEnabled: true,
      nightOrder: "official",
      werewolfTimeoutNoKill: true
    });
    let game = createGame(players(8), zeroRandom, preset);
    const cupid = game.players.find((player) => game.roles[player.id] === "cupid")?.id as PlayerId;

    expect(game.phase).toBe("night_cupid");
    expect(toPrivatePlayerView(game, cupid).legalActions).toContain("submit_cupid_lovers");
    expect(toPrivatePlayerView(game, cupid).legalTargets).toHaveLength(8);
    expect(toPublicView(game).phaseStatus).toEqual({ label: "Waiting for cupid", submittedCount: 0, requiredCount: 1 });
    expect(toPublicView(game).players.every((player) => player.role === undefined)).toBe(true);

    game = applyCommand(game, { type: "submit_cupid_lovers", actorId: cupid, targetIds: ["p1", "p3"] }).state;

    expect(game.lovers?.playerIds).toEqual(["p1", "p3"]);
    expect(game.phase).toBe("night_seer");
    expect(toPrivatePlayerView(game, "p1").loverPartnerId).toBe("p3");
    expect(toPrivatePlayerView(game, "p3").loverPartnerId).toBe("p1");
    expect(toPrivatePlayerView(game, "p2").loverPartnerId).toBeUndefined();
  });

  it("applies V5.3 Lover heartbreak when one Lover dies", () => {
    let game = fixedRoleGame();
    game.lovers = { playerIds: ["p1", "p5"], chosenBy: "p8" };

    game = applyCommand(game, { type: "submit_werewolf_target", actorId: "p2", targetId: "p5" }).state;
    game = applyCommand(game, { type: "submit_seer_target", actorId: "p3", targetId: "p2" }).state;
    game = applyCommand(game, { type: "submit_witch_action", actorId: "p4" }).state;

    expect(game.alive.p5).toBe(false);
    expect(game.alive.p1).toBe(false);
    expect(game.publicEvents.map((entry) => entry.message)).toContain("A Lover died of heartbreak.");
  });

  it("detects V5.3 Lovers victory for a cross-team final pair", () => {
    let game = fixedRoleGame();
    game.phase = "day_vote";
    game.lovers = { playerIds: ["p1", "p5"], chosenBy: "p8" };
    game.alive = {
      p1: true,
      p2: false,
      p3: false,
      p4: false,
      p5: true,
      p6: false,
      p7: false,
      p8: false
    };

    game = applyCommand(game, { type: "resolve_vote", missingVotesAsAbstain: true }).state;

    expect(game.phase).toBe("ended");
    expect(game.winner).toBe("lovers");
    expect(toPublicView(game).endgameReveal?.winner).toBe("lovers");
  });

  it("keeps hidden roles private for larger official presets before endgame", () => {
    const game = createGame(players(18), zeroRandom, "official_basic_18");
    const publicView = toPublicView(game);
    const privateViews = game.players.map((player) => toPrivatePlayerView(game, player.id));

    expect(publicView.players).toHaveLength(18);
    expect(publicView.players.every((player) => player.role === undefined)).toBe(true);
    expect(publicView.endgameReveal).toBeUndefined();
    expect(privateViews.filter((view) => view.role === "werewolf")).toHaveLength(4);
    expect(privateViews.find((view) => view.role === "werewolf")?.werewolfTeammates).toHaveLength(3);
  });

  it("skips the Witch phase for official beginner presets", () => {
    let game = createGame(players(8), zeroRandom, "official_basic_8");
    const wolf = game.players.find((player) => game.roles[player.id] === "werewolf")?.id as PlayerId;
    const seer = game.players.find((player) => game.roles[player.id] === "seer")?.id as PlayerId;
    const target = game.players.find((player) => game.roles[player.id] === "villager")?.id as PlayerId;

    game = applyCommand(game, { type: "submit_werewolf_target", actorId: wolf, targetId: target }).state;
    expect(game.phase).toBe("night_seer");
    game = applyCommand(game, { type: "submit_seer_target", actorId: seer, targetId: wolf }).state;
    expect(game.phase).toBe("day_discussion");
    expect(game.alive[target]).toBe(false);
  });

  it("filters hidden roles from public view before the game ends", () => {
    const game = fixedRoleGame();
    expect(toPublicView(game).players.every((player) => player.role === undefined)).toBe(true);
    expect(toPublicView(game).endgameReveal).toBeUndefined();
    expect(toPrivatePlayerView(game, "p3").role).toBe("seer");
  });

  it("reports private action state without exposing hidden role identity publicly", () => {
    let game = fixedRoleGame();
    const wolfView = toPrivatePlayerView(game, "p1");
    const villagerView = toPrivatePlayerView(game, "p5");

    expect(wolfView.actionState).toMatchObject({
      required: true,
      submitted: false,
      label: "Choose a victim"
    });
    expect(villagerView.actionState.required).toBe(false);
    expect(toPublicView(game).phaseStatus).toEqual({
      label: "Waiting for werewolves",
      submittedCount: 0,
      requiredCount: 1
    });

    game = applyCommand(game, { type: "submit_werewolf_target", actorId: "p1", targetId: "p5" }).state;
    expect(toPublicView(game).players.find((player) => player.id === "p1")?.role).toBeUndefined();
  });

  it("shows werewolf teammates privately", () => {
    const game = fixedRoleGame();
    expect(toPrivatePlayerView(game, "p1").werewolfTeammates).toEqual(["p2"]);
    expect(toPrivatePlayerView(game, "p5").werewolfTeammates).toEqual([]);
  });

  it("resolves a werewolf kill unless the Witch saves the target", () => {
    let game = fixedRoleGame();
    game = applyCommand(game, { type: "submit_werewolf_target", actorId: "p1", targetId: "p5" }).state;
    game = applyCommand(game, { type: "submit_seer_target", actorId: "p3", targetId: "p1" }).state;
    game = applyCommand(game, { type: "submit_witch_action", actorId: "p4", saveTargetId: "p5" }).state;

    expect(game.alive.p5).toBe(true);
    expect(game.witchSaveAvailable).toBe(false);
    expect(game.phase).toBe("day_discussion");
  });

  it("lets Witch poison kill a selected living player once", () => {
    let game = fixedRoleGame();
    game = applyCommand(game, { type: "submit_werewolf_target", actorId: "p1", targetId: "p5" }).state;
    game = applyCommand(game, { type: "submit_seer_target", actorId: "p3" }).state;
    game = applyCommand(game, {
      type: "submit_witch_action",
      actorId: "p4",
      saveTargetId: "p5",
      poisonTargetId: "p2"
    }).state;

    expect(game.alive.p5).toBe(true);
    expect(game.alive.p2).toBe(false);
    expect(game.witchPoisonAvailable).toBe(false);
  });

  it("records Seer vision only in private Seer state", () => {
    let game = fixedRoleGame();
    game = applyCommand(game, { type: "submit_werewolf_target", actorId: "p1", targetId: "p5" }).state;
    game = applyCommand(game, { type: "submit_seer_target", actorId: "p3", targetId: "p1" }).state;

    expect(toPrivatePlayerView(game, "p3").seerResults).toEqual({ p1: "werewolf" });
    expect(toPrivatePlayerView(game, "p5").seerResults).toEqual({});
    expect(toPublicView(game).players.find((player) => player.id === "p1")?.role).toBeUndefined();
  });

  it("resolves day votes and treats missing timeout votes as abstentions", () => {
    let game = fixedRoleGame();
    game.phase = "day_discussion";
    game = applyCommand(game, { type: "advance_to_vote" }).state;
    game = applyCommand(game, { type: "submit_vote", actorId: "p1", targetId: "p2" }).state;
    game = applyCommand(game, { type: "submit_vote", actorId: "p3", targetId: "p2" }).state;
    game = applyCommand(game, { type: "resolve_vote", missingVotesAsAbstain: true }).state;

    expect(game.alive.p2).toBe(false);
    expect(game.votes.p4).toBe("abstain");
    expect(game.publicVoteResults).toHaveLength(1);
    expect(game.publicVoteResults[0]).toMatchObject({
      round: 1,
      executedPlayerId: "p2",
      tied: false,
      tally: { p2: 2, abstain: 6 }
    });
    expect(game.publicVoteResults[0]?.votes).toEqual([
      { voterId: "p1", targetId: "p2", weight: 1 },
      { voterId: "p2", targetId: "abstain", weight: 1 },
      { voterId: "p3", targetId: "p2", weight: 1 },
      { voterId: "p4", targetId: "abstain", weight: 1 },
      { voterId: "p5", targetId: "abstain", weight: 1 },
      { voterId: "p6", targetId: "abstain", weight: 1 },
      { voterId: "p7", targetId: "abstain", weight: 1 },
      { voterId: "p8", targetId: "abstain", weight: 1 }
    ]);
    expect(toPublicView(game).voteResults).toEqual(game.publicVoteResults);
    expect(game.phase).toBe("night_werewolves");
  });

  it("does not execute anyone on tied day votes", () => {
    let game = fixedRoleGame();
    game.phase = "day_discussion";
    game = applyCommand(game, { type: "advance_to_vote" }).state;
    game = applyCommand(game, { type: "submit_vote", actorId: "p1", targetId: "p3" }).state;
    game = applyCommand(game, { type: "submit_vote", actorId: "p2", targetId: "p4" }).state;
    game = applyCommand(game, { type: "resolve_vote", missingVotesAsAbstain: true }).state;

    expect(game.alive.p3).toBe(true);
    expect(game.alive.p4).toBe(true);
    expect(game.publicVoteResults[0]).toMatchObject({
      round: 1,
      tied: true,
      tally: { p3: 1, p4: 1, abstain: 6 }
    });
    expect(game.publicVoteResults[0]?.executedPlayerId).toBeUndefined();
    expect(game.phase).toBe("night_werewolves");
  });

  it("rejects Witch self-poison in V1", () => {
    let game = fixedRoleGame();
    game = applyCommand(game, { type: "submit_werewolf_target", actorId: "p1", targetId: "p5" }).state;
    game = applyCommand(game, { type: "submit_seer_target", actorId: "p3" }).state;

    expect(() =>
      applyCommand(game, {
        type: "submit_witch_action",
        actorId: "p4",
        poisonTargetId: "p4"
      })
    ).toThrow("Witch cannot poison themselves");
  });

  it("detects Village victory when all Werewolves are eliminated", () => {
    let game = fixedRoleGame();
    game.alive.p1 = false;
    game.phase = "day_discussion";
    game = applyCommand(game, { type: "advance_to_vote" }).state;
    game = applyCommand(game, { type: "submit_vote", actorId: "p3", targetId: "p2" }).state;
    game = applyCommand(game, { type: "submit_vote", actorId: "p4", targetId: "p2" }).state;
    game = applyCommand(game, { type: "resolve_vote", missingVotesAsAbstain: true }).state;

    expect(game.phase).toBe("ended");
    expect(game.winner).toBe("village");
    const publicView = toPublicView(game);
    expect(publicView.players.find((player) => player.id === "p1")?.role).toBe("werewolf");
    expect(publicView.endgameReveal?.winner).toBe("village");
    expect(publicView.endgameReveal?.players.every((player) => player.role)).toBe(true);
  });

  it("detects Werewolf victory when no non-Werewolves remain", () => {
    let game = fixedRoleGame();
    game.alive = {
      p1: true,
      p2: true,
      p3: false,
      p4: false,
      p5: true,
      p6: false,
      p7: false,
      p8: false
    };
    game = applyCommand(game, { type: "submit_werewolf_target", actorId: "p1", targetId: "p5" }).state;
    game = applyCommand(game, { type: "submit_seer_target", actorId: "p3" }).state;
    game = applyCommand(game, { type: "submit_witch_action", actorId: "p4" }).state;

    expect(game.phase).toBe("ended");
    expect(game.winner).toBe("werewolves");
  });

  it("builds deterministic timeout fallback commands", () => {
    const game = fixedRoleGame();
    expect(buildTimeoutCommand(game, zeroRandom)).toEqual({
      type: "submit_werewolf_target",
      actorId: "p1",
      targetId: "p3",
      source: "timeout"
    });
  });

  it("uses official roleflow night order and no-kill Werewolf timeout", () => {
    let game = createGame(players(8), zeroRandom, "official_roleflow_8");
    const seer = game.players.find((player) => game.roles[player.id] === "seer")?.id as PlayerId;
    const wolf = game.players.find((player) => game.roles[player.id] === "werewolf")?.id as PlayerId;
    expect(game.phase).toBe("night_seer");
    game = applyCommand(game, { type: "submit_seer_target", actorId: seer, targetId: wolf }).state;
    expect(game.phase).toBe("night_werewolves");
    expect(buildTimeoutCommand(game, zeroRandom)).toEqual({ type: "skip_werewolf_target", actorId: wolf });
    game = applyCommand(game, { type: "skip_werewolf_target", actorId: wolf }).state;
    expect(game.phase).toBe("day_discussion");
    expect(Object.values(game.alive).every(Boolean)).toBe(true);
  });

  it("opens Sheriff election during day discussion and applies weighted day votes", () => {
    let game = createGame(players(8), zeroRandom, "official_roleflow_8");
    game.phase = "day_discussion";
    game = applyCommand(game, { type: "open_sheriff_election", actorId: "p1" }).state;
    expect(game.phase).toBe("sheriff_election");
    game = applyCommand(game, { type: "submit_sheriff_vote", actorId: "p1", targetId: "p1" }).state;
    game = applyCommand(game, { type: "submit_sheriff_vote", actorId: "p2", targetId: "p1" }).state;
    game = applyCommand(game, { type: "resolve_sheriff_election", missingVotesAsAbstain: true }).state;
    expect(game.phase).toBe("day_discussion");
    expect(game.sheriff.holderId).toBe("p1");
    expect(toPublicView(game).sheriff.holderId).toBe("p1");

    game = applyCommand(game, { type: "advance_to_vote" }).state;
    game = applyCommand(game, { type: "submit_vote", actorId: "p1", targetId: "p2" }).state;
    game = applyCommand(game, { type: "submit_vote", actorId: "p3", targetId: "p2" }).state;
    game = applyCommand(game, { type: "resolve_vote", missingVotesAsAbstain: true }).state;
    expect(game.publicVoteResults[0]).toMatchObject({ executedPlayerId: "p2", tally: { p2: 3, abstain: 6 } });
    expect(game.publicVoteResults[0]?.votes.find((vote) => vote.voterId === "p1")?.weight).toBe(2);
  });

  it("runs Hunter revenge before resuming after day execution", () => {
    let game = createGame(players(8), zeroRandom, "official_roleflow_8");
    const hunter = game.players.find((player) => game.roles[player.id] === "hunter")?.id as PlayerId;
    const wolf = game.players.find((player) => game.roles[player.id] === "werewolf")?.id as PlayerId;
    game.phase = "day_discussion";
    game = applyCommand(game, { type: "advance_to_vote" }).state;
    game = applyCommand(game, { type: "submit_vote", actorId: "p1", targetId: hunter }).state;
    game = applyCommand(game, { type: "submit_vote", actorId: "p2", targetId: hunter }).state;
    game = applyCommand(game, { type: "resolve_vote", missingVotesAsAbstain: true }).state;
    expect(game.phase).toBe("hunter_revenge");
    expect(game.alive[hunter]).toBe(false);
    expect(toPrivatePlayerView(game, hunter).legalActions).toContain("submit_hunter_shot");

    game = applyCommand(game, { type: "submit_hunter_shot", actorId: hunter, targetId: wolf }).state;
    expect(game.alive[wolf]).toBe(false);
    expect(game.phase).toBe("night_seer");
  });
});
