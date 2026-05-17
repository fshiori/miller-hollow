import { describe, expect, it } from "vitest";
import { labelActionState, labelRole, localizeError, localizeEvent } from "../../src/web/copy";

describe("web copy localization", () => {
  it("localizes public timeline events", () => {
    expect(localizeEvent("The game has started.")).toBe("遊戲開始。");
    expect(localizeEvent("1 player(s) died during the night.")).toBe("今晚有 1 名玩家死亡。");
    expect(localizeEvent("No one died during the night.")).toBe("今晚無人死亡。");
    expect(localizeEvent("The village executed one player.")).toBe("村莊處決了一名玩家。");
    expect(localizeEvent("The vote did not execute anyone.")).toBe("這次投票沒有處決任何人。");
    expect(localizeEvent("werewolves win.")).toBe("狼人陣營獲勝。");
  });

  it("uses canonical Traditional Chinese role terminology", () => {
    expect(labelRole("villager")).toBe("普通村民");
    expect(labelRole("Ordinary Townsfolk")).toBe("普通村民");
    expect(labelRole("seer")).toBe("預言家");
  });

  it("localizes V7 waiting states and AI demo errors", () => {
    expect(labelActionState("Seer vision")).toBe("預言家查驗");
    expect(labelActionState("Witch action")).toBe("女巫行動");
    expect(labelActionState("Your vote")).toBe("你的投票");
    expect(localizeError("AI demo controls require dedicated host mode")).toBe("AI demo 控制只能在專職主持房間使用。");
  });
});
