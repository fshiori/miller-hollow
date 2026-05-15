import { describe, expect, it } from "vitest";
import { localizeEvent } from "../../src/web/copy";

describe("web copy localization", () => {
  it("localizes public timeline events", () => {
    expect(localizeEvent("The game has started.")).toBe("遊戲開始。");
    expect(localizeEvent("1 player(s) died during the night.")).toBe("今晚有 1 名玩家死亡。");
    expect(localizeEvent("No one died during the night.")).toBe("今晚無人死亡。");
    expect(localizeEvent("The village executed one player.")).toBe("村莊處決了一名玩家。");
    expect(localizeEvent("The vote did not execute anyone.")).toBe("這次投票沒有處決任何人。");
    expect(localizeEvent("werewolves win.")).toBe("狼人陣營獲勝。");
  });
});
