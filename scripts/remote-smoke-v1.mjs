const base = process.env.MILLER_HOLLOW_BASE_URL ?? "https://miller-hollow.fshiori.workers.dev";
const wsBase = base.replace(/^https:/, "wss:").replace(/^http:/, "ws:");

const health = await get("/api/health");
assert(health.ok === true, "health endpoint did not return ok");
assert(health.storage === "durable_object_sqlite", "health endpoint returned unexpected storage");

const home = await fetch(base);
assert(home.ok, `homepage failed with ${home.status}`);
assert((home.headers.get("content-type") ?? "").includes("text/html"), "homepage did not return html");

const room = await post("/api/rooms");
const spectatorTicket = await post(`/api/rooms/${room.roomId}/spectator-ticket`);
assert(spectatorTicket.ticket, "spectator ticket was not returned");
const joined = [];
for (let index = 1; index <= 8; index += 1) {
  joined.push(await post(`/api/rooms/${room.roomId}/join`, { nickname: `Remote ${index}` }));
}

await expectHttpError(`/api/rooms/${room.roomId}/private?seatId=${joined[0].seatId}&token=invalid-token`, 403);
await expectHttpError(`/api/rooms/${room.roomId}/diagnostics?seatId=${joined[0].seatId}&token=invalid-token`, 403);
const diagnostics = await get(`/api/rooms/${room.roomId}/diagnostics?seatId=${joined[0].seatId}&token=${joined[0].token}`);
assert(diagnostics.occupiedSeats === 8, "diagnostics did not report occupied seats");
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
await post(`/api/rooms/${room.roomId}/start`, {
  seatId: joined[0].seatId,
  token: joined[0].token
});

const state = await get(`/api/rooms/${room.roomId}/state`);
assert(state.game?.phase === "night_werewolves", "game did not start in werewolf phase");
assert(!publicStateHasRoles(state), "public state leaked roles before endgame");
assert(!JSON.stringify(state).includes("playerTokenHash"), "public state leaked token hashes");
assert(!JSON.stringify(state).includes("socketTickets"), "public state leaked socket tickets");
await expectSpectatorPublicOnly(room.roomId);

const privates = await privateViews(room.roomId, joined);
const wolfIndex = privates.findIndex((view) => view.role === "werewolf");
assert(wolfIndex >= 0, "remote smoke could not find a werewolf");
assert(privates[wolfIndex].werewolfTeammates.length === 1, "werewolf teammate private view missing");
assert(privates.filter((view) => view.role !== "seer").every((view) => Object.keys(view.seerResults).length === 0), "seer results leaked to non-Seer");

await socketSend(room.roomId, joined[wolfIndex], {
  type: "night_action",
  targetId: privates[wolfIndex].legalTargets[0]
}, "night_seer");

console.log(`Remote V1 smoke passed for ${base}`);

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

async function expectHttpError(path, status, method = "GET") {
  const response = await fetch(`${base}${path}`, { method });
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

function publicStateHasRoles(state) {
  return state.game.players.some((player) => player.role);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
