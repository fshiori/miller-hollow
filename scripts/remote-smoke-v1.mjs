const base = process.env.MILLER_HOLLOW_BASE_URL ?? "https://miller-hollow.fshiori.workers.dev";
const wsBase = base.replace(/^https:/, "wss:").replace(/^http:/, "ws:");
const presetCounts = {
  official_basic_8: { players: 8, werewolf: 2, seer: 1, villager: 5 },
  official_basic_9: { players: 9, werewolf: 2, seer: 1, villager: 6 },
  official_basic_10: { players: 10, werewolf: 2, seer: 1, villager: 7 },
  official_basic_11: { players: 11, werewolf: 2, seer: 1, villager: 8 },
  official_basic_12: { players: 12, werewolf: 3, seer: 1, villager: 8 },
  official_basic_13: { players: 13, werewolf: 3, seer: 1, villager: 9 },
  official_basic_14: { players: 14, werewolf: 3, seer: 1, villager: 10 },
  official_basic_15: { players: 15, werewolf: 3, seer: 1, villager: 11 },
  official_basic_16: { players: 16, werewolf: 3, seer: 1, villager: 12 },
  official_basic_17: { players: 17, werewolf: 3, seer: 1, villager: 13 },
  official_basic_18: { players: 18, werewolf: 4, seer: 1, villager: 13 },
  official_roleflow_8: { players: 8, werewolf: 2, seer: 1, hunter: 1, villager: 4 },
  app_basic_8: { players: 8, werewolf: 2, seer: 1, witch: 1, villager: 4 },
  basic_8: { players: 8, werewolf: 2, seer: 1, witch: 1, villager: 4 }
};
const presetId = process.env.MILLER_HOLLOW_PRESET_ID ?? "official_basic_8";
const expectedPreset = presetCounts[presetId];
assert(expectedPreset, `unsupported MILLER_HOLLOW_PRESET_ID ${presetId}`);

const health = await get("/api/health");
assert(health.ok === true, "health endpoint did not return ok");
assert(health.storage === "durable_object_sqlite", "health endpoint returned unexpected storage");

const home = await fetch(base);
assert(home.ok, `homepage failed with ${home.status}`);
assert((home.headers.get("content-type") ?? "").includes("text/html"), "homepage did not return html");

const room = await post("/api/rooms", { presetId });
const spectatorTicket = await post(`/api/rooms/${room.roomId}/spectator-ticket`);
assert(spectatorTicket.ticket, "spectator ticket was not returned");
const joined = [await post(`/api/rooms/${room.roomId}/join`, { nickname: "Remote 1" })];
for (let index = 2; index <= expectedPreset.players; index += 1) {
  joined.push(await post(`/api/rooms/${room.roomId}/join`, { nickname: `Remote ${index}` }));
}

await expectHttpError(`/api/rooms/${room.roomId}/private?seatId=${joined[0].seatId}&token=invalid-token`, 403);
await expectHttpError(`/api/rooms/${room.roomId}/diagnostics?seatId=${joined[0].seatId}&token=invalid-token`, 403);
const diagnostics = await get(`/api/rooms/${room.roomId}/diagnostics?seatId=${joined[0].seatId}&token=${joined[0].token}`);
assert(diagnostics.occupiedSeats === expectedPreset.players, "diagnostics did not report occupied seats");
assert(typeof diagnostics.activeSpectators === "number", "diagnostics did not report active spectators");
assert(!JSON.stringify(diagnostics).includes("token"), "diagnostics leaked token data");
await post(`/api/rooms/${room.roomId}/host/disable-spectators`, {
  seatId: joined[0].seatId,
  token: joined[0].token
});
await expectHttpError(`/api/rooms/${room.roomId}/spectator-ticket`, 403, "POST");
await post(`/api/rooms/${room.roomId}/host/enable-spectators`, {
  seatId: joined[0].seatId,
  token: joined[0].token
});
await expectSpectatorPublicOnly(room.roomId);
await expectHttpError(`/api/rooms/${room.roomId}/start`, 409, "POST", {
  seatId: joined[0].seatId,
  token: joined[0].token
});
for (const player of joined) {
  await socketSend(room.roomId, player, { type: "set_ready", ready: true }, undefined);
}
const readyState = await waitForEligibility(room.roomId, true);
assert(readyState.preset?.id === presetId, "public state did not report selected preset");
await post(`/api/rooms/${room.roomId}/start`, {
  seatId: joined[0].seatId,
  token: joined[0].token
});

const state = await get(`/api/rooms/${room.roomId}/state`);
const officialNightOrder = presetId.startsWith("official_");
assert(state.game?.phase === (officialNightOrder ? "night_seer" : "night_werewolves"), "game did not start in expected first night phase");
assert(!publicStateHasRoles(state), "public state leaked roles before endgame");
assert(!JSON.stringify(state).includes("playerTokenHash"), "public state leaked token hashes");
assert(!JSON.stringify(state).includes("socketTickets"), "public state leaked socket tickets");
assert(!state.game.endgameReveal, "public state revealed endgame before game ended");
await expectSpectatorPublicOnly(room.roomId);

let privates = await privateViews(room.roomId, joined);
const wolfIndex = privates.findIndex((view) => view.role === "werewolf");
assert(wolfIndex >= 0, "remote smoke could not find a werewolf");
assertRoleCounts(privates, expectedPreset, presetId);
assert(privates[wolfIndex].werewolfTeammates.length === expectedPreset.werewolf - 1, "werewolf teammate private view missing");
assert(privates.filter((view) => view.role !== "seer").every((view) => Object.keys(view.seerResults).length === 0), "seer results leaked to non-Seer");

if (officialNightOrder) {
  const seerIndex = privates.findIndex((view) => view.role === "seer");
  assert(seerIndex >= 0, "remote smoke could not find a Seer");
  await socketSend(room.roomId, joined[seerIndex], {
    type: "night_action",
    targetId: privates[seerIndex].legalTargets[0]
  }, "night_werewolves");
  privates = await privateViews(room.roomId, joined);
  await socketSend(room.roomId, joined[wolfIndex], {
    type: "night_action",
    targetId: privates[wolfIndex].legalTargets[0]
  }, "day_discussion");
} else {
  await socketSend(room.roomId, joined[wolfIndex], {
    type: "night_action",
    targetId: privates[wolfIndex].legalTargets[0]
  }, "night_seer");
}

console.log(`Remote V7 smoke passed for ${base} with ${presetId}`);

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

async function expectHttpError(path, status, method = "GET", body) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined
  });
  if (response.status !== status) {
    const text = await response.text();
    throw new Error(`${path} expected ${status}, got ${response.status}: ${text}`);
  }
}

async function expectSpectatorPublicOnly(roomId) {
  const ticketPayload = await post(`/api/rooms/${roomId}/spectator-ticket`);
  assert(ticketPayload.ticket, "spectator ticket was not returned");
  const socket = new WebSocket(`${wsBase}/api/rooms/${roomId}/spectator-socket?ticket=${ticketPayload.ticket}`);
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("expected spectator room view")), 10_000);
    let sawRoomView = false;
    socket.addEventListener("message", (event) => {
      const payload = JSON.parse(String(event.data));
      if (payload.type === "private_view") {
        clearTimeout(timeout);
        reject(new Error("spectator received private view"));
      }
      if (payload.type === "room_view") {
        const body = JSON.stringify(payload);
        if (body.includes("playerTokenHash") || body.includes("socketTickets") || body.includes('"privateView"')) {
          clearTimeout(timeout);
          reject(new Error("spectator public view leaked hidden state"));
          return;
        }
        sawRoomView = true;
        socket.send(JSON.stringify({ type: "night_action" }));
      }
      if (sawRoomView && payload.type === "error") {
        clearTimeout(timeout);
        socket.close();
        resolve();
      }
    });
    socket.addEventListener("error", reject);
  });
}

async function privateViews(roomId, players) {
  return Promise.all(
    players.map(async (player) => {
      const payload = await get(`/api/rooms/${roomId}/private?seatId=${player.seatId}&token=${player.token}`);
      return payload.privateView;
    })
  );
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
        socket.close();
        reject(new Error(payload.error));
      }
      if (payload.type === "room_view" && payload.room.game?.phase === expectedPhase) {
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

async function waitForEligibility(roomId, expectedCanStart) {
  const started = Date.now();
  while (Date.now() - started < 10_000) {
    const state = await get(`/api/rooms/${roomId}/state`);
    if (state.startEligibility?.canStart === expectedCanStart) return state;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for start eligibility ${expectedCanStart}`);
}

function publicStateHasRoles(state) {
  return state.game.players.some((player) => player.role);
}

function assertRoleCounts(privates, expected, id) {
  const counts = privates.reduce((acc, view) => {
    acc[view.role] = (acc[view.role] ?? 0) + 1;
    return acc;
  }, {});
  for (const role of ["werewolf", "seer", "witch", "hunter", "villager"]) {
    assert((counts[role] ?? 0) === (expected[role] ?? 0), `${id} expected ${expected[role] ?? 0} ${role}, got ${counts[role] ?? 0}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
