import { describe, expect, it } from "vitest";
import {
  applyCommand,
  buildTimeoutCommand,
  createGame,
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
      const game = createGame(players(preset.playerCount), zeroRandom, preset.id);
      const counts = Object.values(game.roles).reduce<Record<string, number>>((acc, role) => {
        acc[role] = (acc[role] ?? 0) + 1;
        return acc;
      }, {});

      expect(counts).toEqual(expected[preset.id as keyof typeof expected]);
      expect(game.phase).toBe("night_werewolves");
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
      targetId: "p3"
    });
  });
});
