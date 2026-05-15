import "./styles.css";

type Phase =
  | "night_werewolves"
  | "night_seer"
  | "night_witch"
  | "day_discussion"
  | "day_vote"
  | "ended";

interface SeatView {
  seatId: string;
  nickname?: string;
  controller: "human" | "ai";
  connectionStatus: "connected" | "disconnected";
}

interface PublicPlayerView {
  id: string;
  nickname: string;
  alive: boolean;
  role?: string;
}

interface RoomView {
  roomId: string;
  status: "lobby" | "playing" | "ended";
  hostSeatId?: string;
  settings: {
    playerCount: 8;
    presetId: string;
    spectatorsEnabled: boolean;
    locked: boolean;
  };
  seats: SeatView[];
  game?: {
    phase: Phase;
    round: number;
    players: PublicPlayerView[];
    winner?: string;
    publicEvents: { id: string; message: string }[];
  };
  chatMessages: { id: string; seatId: string; nickname: string; message: string; createdAt: number }[];
  currentDeadlineAt?: number;
  activeSpectators?: number;
}

interface PrivateView {
  playerId: string;
  role: string;
  alive: boolean;
  werewolfTeammates: string[];
  seerResults: Record<string, string>;
  legalActions: string[];
  legalTargets: string[];
  pendingWerewolfTarget?: string;
  witchPotions: {
    saveAvailable: boolean;
    poisonAvailable: boolean;
  };
}

interface Session {
  roomId: string;
  seatId: string;
  token: string;
}

const appElement = document.querySelector<HTMLDivElement>("#app");
if (!appElement) throw new Error("Missing app root");
const app = appElement;

let room: RoomView | undefined;
let privateView: PrivateView | undefined;
let session = loadSession();
let socket: WebSocket | undefined;
let spectatorSocket: WebSocket | undefined;
let timerHandle: number | undefined;
let connectionStatus: "offline" | "connecting" | "connected" | "reconnecting" = session ? "connecting" : "offline";
let statusMessage = "";
const roomIdFromPath = location.pathname.match(/^\/room\/([^/]+)$/)?.[1] ?? "";
const spectatorRoomId = location.pathname.match(/^\/room\/([^/]+)\/watch$/)?.[1] ?? "";
const watching = Boolean(spectatorRoomId);

void boot();

async function boot(): Promise<void> {
  if (watching) {
    await openSpectator();
  } else if (session) {
    await reconnect();
  } else {
    render();
  }
}

function render(): void {
  if (watching) {
    renderSpectator();
    return;
  }
  if (!session) {
    app.innerHTML = `
      <main class="shell narrow auth-screen">
        <header class="masthead">
          <div class="eyebrow">Hidden-role table</div>
          <h1>Miller Hollow</h1>
          <p>8 players, hidden roles, one moderated room.</p>
        </header>
        <section class="panel auth-grid">
          <form id="create-form">
            <h2>Create</h2>
            <label>Nickname<input name="nickname" maxlength="32" required autocomplete="nickname" /></label>
            <button type="submit">Create room</button>
          </form>
          <form id="join-form">
            <h2>Join</h2>
            <label>Room id<input name="roomId" required value="${escapeHtml(roomIdFromPath)}" /></label>
            <label>Nickname<input name="nickname" maxlength="32" required autocomplete="nickname" /></label>
            <button type="submit">Join room</button>
            ${roomIdFromPath ? `<a class="text-link" href="/room/${escapeHtml(roomIdFromPath)}/watch">Watch room</a>` : ""}
          </form>
        </section>
      </main>
    `;
    bindAuthForms();
    return;
  }

  const seats = room?.seats ?? [];
  const game = room?.game;
  const phase = game?.phase ?? "Lobby";
  const playerById = new Map(game?.players.map((player) => [player.id, player]) ?? []);
  app.innerHTML = `
    <main class="shell game-screen phase-${escapeHtml(String(game?.phase ?? "lobby"))}">
      <header class="topbar">
        <div>
          <div class="eyebrow">Live room</div>
          <h1>Miller Hollow</h1>
          <p>Room <code data-testid="room-id">${escapeHtml(session.roomId)}</code></p>
        </div>
        <div class="top-actions">
          <div class="status-pill">${escapeHtml(connectionStatus)}</div>
          <button id="leave-button" class="secondary">Leave</button>
        </div>
      </header>
      ${statusMessage ? `<div class="banner">${escapeHtml(statusMessage)}</div>` : ""}

      <section class="layout">
        <aside class="sidebar">
          <section class="panel">
            <h2>Seats</h2>
            <div class="seat-list">
              ${seats
                .map((seat) => {
                  const player = playerById.get(seat.seatId);
                  const host = seat.seatId === room?.hostSeatId ? " host" : "";
                  const mine = seat.seatId === session?.seatId ? " mine" : "";
                  return `
                    <div class="seat${host}${mine}">
                      <strong>${escapeHtml(seat.nickname ?? "Open")}</strong>
                      <span><i class="status-dot ${escapeHtml(seat.connectionStatus)}"></i>${escapeHtml(seat.seatId)} · ${escapeHtml(seat.connectionStatus)}</span>
                      ${player ? `<span>${player.alive ? "Alive" : "Dead"}${player.role ? ` · ${escapeHtml(player.role)}` : ""}</span>` : ""}
                      ${renderSeatHostActions(seat)}
                    </div>
                  `;
                })
                .join("")}
            </div>
            ${renderStartButton()}
          </section>

          ${renderHostTools()}

          <section class="panel">
            <h2>Your Role</h2>
            ${renderPrivatePanel()}
          </section>
        </aside>

        <section class="main-column">
          <section class="panel">
            <div class="phase-row">
              <div>
                <h2>${escapeHtml(labelPhase(game?.phase))}</h2>
                <p>${game ? `Round ${game.round}` : `${seats.filter((seat) => seat.nickname).length}/8 seats filled`}</p>
              </div>
              <div>
                <div data-testid="phase" class="phase-chip">${escapeHtml(String(phase))}</div>
                ${room?.currentDeadlineAt ? `<div id="timer" class="timer">${formatDeadline(room.currentDeadlineAt)}</div>` : ""}
              </div>
            </div>
            ${renderActionPanel()}
          </section>

          <section class="panel">
            <h2>Day Chat</h2>
            <div class="chat-log">
              ${(room?.chatMessages ?? [])
                .slice(-40)
                .map((message) => `<p><strong>${escapeHtml(message.nickname)}</strong> ${escapeHtml(message.message)}</p>`)
                .join("") || `<p class="muted">No day messages yet.</p>`}
            </div>
            <form id="chat-form" class="inline-form">
              <input name="message" maxlength="240" placeholder="Message living players during day discussion" ${
                game?.phase === "day_discussion" && privateView?.alive ? "" : "disabled"
              } />
              <button type="submit" ${game?.phase === "day_discussion" && privateView?.alive ? "" : "disabled"}>Send</button>
            </form>
          </section>

          <section class="panel">
            <h2>System Log</h2>
            <div class="event-log">
              ${(game?.publicEvents ?? [])
                .slice(-16)
                .map((event) => `<p>${escapeHtml(event.message)}</p>`)
                .join("") || `<p class="muted">Waiting for players.</p>`}
            </div>
          </section>
        </section>
      </section>
    </main>
  `;
  bindRoomActions();
  startTimerLoop();
}

function renderSpectator(): void {
  const seats = room?.seats ?? [];
  const game = room?.game;
  const phase = game?.phase ?? "Lobby";
  const playerById = new Map(game?.players.map((player) => [player.id, player]) ?? []);
  app.innerHTML = `
    <main class="shell game-screen spectator-screen phase-${escapeHtml(String(game?.phase ?? "lobby"))}">
      <header class="topbar">
        <div>
          <div class="eyebrow">Watching</div>
          <h1>Miller Hollow</h1>
          <p>Room <code data-testid="room-id">${escapeHtml(spectatorRoomId)}</code></p>
        </div>
        <div class="top-actions">
          <div class="status-pill">${escapeHtml(connectionStatus)}</div>
          <a class="button-link secondary" href="/room/${escapeHtml(spectatorRoomId)}">Join</a>
        </div>
      </header>
      ${statusMessage ? `<div class="banner">${escapeHtml(statusMessage)}</div>` : ""}
      <section class="layout">
        <aside class="sidebar">
          <section class="panel">
            <h2>Seats</h2>
            <div class="seat-list">
              ${seats
                .map((seat) => {
                  const player = playerById.get(seat.seatId);
                  return `
                    <div class="seat">
                      <strong>${escapeHtml(seat.nickname ?? "Open")}</strong>
                      <span><i class="status-dot ${escapeHtml(seat.connectionStatus)}"></i>${escapeHtml(seat.seatId)} · ${escapeHtml(seat.connectionStatus)}</span>
                      ${player ? `<span>${player.alive ? "Alive" : "Dead"}${player.role ? ` · ${escapeHtml(player.role)}` : ""}</span>` : ""}
                    </div>
                  `;
                })
                .join("")}
            </div>
          </section>
        </aside>
        <section class="main-column">
          <section class="panel">
            <div class="phase-row">
              <div>
                <h2>${escapeHtml(labelPhase(game?.phase))}</h2>
                <p>${game ? `Round ${game.round}` : `${seats.filter((seat) => seat.nickname).length}/8 seats filled`}</p>
              </div>
              <div>
                <div data-testid="phase" class="phase-chip">${escapeHtml(String(phase))}</div>
                ${room?.currentDeadlineAt ? `<div id="timer" class="timer">${formatDeadline(room.currentDeadlineAt)}</div>` : ""}
              </div>
            </div>
          </section>
          <section class="panel">
            <h2>Day Chat</h2>
            <div class="chat-log">
              ${(room?.chatMessages ?? [])
                .slice(-40)
                .map((message) => `<p><strong>${escapeHtml(message.nickname)}</strong> ${escapeHtml(message.message)}</p>`)
                .join("") || `<p class="muted">No day messages yet.</p>`}
            </div>
          </section>
          <section class="panel">
            <h2>System Log</h2>
            <div class="event-log">
              ${(game?.publicEvents ?? [])
                .slice(-16)
                .map((event) => `<p>${escapeHtml(event.message)}</p>`)
                .join("") || `<p class="muted">Waiting for players.</p>`}
            </div>
          </section>
        </section>
      </section>
    </main>
  `;
  startTimerLoop();
}

function renderStartButton(): string {
  if (!session || !room || room.status !== "lobby" || session.seatId !== room.hostSeatId) return "";
  const full = room.seats.every((seat) => seat.nickname);
  return `<button id="start-button" ${full ? "" : "disabled"}>Start game</button>`;
}

function renderHostTools(): string {
  if (!session || !room || session.seatId !== room.hostSeatId) return "";
  return `
    <section class="panel tools-panel">
      <h2>Room Tools</h2>
      <div class="tool-row">
        <button id="copy-link-button" class="secondary" type="button">Copy link</button>
        <button id="copy-watch-link-button" class="secondary" type="button">Watch link</button>
        <button id="diagnostics-button" class="secondary" type="button">Diagnostics</button>
        <button id="lock-button" class="secondary" type="button">${room.settings.locked ? "Unlock" : "Lock"}</button>
        <button id="spectators-button" class="secondary" type="button">${room.settings.spectatorsEnabled ? "Disable watch" : "Enable watch"}</button>
      </div>
      ${room.status !== "playing" ? `<button id="reset-button" type="button">Reset lobby</button>` : ""}
    </section>
  `;
}

function renderSeatHostActions(seat: SeatView): string {
  if (!session || !room || session.seatId !== room.hostSeatId || room.status !== "lobby" || !seat.nickname) return "";
  if (seat.seatId === room.hostSeatId) return "";
  return `
    <div class="seat-actions">
      <button type="button" class="mini secondary" data-kick-seat="${escapeHtml(seat.seatId)}">Kick</button>
      <button type="button" class="mini secondary" data-transfer-seat="${escapeHtml(seat.seatId)}">Host</button>
    </div>
  `;
}

function renderPrivatePanel(): string {
  if (!privateView) {
    return `<p class="muted">Your role appears when the game starts.</p>`;
  }
  const seerResults = Object.entries(privateView.seerResults)
    .map(([playerId, role]) => `<li>${escapeHtml(nameFor(playerId))}: ${escapeHtml(role)}</li>`)
    .join("");
  return `
    <div class="role-card">
      <strong data-testid="role">${escapeHtml(privateView.role)}</strong>
      <span>${privateView.alive ? "Alive" : "Dead"}</span>
    </div>
    ${
      privateView.werewolfTeammates.length
        ? `<p>Teammates: ${privateView.werewolfTeammates.map(nameFor).map(escapeHtml).join(", ")}</p>`
        : ""
    }
    ${seerResults ? `<ul>${seerResults}</ul>` : ""}
  `;
}

function renderActionPanel(): string {
  if (!room?.game || !privateView) {
    return `<p class="muted">The game begins after all 8 seats are occupied and the host starts.</p>`;
  }
  if (room.game.winner) {
    return `<div class="result">${escapeHtml(room.game.winner)} win.</div>`;
  }
  if (!privateView.alive) {
    return `<p class="muted">You are dead. You can watch the public state, but cannot act.</p>`;
  }
  if (privateView.legalActions.includes("submit_werewolf_target")) {
    return targetForm("night-form", "Choose a victim", privateView.legalTargets, "Submit");
  }
  if (privateView.legalActions.includes("submit_seer_target")) {
    return targetForm("night-form", "Inspect a player", privateView.legalTargets, "Inspect");
  }
  if (privateView.legalActions.includes("submit_witch_action")) {
    const victim = privateView.pendingWerewolfTarget;
    return `
      <form id="witch-form" class="action-form">
        <p>Victim: <strong>${victim ? escapeHtml(nameFor(victim)) : "None"}</strong></p>
        <label class="check"><input type="checkbox" name="save" ${privateView.witchPotions.saveAvailable && victim ? "" : "disabled"} /> Save victim</label>
        <label>Poison target
          <select name="poisonTargetId" ${privateView.witchPotions.poisonAvailable ? "" : "disabled"}>
            <option value="">No poison</option>
            ${privateView.legalTargets.map((id) => `<option value="${escapeHtml(id)}">${escapeHtml(nameFor(id))}</option>`).join("")}
          </select>
        </label>
        <button type="submit">Submit</button>
      </form>
    `;
  }
  if (privateView.legalActions.includes("submit_vote")) {
    return targetForm("vote-form", "Vote", ["abstain", ...privateView.legalTargets], "Vote");
  }
  return `<p class="muted">Waiting for the current phase to finish.</p>`;
}

function targetForm(id: string, label: string, targets: string[], button: string): string {
  return `
    <form id="${id}" class="action-form">
      <label>${escapeHtml(label)}
        <select name="targetId" required>
          ${targets.map((target) => `<option value="${escapeHtml(target)}">${escapeHtml(target === "abstain" ? "Abstain" : nameFor(target))}</option>`).join("")}
        </select>
      </label>
      <button type="submit">${escapeHtml(button)}</button>
    </form>
  `;
}

function bindAuthForms(): void {
  document.querySelector<HTMLFormElement>("#create-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const nickname = String(new FormData(form).get("nickname") ?? "");
    await runUiAction(async () => {
      const roomResponse = await fetch("/api/rooms", { method: "POST" });
      const created = (await roomResponse.json()) as { roomId: string };
      await joinRoom(created.roomId, nickname);
    });
  });
  document.querySelector<HTMLFormElement>("#join-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const data = new FormData(form);
    await runUiAction(() => joinRoom(String(data.get("roomId") ?? ""), String(data.get("nickname") ?? "")));
  });
}

function bindRoomActions(): void {
  document.querySelector<HTMLButtonElement>("#start-button")?.addEventListener("click", () => {
    send({ type: "start_game" });
  });
  document.querySelector<HTMLButtonElement>("#leave-button")?.addEventListener("click", () => {
    socket?.close();
    clearSession();
    connectionStatus = "offline";
    statusMessage = "";
    render();
  });
  document.querySelector<HTMLButtonElement>("#copy-link-button")?.addEventListener("click", () => {
    void copyRoomLink();
  });
  document.querySelector<HTMLButtonElement>("#copy-watch-link-button")?.addEventListener("click", () => {
    void copyWatchLink();
  });
  document.querySelector<HTMLButtonElement>("#diagnostics-button")?.addEventListener("click", () => {
    void loadDiagnostics();
  });
  document.querySelector<HTMLButtonElement>("#lock-button")?.addEventListener("click", () => {
    void hostControl(room?.settings.locked ? "unlock" : "lock");
  });
  document.querySelector<HTMLButtonElement>("#spectators-button")?.addEventListener("click", () => {
    void hostControl(room?.settings.spectatorsEnabled ? "disable-spectators" : "enable-spectators");
  });
  document.querySelector<HTMLButtonElement>("#reset-button")?.addEventListener("click", () => {
    void resetRoom();
  });
  document.querySelectorAll<HTMLButtonElement>("[data-kick-seat]").forEach((button) => {
    button.addEventListener("click", () => {
      void hostControl("kick", button.dataset.kickSeat);
    });
  });
  document.querySelectorAll<HTMLButtonElement>("[data-transfer-seat]").forEach((button) => {
    button.addEventListener("click", () => {
      void hostControl("transfer", button.dataset.transferSeat);
    });
  });
  document.querySelector<HTMLFormElement>("#night-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const targetId = String(new FormData(event.currentTarget as HTMLFormElement).get("targetId") ?? "");
    send({ type: "night_action", targetId });
  });
  document.querySelector<HTMLFormElement>("#witch-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget as HTMLFormElement);
    send({
      type: "night_action",
      save: data.get("save") === "on",
      poisonTargetId: String(data.get("poisonTargetId") ?? "") || undefined
    });
  });
  document.querySelector<HTMLFormElement>("#vote-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const targetId = String(new FormData(event.currentTarget as HTMLFormElement).get("targetId") ?? "abstain");
    send({ type: "vote", targetId });
  });
  document.querySelector<HTMLFormElement>("#chat-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const message = String(new FormData(form).get("message") ?? "");
    send({ type: "day_chat", message });
    form.reset();
  });
}

async function joinRoom(roomId: string, nickname: string): Promise<void> {
  const response = await fetch(`/api/rooms/${encodeURIComponent(roomId.trim())}/join`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ nickname })
  });
  const joined = (await response.json()) as { room: RoomView; seatId: string; token: string; error?: string };
  if (!response.ok) throw new Error(joined.error ?? "Join failed");
  session = { roomId: joined.room.roomId, seatId: joined.seatId, token: joined.token };
  saveSession(session);
  room = joined.room;
  statusMessage = "";
  openSocket();
  render();
}

async function reconnect(): Promise<void> {
  if (!session) return;
  connectionStatus = "connecting";
  const response = await fetch(`/api/rooms/${session.roomId}/reconnect`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ seatId: session.seatId, token: session.token })
  });
  if (!response.ok) {
    clearSession();
    connectionStatus = "offline";
    statusMessage = "Reconnect failed. Join the room again.";
    render();
    return;
  }
  const payload = (await response.json()) as { room: RoomView; privateView?: PrivateView };
  room = payload.room;
  privateView = payload.privateView;
  statusMessage = "";
  openSocket();
  render();
}

function openSocket(): void {
  if (!session || socket?.readyState === WebSocket.OPEN || socket?.readyState === WebSocket.CONNECTING) return;
  connectionStatus = connectionStatus === "connected" ? "reconnecting" : "connecting";
  renderSoon();
  void openSocketWithTicket().catch((error) => {
    connectionStatus = "reconnecting";
    statusMessage = error instanceof Error ? error.message : "Could not open connection.";
    render();
    window.setTimeout(() => openSocket(), 1500);
  });
}

async function openSpectator(): Promise<void> {
  connectionStatus = "connecting";
  render();
  try {
    const ticket = await createSpectatorTicket(spectatorRoomId);
    const protocol = location.protocol === "https:" ? "wss:" : "ws:";
    spectatorSocket = new WebSocket(
      `${protocol}//${location.host}/api/rooms/${spectatorRoomId}/spectator-socket?ticket=${encodeURIComponent(ticket)}`
    );
    spectatorSocket.addEventListener("message", (event) => {
      const payload = JSON.parse(String(event.data)) as { type: string; room?: RoomView; error?: string };
      if (payload.type === "error") {
        statusMessage = payload.error ?? "Spectator connection rejected.";
        render();
        return;
      }
      if (payload.type === "room_view" && payload.room) {
        room = payload.room;
        connectionStatus = "connected";
        statusMessage = "";
        render();
      }
    });
    spectatorSocket.addEventListener("close", () => {
      connectionStatus = "reconnecting";
      statusMessage = "Connection lost. Reconnecting...";
      render();
      window.setTimeout(() => void openSpectator(), 1500);
    });
    spectatorSocket.addEventListener("error", () => {
      connectionStatus = "reconnecting";
      statusMessage = "Connection error. Retrying...";
      render();
    });
  } catch (error) {
    connectionStatus = "offline";
    statusMessage = error instanceof Error ? error.message : "Could not watch room.";
    render();
  }
}

async function openSocketWithTicket(): Promise<void> {
  if (!session) return;
  const ticket = await createSocketTicket(session);
  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  socket = new WebSocket(
    `${protocol}//${location.host}/api/rooms/${session.roomId}/socket?ticket=${encodeURIComponent(ticket)}`
  );
  socket.addEventListener("message", (event) => {
    const payload = JSON.parse(String(event.data)) as {
      type: string;
      room?: RoomView;
      privateView?: PrivateView;
      error?: string;
    };
    if (payload.type === "error") {
      statusMessage = payload.error ?? "Server rejected that action.";
      render();
      return;
    }
    if (payload.type === "room_view" && payload.room) {
      room = payload.room;
      connectionStatus = "connected";
      statusMessage = "";
      render();
    }
    if (payload.type === "private_view" && payload.privateView) {
      privateView = payload.privateView;
      render();
    }
  });
  socket.addEventListener("close", () => {
    if (session) {
      connectionStatus = "reconnecting";
      statusMessage = "Connection lost. Reconnecting...";
      render();
    }
    window.setTimeout(() => openSocket(), 1500);
  });
  socket.addEventListener("error", () => {
    connectionStatus = "reconnecting";
    statusMessage = "Connection error. Retrying...";
    render();
  });
}

async function createSocketTicket(value: Session): Promise<string> {
  const response = await fetch(`/api/rooms/${value.roomId}/socket-ticket`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ seatId: value.seatId, token: value.token })
  });
  const payload = (await response.json()) as { ticket?: string; error?: string };
  if (!response.ok || !payload.ticket) {
    throw new Error(payload.error ?? "Could not create socket ticket");
  }
  return payload.ticket;
}

async function createSpectatorTicket(roomId: string): Promise<string> {
  const response = await fetch(`/api/rooms/${roomId}/spectator-ticket`, {
    method: "POST"
  });
  const payload = (await response.json()) as { ticket?: string; error?: string };
  if (!response.ok || !payload.ticket) {
    throw new Error(payload.error ?? "Could not create spectator ticket");
  }
  return payload.ticket;
}

async function resetRoom(): Promise<void> {
  const currentSession = session;
  if (!currentSession) return;
  await runUiAction(async () => {
    const response = await fetch(`/api/rooms/${currentSession.roomId}/host/reset-lobby`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ seatId: currentSession.seatId, token: currentSession.token })
    });
    const payload = (await response.json()) as RoomView & { error?: string };
    if (!response.ok) throw new Error(payload.error ?? "Reset failed");
    room = payload;
    privateView = undefined;
    statusMessage = "Room reset.";
    render();
  });
}

async function hostControl(action: string, targetSeatId?: string): Promise<void> {
  const currentSession = session;
  if (!currentSession) return;
  await runUiAction(async () => {
    const response = await fetch(`/api/rooms/${currentSession.roomId}/host/${action}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ seatId: currentSession.seatId, token: currentSession.token, targetSeatId })
    });
    const payload = (await response.json()) as RoomView & { error?: string };
    if (!response.ok) throw new Error(payload.error ?? "Host control failed");
    room = payload;
    statusMessage = "Room updated.";
    render();
  });
}

async function loadDiagnostics(): Promise<void> {
  const currentSession = session;
  if (!currentSession) return;
  await runUiAction(async () => {
    const response = await fetch(
      `/api/rooms/${currentSession.roomId}/diagnostics?seatId=${currentSession.seatId}&token=${currentSession.token}`
    );
    const payload = (await response.json()) as {
      status?: string;
      phase?: string;
      occupiedSeats?: number;
      connectedSeats?: number;
      activeSockets?: number;
      pendingSocketTickets?: number;
      error?: string;
    };
    if (!response.ok) throw new Error(payload.error ?? "Diagnostics failed");
    statusMessage = `Diagnostics: ${payload.status ?? "unknown"}${payload.phase ? `/${payload.phase}` : ""}, ${payload.occupiedSeats ?? 0} seats, ${payload.activeSockets ?? 0} sockets, ${payload.pendingSocketTickets ?? 0} tickets.`;
    render();
  });
}

async function copyRoomLink(): Promise<void> {
  if (!session) return;
  const link = `${location.origin}/room/${session.roomId}`;
  if (navigator.clipboard) {
    await navigator.clipboard.writeText(link);
  }
  statusMessage = "Room link copied.";
  render();
}

async function copyWatchLink(): Promise<void> {
  if (!session) return;
  const link = `${location.origin}/room/${session.roomId}/watch`;
  if (navigator.clipboard) {
    await navigator.clipboard.writeText(link);
  }
  statusMessage = "Watch link copied.";
  render();
}

function send(message: Record<string, unknown>): void {
  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
  } else {
    statusMessage = "Connection is not ready yet.";
    render();
  }
}

async function runUiAction(action: () => Promise<void>): Promise<void> {
  try {
    statusMessage = "";
    await action();
  } catch (error) {
    statusMessage = error instanceof Error ? error.message : "Action failed";
    render();
  }
}

function renderSoon(): void {
  window.setTimeout(() => render(), 0);
}

function loadSession(): Session | undefined {
  const saved = localStorage.getItem("miller-hollow:session");
  if (saved) return JSON.parse(saved) as Session;
  return undefined;
}

function saveSession(value: Session): void {
  localStorage.setItem("miller-hollow:session", JSON.stringify(value));
}

function clearSession(): void {
  localStorage.removeItem("miller-hollow:session");
  session = undefined;
  room = undefined;
  privateView = undefined;
  socket = undefined;
}

function nameFor(playerId: string): string {
  return room?.seats.find((seat) => seat.seatId === playerId)?.nickname ?? playerId;
}

function labelPhase(phase: Phase | undefined): string {
  const labels: Record<Phase, string> = {
    night_werewolves: "Werewolves",
    night_seer: "Seer",
    night_witch: "Witch",
    day_discussion: "Day Discussion",
    day_vote: "Day Vote",
    ended: "Game Over"
  };
  return phase ? labels[phase] : "Lobby";
}

function formatDeadline(deadline: number | undefined): string {
  if (!deadline) return "";
  const seconds = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
  return `${seconds}s`;
}

function startTimerLoop(): void {
  if (timerHandle) window.clearInterval(timerHandle);
  timerHandle = window.setInterval(() => {
    const timer = document.querySelector<HTMLDivElement>("#timer");
    if (timer) timer.textContent = formatDeadline(room?.currentDeadlineAt);
  }, 500);
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };
    return entities[char] as string;
  });
}
