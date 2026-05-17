import { spawn } from "node:child_process";
import { chromium } from "@playwright/test";

const base = "http://localhost:8787";

const server = spawn("./node_modules/.bin/wrangler", ["dev", "--var", "MILLER_HOLLOW_TIMER_PROFILE:smoke"], {
  detached: true,
  stdio: ["ignore", "pipe", "pipe"]
});

let output = "";
server.stdout.on("data", (chunk) => {
  output += chunk.toString();
});
server.stderr.on("data", (chunk) => {
  output += chunk.toString();
});

let browser;
try {
  await waitForReady();
  browser = await chromium.launch();
  const contexts = await Promise.all(Array.from({ length: 8 }, () => browser.newContext()));
  const pages = await Promise.all(contexts.map((context) => context.newPage()));
  const spectatorContext = await browser.newContext();
  const spectatorPage = await spectatorContext.newPage();

  await pages[0].goto(base);
  await pages[0].getByRole("button", { name: "建立房間" }).waitFor();
  await pages[0].getByRole("button", { name: "加入房間" }).waitFor();
  await pages[0].locator("body").filter({ hasText: "米勒山谷狼人" }).waitFor();
  await pages[0].locator("body").filter({ hasText: "偏遠小鎮最近被狼人滲透" }).waitFor();
  await pages[0].getByTestId("official-basic-summary").filter({ hasText: "2 狼人" }).waitFor();
  await pages[0].locator('#create-form input[name="nickname"]').fill("Browser 18 Host");
  await pages[0].locator('#create-form select[name="customPlayerCount"]').selectOption("18");
  await pages[0].getByTestId("official-basic-summary").filter({ hasText: "4 狼人" }).waitFor();
  await pages[0].getByTestId("official-basic-summary").filter({ hasText: "13 普通村民" }).waitFor();
  await pages[0].locator('#create-form button[type="submit"]').click();
  await pages[0].getByTestId("room-id").waitFor();
  await pages[0].locator(".room-meta").filter({ hasText: "18 人官方基本局" }).waitFor();
  await pages[0].getByTestId("rules-reference").filter({ hasText: "房間規則" }).waitFor();
  await pages[0].getByTestId("phase-timeline").filter({ hasText: "大廳" }).waitFor();
  await pages[0].locator(".seat").nth(17).waitFor();
  await pages[0].screenshot({ path: ".wrangler/browser-smoke-desktop-lobby-18.png", fullPage: true });
  await pages[0].locator("#leave-button").click();
  await pages[0].locator("#create-form").waitFor();

  await pages[0].goto(base);
  await pages[0].locator('#create-form input[name="nickname"]').fill("Browser Dedicated Host");
  await pages[0].locator('#create-form input[name="hostMode"][value="dedicated_host"]').check();
  await pages[0].locator('#create-form button[type="submit"]').click();
  await pages[0].getByTestId("room-id").waitFor();
  await pages[0].locator(".room-meta").filter({ hasText: "專職主持可查看隱藏資訊" }).waitFor();
  await pages[0].locator(".ai-demo-tools").filter({ hasText: "AI Demo" }).waitFor();
  await pages[0].locator("#add-ai-players-button").filter({ hasText: "補滿 AI" }).waitFor();
  await pages[0].getByRole("link", { name: "主持後台" }).click();
  await pages[0].locator("body").filter({ hasText: "主持後台" }).waitFor();
  await pages[0].locator("body").filter({ hasText: "等待遊戲開始" }).waitFor();
  await pages[0].getByRole("link", { name: "回到房間" }).click();
  await pages[0].locator("#leave-button").click();
  await pages[0].locator("#create-form").waitFor();

  await pages[0].goto(base);
  await pages[0].locator('#create-form input[name="nickname"]').fill("Browser 1");
  await pages[0].locator('#create-form input[name="rulesMode"][value="custom_roleflow"]').check();
  await pages[0].locator('#create-form input[name="hunterEnabled"]').check();
  await pages[0].locator('#create-form button[type="submit"]').click();
  await pages[0].getByTestId("room-id").waitFor();
  const roomId = (await pages[0].getByTestId("room-id").textContent())?.trim();
  assert(roomId, "room id did not render after create");
  assert((await pages[0].locator("#add-ai-players-button").count()) === 0, "player-host room exposed AI demo controls");
  await pages[0].locator("#lock-button").click();
  await pages[0].locator("#lock-button").filter({ hasText: "解鎖" }).waitFor();
  await pages[0].locator("#lock-button").click();
  await pages[0].locator("#lock-button").filter({ hasText: "鎖定" }).waitFor();

  await spectatorPage.goto(`${base}/room/${roomId}/watch`);
  await spectatorPage.getByTestId("room-id").waitFor();
  await spectatorPage.locator("body").filter({ hasText: "觀戰中" }).waitFor();
  await waitForAnyPagePhase([spectatorPage], "lobby");
  await pages[0].screenshot({ path: ".wrangler/browser-smoke-desktop-lobby.png", fullPage: true });
  await spectatorPage.setViewportSize({ width: 390, height: 844 });
  await spectatorPage.screenshot({ path: ".wrangler/browser-smoke-mobile-watch.png", fullPage: true });

  for (let index = 1; index < pages.length; index += 1) {
    await pages[index].goto(base);
    await pages[index].locator('#join-form input[name="roomId"]').fill(roomId);
    await pages[index].locator('#join-form input[name="nickname"]').fill(`Browser ${index + 1}`);
    await pages[index].locator('#join-form button[type="submit"]').click();
    await pages[index].getByTestId("room-id").waitFor();
  }

  for (const page of pages) {
    await page.locator("#ready-button").waitFor({ state: "visible" });
    await page.locator("#ready-button").filter({ hasText: "準備" }).waitFor();
    await page.locator("#ready-button").click();
  }
  await pages[0].locator("#start-button").waitFor({ state: "visible" });
  await pages[0].locator("#start-button").filter({ hasText: "開始遊戲" }).waitFor();
  await pages[0].locator("#start-button:not([disabled])").waitFor();
  await pages[0].locator("#start-button").click();
  await waitForAnyPagePhase(pages, "night_seer");
  await pages[0].getByTestId("waiting-state").waitFor({ timeout: 10_000 });
  await pages[0].getByTestId("phase-timeline").filter({ hasText: "預言家夜晚" }).waitFor({ timeout: 10_000 });
  await waitForRoles(pages);
  await assertLocalizedRoles(pages);
  await waitForAnyPagePhase([spectatorPage], "night_seer");
  assert((await spectatorPage.getByTestId("role").count()) === 0, "spectator rendered a private role");
  const observerPage = await contexts[0].newPage();
  await observerPage.goto(`${base}/room/${roomId}/host-watch`);
  await observerPage.locator("body").filter({ hasText: "房主不可查看隱藏資訊" }).waitFor();

  const roleBeforeReload = (await pages[0].getByTestId("role").textContent())?.trim();
  await pages[0].reload();
  await pages[0].getByTestId("role").waitFor({ timeout: 10_000 });
  await waitConnected(pages[0]);
  const roleAfterReload = (await pages[0].getByTestId("role").textContent())?.trim();
  assert(roleBeforeReload === roleAfterReload, "player reconnect did not restore the same private role");

  const werewolfPages = await pagesWithRole(pages, "狼人", 2);
  assert(werewolfPages.length >= 2, "browser smoke could not find both Werewolves");
  const seerPage = await pageWithRole(pages, "預言家");
  const hunterPage = await pageWithRole(pages, "獵人");
  const hunterLabel = `Browser ${pages.indexOf(hunterPage) + 1}`;
  const nonWerewolfPage = pages.find((page) => !werewolfPages.includes(page));
  assert(nonWerewolfPage, "browser smoke could not find a non-Werewolf page");
  await submitSelectForm(seerPage, "#night-form");
  await waitForAnyPagePhase(pages, "night_werewolves");
  const wolfMessage = "Browser wolf private chat";
  await waitConnected(werewolfPages[0]);
  await werewolfPages[0].locator('#werewolf-chat-form input[name="message"]').fill(wolfMessage);
  await werewolfPages[0].locator('#werewolf-chat-form button[type="submit"]').click();
  await werewolfPages[1].locator("body").filter({ hasText: wolfMessage }).waitFor({ timeout: 10_000 });
  assert((await nonWerewolfPage.locator("body").filter({ hasText: wolfMessage }).count()) === 0, "Werewolf chat leaked to non-Werewolf page");
  assert((await spectatorPage.locator("body").filter({ hasText: wolfMessage }).count()) === 0, "Werewolf chat leaked to spectator page");
  await submitSelectFormAvoidLabel(werewolfPages[0], "#werewolf-target-form", hunterLabel);
  for (const page of werewolfPages) {
    await clickWerewolfReadyIfStillActive(page, pages);
  }
  await waitForAnyPagePhase(pages, "day_discussion");

  const chatPage = await firstVisible(pages, '#chat-form input:not([disabled])');
  await waitConnected(chatPage);
  await chatPage.locator('#chat-form input[name="message"]').fill("Browser smoke day chat");
  await chatPage.locator('#chat-form button[type="submit"]').click();
  await pages[0].locator("#open-sheriff-election-button").filter({ hasText: "開啟警長選舉" }).waitFor();
  await pages[0].locator("#open-sheriff-election-button").click();
  await waitForAnyPagePhase(pages, "sheriff_election", 10_000);
  for (const page of pages) {
    if (await page.locator("#sheriff-vote-form").isVisible().catch(() => false)) {
      await waitConnected(page);
      await submitSelectForm(page, "#sheriff-vote-form", 1);
    }
  }
  await waitForAnyPagePhase(pages, "day_discussion", 10_000);
  await pages[0].locator("body").filter({ hasText: "警長：" }).waitFor({ timeout: 10_000 });
  await pages[0].locator("#advance-phase-button").filter({ hasText: "快轉階段" }).waitFor();
  await pages[0].locator("#advance-phase-button").click();
  await waitForAnyPagePhase(pages, "day_vote", 10_000);
  assert((await spectatorPage.locator('[data-testid="vote-results"]').count()) === 0, "spectator saw vote results before resolution");

  for (const page of pages) {
    if (await page.locator("#vote-form").isVisible().catch(() => false)) {
      await waitConnected(page);
      if (page === hunterPage) {
        await submitSelectForm(page, "#vote-form");
      } else {
        await submitSelectFormByLabel(page, "#vote-form", hunterLabel);
      }
    }
  }
  await waitForAnyPagePhase(pages, "hunter_revenge", 10_000);
  await submitSelectForm(hunterPage, "#hunter-shot-form");
  await waitForAnyPageNotPhase(pages, "hunter_revenge", 10_000);
  await pages[0].locator('[data-testid="vote-results"]').filter({ hasText: "投票結果" }).waitFor({ timeout: 10_000 });
  await pages[0].locator('[data-testid="vote-results"]').filter({ hasText: "警長票 x2" }).waitFor({ timeout: 10_000 });
  await spectatorPage.locator('[data-testid="vote-results"]').filter({ hasText: "投票結果" }).waitFor({ timeout: 10_000 });

  await Promise.all(contexts.map((context) => context.close()));
  await spectatorContext.close();
  console.log("Browser V7 smoke passed");
} finally {
  if (browser) await browser.close();
  try {
    process.kill(-server.pid, "SIGTERM");
  } catch {
    server.kill("SIGTERM");
  }
}

async function waitForReady() {
  const started = Date.now();
  while (Date.now() - started < 30_000) {
    if (output.includes("Ready on")) return;
    await delay(250);
  }
  throw new Error(`Wrangler did not start:\n${output}`);
}

async function waitForRoles(pages) {
  await Promise.all(pages.map((page) => page.getByTestId("role").waitFor({ timeout: 10_000 })));
}

async function assertLocalizedRoles(pages) {
  const roles = await Promise.all(pages.map((page) => page.getByTestId("role").textContent()));
  const text = roles.join(" ");
  assert(text.includes("狼人"), "localized Werewolf role did not render");
  assert(text.includes("預言家"), "localized Fortune Teller role did not render");
  assert(text.includes("獵人"), "localized Hunter role did not render");
  assert(text.includes("村民"), "localized Villager role did not render");
}

async function pageWithRole(pages, role) {
  const started = Date.now();
  while (Date.now() - started < 10_000) {
    for (const page of pages) {
      const text = (await page.getByTestId("role").textContent().catch(() => ""))?.trim();
      if (text === role) return page;
    }
    await delay(100);
  }
  throw new Error(`Could not find page with role ${role}`);
}

async function pagesWithRole(pages, role, minimum = 1) {
  const started = Date.now();
  while (Date.now() - started < 10_000) {
    const matches = [];
    for (const page of pages) {
      const text = (await page.getByTestId("role").textContent().catch(() => ""))?.trim();
      if (text === role) matches.push(page);
    }
    if (matches.length >= minimum) return matches;
    await delay(100);
  }
  throw new Error(`Could not find pages with role ${role}`);
}

async function firstVisible(pages, selector) {
  const started = Date.now();
  while (Date.now() - started < 10_000) {
    for (const page of pages) {
      if (await page.locator(selector).isVisible().catch(() => false)) {
        return page;
      }
    }
    await delay(100);
  }
  throw new Error(`No page has visible selector ${selector}`);
}

async function submitSelectForm(page, selector, index = 0) {
  await waitConnected(page);
  await page.locator(selector).waitFor({ state: "visible" });
  await page.locator(`${selector} select`).selectOption({ index });
  await page.locator(`${selector} button[type="submit"]`).click();
}

async function submitSelectFormByLabel(page, selector, label) {
  await waitConnected(page);
  await page.locator(selector).waitFor({ state: "visible" });
  await page.locator(`${selector} select`).selectOption({ label });
  await page.locator(`${selector} button[type="submit"]`).click();
}

async function submitSelectFormAvoidLabel(page, selector, avoidedLabel) {
  await waitConnected(page);
  await page.locator(selector).waitFor({ state: "visible" });
  const options = await page.locator(`${selector} select option`).allTextContents();
  const index = options.findIndex((option) => option.trim() !== avoidedLabel);
  assert(index >= 0, `Could not find selectable option outside ${avoidedLabel}`);
  await page.locator(`${selector} select`).selectOption({ index });
  await page.locator(`${selector} button[type="submit"]`).click();
}

async function clickWerewolfReadyIfStillActive(page, pages) {
  const result = await Promise.race([
    page
      .locator("#werewolf-ready-button:not([disabled])")
      .waitFor({ state: "visible", timeout: 10_000 })
      .then(() => "ready")
      .catch(() => "missing"),
    waitForAnyPagePhase(pages, "day_discussion", 10_000)
      .then(() => "advanced")
      .catch(() => "missing")
  ]);
  if (result === "ready") {
    await page.locator("#werewolf-ready-button").click();
  }
}

async function waitConnected(page) {
  await page.locator(".status-pill").filter({ hasText: "已連線" }).waitFor({ timeout: 10_000 });
}

async function waitForAnyPagePhase(pages, phase, timeout = 10_000) {
  const expected = labelPhase(phase);
  const started = Date.now();
  while (Date.now() - started < timeout) {
    for (const page of pages) {
      const text = (await page.getByTestId("phase").textContent().catch(() => ""))?.trim();
      if (text === expected) return;
    }
    await delay(200);
  }
  throw new Error(`Timed out waiting for phase ${phase}`);
}

async function waitForAnyPageNotPhase(pages, phase, timeout = 10_000) {
  const expected = labelPhase(phase);
  const started = Date.now();
  while (Date.now() - started < timeout) {
    for (const page of pages) {
      const text = (await page.getByTestId("phase").textContent().catch(() => ""))?.trim();
      if (text && text !== expected) return;
    }
    await delay(200);
  }
  throw new Error(`Timed out waiting to leave phase ${phase}`);
}

function labelPhase(phase) {
  return {
    lobby: "大廳",
    night_werewolves: "狼人夜晚",
    night_seer: "預言家夜晚",
    night_witch: "女巫夜晚",
    day_discussion: "白天討論",
    day_vote: "白天投票",
    sheriff_election: "警長選舉",
    hunter_revenge: "獵人反擊",
    sheriff_succession: "警長移交",
    ended: "遊戲結束"
  }[phase] ?? phase;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
