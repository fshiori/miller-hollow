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
  await pages[0].locator("body").filter({ hasText: "8-18 人" }).waitFor();
  await pages[0].locator('#create-form input[name="nickname"]').fill("Browser 18 Host");
  await pages[0].locator('#create-form select[name="presetId"]').selectOption("official_basic_18");
  await pages[0].locator('#create-form button[type="submit"]').click();
  await pages[0].getByTestId("room-id").waitFor();
  await pages[0].locator(".room-meta").filter({ hasText: "18 人官方基本局" }).waitFor();
  await pages[0].locator(".seat").nth(17).waitFor();
  await pages[0].screenshot({ path: ".wrangler/browser-smoke-desktop-lobby-18.png", fullPage: true });
  await pages[0].locator("#leave-button").click();
  await pages[0].locator("#create-form").waitFor();

  await pages[0].goto(base);
  await pages[0].locator('#create-form input[name="nickname"]').fill("Browser 1");
  await pages[0].locator('#create-form select[name="presetId"]').selectOption("official_basic_8");
  await pages[0].locator('#create-form button[type="submit"]').click();
  await pages[0].getByTestId("room-id").waitFor();
  const roomId = (await pages[0].getByTestId("room-id").textContent())?.trim();
  assert(roomId, "room id did not render after create");
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
  await waitForAnyPagePhase(pages, "night_werewolves");
  await waitForRoles(pages);
  await assertLocalizedRoles(pages);
  await waitForAnyPagePhase([spectatorPage], "night_werewolves");
  assert((await spectatorPage.getByTestId("role").count()) === 0, "spectator rendered a private role");

  const roleBeforeReload = (await pages[0].getByTestId("role").textContent())?.trim();
  await pages[0].reload();
  await pages[0].getByTestId("role").waitFor({ timeout: 10_000 });
  await waitConnected(pages[0]);
  const roleAfterReload = (await pages[0].getByTestId("role").textContent())?.trim();
  assert(roleBeforeReload === roleAfterReload, "player reconnect did not restore the same private role");

  const werewolfPage = await firstVisible(pages, "#night-form");
  await submitSelectForm(werewolfPage, "#night-form");
  await waitForAnyPagePhase(pages, "night_seer");

  const seerPage = await firstVisible(pages, "#night-form");
  await submitSelectForm(seerPage, "#night-form");
  await waitForAnyPagePhase(pages, "day_discussion");

  const chatPage = await firstVisible(pages, '#chat-form input:not([disabled])');
  await waitConnected(chatPage);
  await chatPage.locator('#chat-form input[name="message"]').fill("Browser smoke day chat");
  await chatPage.locator('#chat-form button[type="submit"]').click();
  await pages[0].locator("#advance-phase-button").filter({ hasText: "快轉階段" }).waitFor();
  await pages[0].locator("#advance-phase-button").click();
  await waitForAnyPagePhase(pages, "day_vote", 10_000);

  for (const page of pages) {
    if (await page.locator("#vote-form").isVisible().catch(() => false)) {
      await waitConnected(page);
      await submitSelectForm(page, "#vote-form");
    }
  }
  await waitForAnyPageNotPhase(pages, "day_vote", 10_000);

  await Promise.all(contexts.map((context) => context.close()));
  await spectatorContext.close();
  console.log("Browser V4.6 smoke passed");
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

async function submitSelectForm(page, selector) {
  await waitConnected(page);
  await page.locator(selector).waitFor({ state: "visible" });
  await page.locator(`${selector} select`).selectOption({ index: 0 });
  await page.locator(`${selector} button[type="submit"]`).click();
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
    ended: "遊戲結束"
  }[phase] ?? phase;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
