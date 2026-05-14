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

  await pages[0].goto(base);
  await pages[0].locator('#create-form input[name="nickname"]').fill("Browser 1");
  await pages[0].locator('#create-form button[type="submit"]').click();
  await pages[0].getByTestId("room-id").waitFor();
  const roomId = (await pages[0].getByTestId("room-id").textContent())?.trim();
  assert(roomId, "room id did not render after create");

  for (let index = 1; index < pages.length; index += 1) {
    await pages[index].goto(base);
    await pages[index].locator('#join-form input[name="roomId"]').fill(roomId);
    await pages[index].locator('#join-form input[name="nickname"]').fill(`Browser ${index + 1}`);
    await pages[index].locator('#join-form button[type="submit"]').click();
    await pages[index].getByTestId("room-id").waitFor();
  }

  await pages[0].locator("#start-button").waitFor({ state: "visible" });
  await pages[0].locator("#start-button").click();
  await waitForAnyPagePhase(pages, "night_werewolves");
  await waitForRoles(pages);

  const werewolfPage = await pageWithRole(pages, "werewolf");
  await submitSelectForm(werewolfPage, "#night-form");
  await waitForAnyPagePhase(pages, "night_seer");

  const seerPage = await pageWithRole(pages, "seer");
  await submitSelectForm(seerPage, "#night-form");
  await waitForAnyPagePhase(pages, "night_witch");

  const witchPage = await pageWithRole(pages, "witch");
  await witchPage.locator("#witch-form").waitFor({ state: "visible" });
  await witchPage.locator('#witch-form button[type="submit"]').click();
  await waitForAnyPagePhase(pages, "day_discussion");

  const chatPage = await firstVisible(pages, '#chat-form input:not([disabled])');
  await chatPage.locator('#chat-form input[name="message"]').fill("Browser smoke day chat");
  await chatPage.locator('#chat-form button[type="submit"]').click();
  await waitForAnyPagePhase(pages, "day_vote", 30_000);

  for (const page of pages) {
    if (await page.locator("#vote-form").isVisible().catch(() => false)) {
      await submitSelectForm(page, "#vote-form");
    }
  }
  await waitForAnyPageNotPhase(pages, "day_vote", 10_000);

  await Promise.all(contexts.map((context) => context.close()));
  console.log("Browser V1 smoke passed");
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
  await page.locator(selector).waitFor({ state: "visible" });
  await page.locator(`${selector} select`).selectOption({ index: 0 });
  await page.locator(`${selector} button[type="submit"]`).click();
}

async function waitForAnyPagePhase(pages, phase, timeout = 10_000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    for (const page of pages) {
      const text = (await page.getByTestId("phase").textContent().catch(() => ""))?.trim();
      if (text === phase) return;
    }
    await delay(200);
  }
  throw new Error(`Timed out waiting for phase ${phase}`);
}

async function waitForAnyPageNotPhase(pages, phase, timeout = 10_000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    for (const page of pages) {
      const text = (await page.getByTestId("phase").textContent().catch(() => ""))?.trim();
      if (text && text !== phase) return;
    }
    await delay(200);
  }
  throw new Error(`Timed out waiting to leave phase ${phase}`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
