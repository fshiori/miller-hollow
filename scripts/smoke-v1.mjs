import { spawn } from "node:child_process";

const base = "http://localhost:8787";
const wsBase = "ws://localhost:8787";

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

try {
  await waitForReady();
  const health = await get("/api/health");
  assert(health.ok === true, "health endpoint did not return ok");
  assert(health.storage === "durable_object_sqlite", "health endpoint returned unexpected storage");
  const room = await post("/api/rooms");
  const joined = [];
  for (let index = 1; index <= 8; index += 1) {
    joined.push(await post(`/api/rooms/${room.roomId}/join`, { nickname: `Smoke ${index}` }));
  }
  await expectHttpError(`/api/rooms/${room.roomId}/join`, 409, { nickname: "Overflow" });
  await expectHttpError(`/api/rooms/${room.roomId}/reconnect`, 403, {
    seatId: joined[0].seatId,
    token: "invalid-token"
  });
  await expectHttpError(`/api/rooms/${room.roomId}/socket-ticket`, 403, {
    seatId: joined[0].seatId,
    token: "invalid-token"
  });
  await expectHttpError(`/api/rooms/${room.roomId}/private?seatId=${joined[0].seatId}&token=invalid-token`, 403);
  await expectHttpError(`/api/rooms/${room.roomId}/diagnostics?seatId=${joined[0].seatId}&token=invalid-token`, 403);
  await expectHttpError(`/api/rooms/${room.roomId}/reset`, 403, {
    seatId: joined[1].seatId,
    token: joined[1].token
  });

  const reconnected = await post(`/api/rooms/${room.roomId}/reconnect`, {
    seatId: joined[0].seatId,
    token: joined[0].token
  });
  assert(reconnected.seatId === joined[0].seatId, "reconnect did not return the same seat");
  const diagnostics = await get(`/api/rooms/${room.roomId}/diagnostics?seatId=${joined[0].seatId}&token=${joined[0].token}`);
  assert(diagnostics.occupiedSeats === 8, "diagnostics did not report occupied seats");
  assert(!JSON.stringify(diagnostics).includes("token"), "diagnostics leaked token data");
  await post(`/api/rooms/${room.roomId}/reset`, {
    seatId: joined[0].seatId,
    token: joined[0].token
  });

  await post(`/api/rooms/${room.roomId}/start`, {
    seatId: joined[0].seatId,
    token: joined[0].token
  });
  await expectHttpError(`/api/rooms/${room.roomId}/start`, 409, {
    seatId: joined[0].seatId,
    token: joined[0].token
  });

  let privates = await privateViews(room.roomId, joined);
  const startedState = await get(`/api/rooms/${room.roomId}/state`);
  assert(!publicStateHasRoles(startedState), "public state leaked roles before endgame");
  assert(!JSON.stringify(startedState).includes("playerTokenHash"), "public state leaked token hashes");
  assert(!JSON.stringify(startedState).includes("socketTickets"), "public state leaked socket tickets");
  assert(!JSON.stringify(startedState).includes('"privateView"'), "public state leaked private views");

  const wolfIndex = privates.findIndex((view) => view.role === "werewolf");
  const seerIndex = privates.findIndex((view) => view.role === "seer");
  const witchIndex = privates.findIndex((view) => view.role === "witch");
  assert(wolfIndex >= 0 && seerIndex >= 0 && witchIndex >= 0, "required roles were not assigned");
  assert(privates[wolfIndex].werewolfTeammates.length === 1, "werewolf teammate private view missing");
  assert(privates.filter((view) => view.role !== "seer").every((view) => Object.keys(view.seerResults).length === 0), "seer results leaked to non-Seer");

  await expectSocketError(room.roomId, joined[0], {
    type: "day_chat",
    message: "night chat should fail"
  });

  await socketSend(room.roomId, joined[wolfIndex], {
    type: "night_action",
    targetId: privates[wolfIndex].legalTargets[0]
  }, "night_seer");
  privates = await privateViews(room.roomId, joined);
  await socketSend(room.roomId, joined[seerIndex], {
    type: "night_action",
    targetId: privates[seerIndex].legalTargets[0]
  }, "night_witch");
  await socketSend(room.roomId, joined[witchIndex], {
    type: "night_action"
  }, "day_discussion");

  const living = await livingSessions(room.roomId, joined);
  await socketSend(room.roomId, living[0], {
    type: "day_chat",
    message: "Smoke test day chat"
  }, "day_discussion");

  await waitForPhase(room.roomId, "day_vote", 30_000);
  const target = (await get(`/api/rooms/${room.roomId}/state`)).game.players.find((player) => player.alive).id;
  for (const player of await livingSessions(room.roomId, joined)) {
    await socketSend(room.roomId, player, { type: "vote", targetId: target }, undefined);
  }
  await waitForNotPhase(room.roomId, "day_vote", 5_000);
  assert(!publicStateHasRoles(await get(`/api/rooms/${room.roomId}/state`)), "public state leaked roles after non-end vote");
  console.log("V1 smoke passed");
} finally {
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

async function get(path) {
  const response = await fetch(`${base}${path}`);
  const json = await response.json();
  if (!response.ok) throw new Error(`${path} failed: ${JSON.stringify(json)}`);
  return json;
}

async function post(path, body) {
  const response = await fetch(`${base}${path}`, {
    method: "POST",
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined
  });
  const json = await response.json();
  if (!response.ok) throw new Error(`${path} failed: ${JSON.stringify(json)}`);
  return json;
}

async function expectHttpError(path, status, body) {
  const response = await fetch(`${base}${path}`, {
    method: body || path.includes("/join") || path.includes("/reconnect") || path.includes("/start") ? "POST" : "GET",
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined
  });
  if (response.status !== status) {
    const text = await response.text();
    throw new Error(`${path} expected ${status}, got ${response.status}: ${text}`);
  }
}

async function privateViews(roomId, joined) {
  return Promise.all(
    joined.map(async (player) => {
      const payload = await get(`/api/rooms/${roomId}/private?seatId=${player.seatId}&token=${player.token}`);
      return payload.privateView;
    })
  );
}

async function livingSessions(roomId, joined) {
  const state = await get(`/api/rooms/${roomId}/state`);
  const livingSeatIds = new Set(state.game.players.filter((player) => player.alive).map((player) => player.id));
  return joined.filter((player) => livingSeatIds.has(player.seatId));
}

async function socketSend(roomId, player, message, expectedPhase) {
  const ticket = await socketTicket(roomId, player);
  const socket = new WebSocket(`${wsBase}/api/rooms/${roomId}/socket?ticket=${ticket}`);
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`socket timeout for ${JSON.stringify(message)}`)), 10_000);
    socket.addEventListener("open", () => {
      socket.send(JSON.stringify(message));
      if (!expectedPhase) {
        clearTimeout(timeout);
        socket.close();
        resolve();
      }
    });
    socket.addEventListener("message", (event) => {
      const payload = JSON.parse(String(event.data));
      if (payload.type === "error") {
        clearTimeout(timeout);
        reject(new Error(payload.error));
      }
      if (expectedPhase && payload.type === "room_view" && payload.room.game?.phase === expectedPhase) {
        clearTimeout(timeout);
        socket.close();
        resolve();
      }
    });
    socket.addEventListener("error", reject);
  });
}

async function expectSocketError(roomId, player, message) {
  const ticket = await socketTicket(roomId, player);
  const socket = new WebSocket(`${wsBase}/api/rooms/${roomId}/socket?ticket=${ticket}`);
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`expected socket error for ${JSON.stringify(message)}`)), 10_000);
    socket.addEventListener("open", () => {
      socket.send(JSON.stringify(message));
    });
    socket.addEventListener("message", (event) => {
      const payload = JSON.parse(String(event.data));
      if (payload.type === "error") {
        clearTimeout(timeout);
        socket.close();
        resolve();
      }
    });
    socket.addEventListener("error", reject);
  });
}

async function socketTicket(roomId, player) {
  const payload = await post(`/api/rooms/${roomId}/socket-ticket`, {
    seatId: player.seatId,
    token: player.token
  });
  assert(payload.ticket, "socket ticket was not returned");
  return payload.ticket;
}

async function waitForPhase(roomId, phase, timeoutMs) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const state = await get(`/api/rooms/${roomId}/state`);
    if (state.game?.phase === phase) return;
    await delay(500);
  }
  throw new Error(`Timed out waiting for phase ${phase}`);
}

async function waitForNotPhase(roomId, phase, timeoutMs) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const state = await get(`/api/rooms/${roomId}/state`);
    if (state.game?.phase !== phase) return;
    await delay(250);
  }
  throw new Error(`Timed out waiting to leave phase ${phase}`);
}

function publicStateHasRoles(state) {
  return state.game.players.some((player) => player.role);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
