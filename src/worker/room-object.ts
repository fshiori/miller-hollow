import {
  applyCommand,
  buildTimeoutCommand,
  createGame,
  getPublicPresetSummary,
  isBasicPresetId,
  mathRandomSource,
  validateCustomRoleSetup,
  toPrivatePlayerView,
  toPublicView,
  type CustomRoleSetup,
  type GameCommand,
  type GamePlayer,
  type PrivatePlayerView
} from "../engine";
import {
  createInitialRoomState,
  createPhaseInteraction,
  configureCustomRoom,
  getRoomPreset,
  normalizeRoomState,
  occupiedSeatCount,
  resizeSeatsForPreset,
  type HostMode,
  type RoomState
} from "./room-state";
import { createToken, hashToken } from "./tokens";
import type { Env } from "./env";

const PRODUCTION_PHASE_SECONDS: Record<string, number> = {
  thief_choice: 60,
  night_cupid: 60,
  night_werewolves: 90,
  night_seer: 60,
  night_witch: 90,
  day_discussion: 300,
  sheriff_election: 90,
  day_vote: 90,
  hunter_revenge: 60,
  sheriff_succession: 60
};

const SMOKE_PHASE_SECONDS: Record<string, number> = {
  thief_choice: 30,
  night_cupid: 30,
  night_werewolves: 45,
  night_seer: 35,
  night_witch: 45,
  day_discussion: 20,
  sheriff_election: 30,
  day_vote: 60,
  hunter_revenge: 30,
  sheriff_succession: 30
};

interface JoinRequest {
  nickname?: string;
}

interface TokenRequest {
  seatId?: string;
  token?: string;
}

interface HostSeatRequest extends TokenRequest {
  targetSeatId?: string;
}

interface InitializeRequest {
  presetId?: string;
  customRoleSetup?: CustomRoleSetup;
  hostMode?: HostMode;
}

interface ClientMessage {
  type?: string;
  targetId?: string;
  targetIds?: [string, string];
  save?: boolean;
  poisonTargetId?: string;
  role?: string;
  message?: string;
  ready?: boolean;
}

interface RateBucket {
  count: number;
  resetAt: number;
}

export class RoomObject implements DurableObject {
  private state: DurableObjectState;
  private env: Env;
  private sessions = new Map<WebSocket, string>();
  private spectatorSessions = new Set<WebSocket>();
  private observerSessions = new Set<WebSocket>();
  private rateBuckets = new Map<string, RateBucket>();

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const roomId = this.state.id.toString();

    if (request.method === "POST" && url.pathname.endsWith("/join")) {
      return this.join(roomId, request);
    }

    if (request.method === "POST" && url.pathname.endsWith("/initialize")) {
      return this.initialize(roomId, request);
    }

    if (request.method === "POST" && url.pathname.endsWith("/reconnect")) {
      return this.reconnect(roomId, request);
    }

    if (request.method === "POST" && url.pathname.endsWith("/start")) {
      return this.start(request);
    }

    if (request.method === "POST" && url.pathname.endsWith("/reset")) {
      return this.reset(request);
    }

    if (request.method === "POST" && url.pathname.endsWith("/spectator-ticket")) {
      return this.createSpectatorTicket();
    }

    if (request.method === "POST" && url.pathname.endsWith("/observer-ticket")) {
      return this.createObserverTicket(request);
    }

    if (request.method === "POST" && url.pathname.includes("/host/")) {
      return this.hostControl(request);
    }

    if (request.method === "POST" && url.pathname.endsWith("/socket-ticket")) {
      return this.createSocketTicket(request);
    }

    if (request.method === "GET" && url.pathname.endsWith("/state")) {
      const room = await this.loadRoom(roomId);
      return json(this.publicRoomView(room));
    }

    if (request.method === "GET" && url.pathname.endsWith("/private")) {
      return this.privateView(request);
    }

    if (request.method === "GET" && url.pathname.endsWith("/observer-state")) {
      return this.observerState(request);
    }

    if (request.method === "GET" && url.pathname.endsWith("/diagnostics")) {
      return this.diagnostics(request);
    }

    if (request.method === "GET" && url.pathname.endsWith("/socket")) {
      return this.openSocket(request);
    }

    if (request.method === "GET" && url.pathname.endsWith("/spectator-socket")) {
      return this.openSpectatorSocket(request);
    }

    if (request.method === "GET" && url.pathname.endsWith("/observer-socket")) {
      return this.openObserverSocket(request);
    }

    return json({ error: "Not found" }, 404);
  }

  async alarm(): Promise<void> {
    const room = await this.loadRoom(this.state.id.toString());
    if (!room.game || room.status !== "playing" || room.game.phase === "ended") {
      return;
    }
    if (!room.currentDeadlineAt || Date.now() < room.currentDeadlineAt) {
      return;
    }

    const command = this.phaseAdvanceCommand(room);
    room.game = applyCommand(room.game, command).state;
    this.afterGameMutation(room);
    await this.saveRoom(room);
    await this.broadcastRoom(room);
  }

  private async join(roomId: string, request: Request): Promise<Response> {
    const body = (await request.json().catch(() => ({}))) as JoinRequest;
    const nickname = body.nickname?.trim();
    if (!nickname) {
      return json({ error: "Nickname is required" }, 400);
    }

    const room = await this.loadRoom(roomId);
    if (room.settings.locked) {
      return json({ error: "Room is locked" }, 409);
    }
    if (room.status !== "lobby") {
      return json({ error: "Game has already started" }, 409);
    }
    const seat = room.seats.find((candidate) => !candidate.nickname);
    if (!seat) {
      return json({ error: "Room is full" }, 409);
    }

    const token = createToken();
    seat.nickname = nickname.slice(0, 32);
    seat.connectionStatus = "connected";
    seat.lastSeenAt = Date.now();
    seat.playerTokenHash = await hashToken(token);
    seat.ready = false;
    delete seat.readyAt;
    if (room.settings.hostMode === "player_host") {
      room.hostSeatId ??= seat.seatId;
    }
    room.updatedAt = Date.now();
    await this.saveRoom(room);
    this.logRoomEvent(room, "seat_joined", { seatId: seat.seatId, occupiedSeats: room.seats.filter((candidate) => candidate.nickname).length });
    await this.broadcastRoom(room);

    return json({
      room: this.publicRoomView(room),
      seatId: seat.seatId,
      token
    });
  }

  private async reconnect(roomId: string, request: Request): Promise<Response> {
    const body = (await request.json().catch(() => ({}))) as TokenRequest;
    const room = await this.loadRoom(roomId);
    const seat = await this.authenticate(room, body.seatId, body.token);
    if (!seat) {
      return json({ error: "Invalid reconnect token" }, 403);
    }
    seat.connectionStatus = "connected";
    seat.lastSeenAt = Date.now();
    room.updatedAt = Date.now();
    await this.saveRoom(room);
    await this.broadcastRoom(room);
    return json({
      room: this.publicRoomView(room),
      privateView: this.privatePlayerView(room, seat.seatId),
      seatId: seat.seatId
    });
  }

  private async start(request: Request): Promise<Response> {
    const body = (await request.json().catch(() => ({}))) as TokenRequest;
    const room = await this.loadRoom(this.state.id.toString());
    if (room.status !== "lobby") {
      return json({ error: "Game has already started" }, 409);
    }
    const host = await this.authenticateHost(room, body.seatId, body.token);
    if (!host) {
      return json({ error: "Only the host can start" }, 403);
    }
    if (occupiedSeatCount(room) !== room.settings.playerCount || room.seats.some((seat) => !seat.nickname)) {
      return json({ error: "Room is not full" }, 409);
    }
    if (room.seats.some((seat) => !seat.ready)) {
      return json({ error: "All players must be ready" }, 409);
    }

    this.startGame(room);
    await this.saveRoom(room);
    await this.broadcastRoom(room);
    return json(this.publicRoomView(room));
  }

  private async hostControl(request: Request): Promise<Response> {
    const body = (await request.json().catch(() => ({}))) as HostSeatRequest;
    const url = new URL(request.url);
    const action = url.pathname.split("/").slice(-1)[0];
    const room = await this.loadRoom(this.state.id.toString());
    const host = await this.authenticateHost(room, body.seatId, body.token);
    if (!host) {
      return json({ error: "Only the host can use room controls" }, 403);
    }

    try {
      if (action === "enable-spectators") {
        room.settings.spectatorsEnabled = true;
      } else if (action === "disable-spectators") {
        room.settings.spectatorsEnabled = false;
        this.disconnectSpectators("Spectators disabled by host");
      } else if (action === "lock") {
        this.assertLobby(room);
        room.settings.locked = true;
      } else if (action === "unlock") {
        this.assertLobby(room);
        room.settings.locked = false;
      } else if (action === "kick") {
        this.assertLobby(room);
        this.kickSeat(room, body.targetSeatId);
      } else if (action === "transfer") {
        this.assertLobby(room);
        if (room.settings.hostMode === "dedicated_host") {
          throw new Error("Dedicated host rooms cannot transfer host to a player");
        }
        this.transferHost(room, body.targetSeatId);
        room.observerTickets = {};
        this.disconnectObservers("Host changed. Host observer closed.");
      } else if (action === "advance-phase") {
        this.advancePhase(room);
        this.afterGameMutation(room);
      } else if (action === "open-sheriff-election") {
        if (!room.game || room.status !== "playing") {
          throw new Error("Game has not started");
        }
        room.game = applyCommand(room.game, { type: "open_sheriff_election", actorId: host.seatId }).state;
        this.afterGameMutation(room);
      } else if (action === "reset-lobby") {
        if (room.status === "playing") {
          return json({ error: "Playing games cannot be reset" }, 409);
        }
        this.resetLobby(room);
        await this.state.storage.deleteAlarm();
      } else {
        return json({ error: "Unknown host control" }, 404);
      }
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : "Host control failed" }, 409);
    }

    room.updatedAt = Date.now();
    await this.saveRoom(room);
    this.logRoomEvent(room, "host_control", { action, hostSeatId: host.seatId });
    await this.broadcastRoom(room);
    return json(this.publicRoomView(room));
  }

  private async initialize(roomId: string, request: Request): Promise<Response> {
    const body = (await request.json().catch(() => ({}))) as InitializeRequest;
    const room = await this.loadRoom(roomId);
    if (room.status !== "lobby" || occupiedSeatCount(room) > 0) {
      return json({ error: "Room is already open" }, 409);
    }
    room.settings.hostMode = body.hostMode === "dedicated_host" ? "dedicated_host" : "player_host";
    let hostToken: string | undefined;
    if (room.settings.hostMode === "dedicated_host" && !room.hostTokenHash) {
      hostToken = createToken();
      room.hostTokenHash = await hashToken(hostToken);
    }
    if (!isBasicPresetId(body.presetId)) {
      if (body.customRoleSetup) {
        try {
          validateCustomRoleSetup(body.customRoleSetup);
          configureCustomRoom(room, body.customRoleSetup);
        } catch (error) {
          return json({ error: error instanceof Error ? error.message : "Invalid custom role setup" }, 400);
        }
        room.updatedAt = Date.now();
        await this.saveRoom(room);
        this.logRoomEvent(room, "room_initialized", { presetId: "custom_roleflow" });
        return json({ room: this.publicRoomView(room), ...(hostToken ? { hostToken } : {}) });
      }
      return json({ error: "Unsupported preset" }, 400);
    }
    resizeSeatsForPreset(room, body.presetId);
    room.updatedAt = Date.now();
    await this.saveRoom(room);
    this.logRoomEvent(room, "room_initialized", { presetId: body.presetId });
    return json({ room: this.publicRoomView(room), ...(hostToken ? { hostToken } : {}) });
  }

  private async reset(request: Request): Promise<Response> {
    const body = (await request.json().catch(() => ({}))) as TokenRequest;
    const room = await this.loadRoom(this.state.id.toString());
    const host = await this.authenticateHost(room, body.seatId, body.token);
    if (!host) {
      return json({ error: "Only the host can reset" }, 403);
    }
    if (room.status === "playing") {
      return json({ error: "Playing games cannot be reset" }, 409);
    }

    room.status = "lobby";
    delete room.game;
    delete room.currentDeadlineAt;
    room.chatMessages = [];
    room.phaseInteraction = createPhaseInteraction();
    room.socketTickets = {};
    room.spectatorTickets = {};
    room.observerTickets = {};
    this.disconnectObservers("Room reset by host");
    for (const seat of room.seats) {
      seat.ready = false;
      delete seat.readyAt;
    }
    room.updatedAt = Date.now();
    await this.state.storage.deleteAlarm();
    await this.saveRoom(room);
    this.logRoomEvent(room, "room_reset", { occupiedSeats: room.seats.filter((seat) => seat.nickname).length });
    await this.broadcastRoom(room);
    return json(this.publicRoomView(room));
  }

  private async privateView(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const room = await this.loadRoom(this.state.id.toString());
    const seat = await this.authenticate(room, url.searchParams.get("seatId"), url.searchParams.get("token"));
    if (!seat) {
      return json({ error: "Invalid token" }, 403);
    }
    return json({
      privateView: this.privatePlayerView(room, seat.seatId)
    });
  }

  private async observerState(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const room = await this.loadRoom(this.state.id.toString());
    if (room.settings.hostMode !== "dedicated_host") {
      return json({ error: "Player-host rooms cannot reveal hidden information" }, 403);
    }
    const host = await this.authenticateHost(room, url.searchParams.get("seatId"), url.searchParams.get("token"));
    if (!host) {
      return json({ error: "Only the host can open host observer" }, 403);
    }
    return json({
      room: this.observerRoomView(room)
    });
  }

  private async diagnostics(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const room = await this.loadRoom(this.state.id.toString());
    const host = await this.authenticateHost(room, url.searchParams.get("seatId"), url.searchParams.get("token"));
    if (!host) {
      return json({ error: "Only the host can read diagnostics" }, 403);
    }

    return json({
      roomId: room.roomId,
      status: room.status,
      phase: room.game?.phase,
      round: room.game?.round,
      winner: room.game?.winner,
      occupiedSeats: room.seats.filter((candidate) => candidate.nickname).length,
      connectedSeats: room.seats.filter((candidate) => candidate.connectionStatus === "connected").length,
      activeSockets: this.sessions.size,
      activeSpectators: this.spectatorSessions.size,
      activeObservers: this.observerSessions.size,
      pendingSocketTickets: Object.keys(room.socketTickets).length,
      chatMessages: room.chatMessages.length,
      settings: {
        hostMode: room.settings.hostMode,
        locked: room.settings.locked,
        spectatorsEnabled: room.settings.spectatorsEnabled
      },
      currentDeadlineAt: room.currentDeadlineAt,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt
    });
  }

  private async createSocketTicket(request: Request): Promise<Response> {
    const body = (await request.json().catch(() => ({}))) as TokenRequest;
    const room = await this.loadRoom(this.state.id.toString());
    const seat = await this.authenticate(room, body.seatId, body.token);
    if (!seat) {
      return json({ error: "Invalid token" }, 403);
    }
    if (!this.takeRateLimit(`ticket:${seat.seatId}`, 20, 60_000)) {
      return json({ error: "Too many socket tickets. Try again soon." }, 429);
    }

    const ticket = createToken();
    const ticketHash = await hashToken(ticket);
    this.pruneExpiredSocketTickets(room);
    room.socketTickets[ticketHash] = {
      seatId: seat.seatId,
      expiresAt: Date.now() + 30_000
    };
    room.updatedAt = Date.now();
    await this.saveRoom(room);
    return json({
      ticket,
      expiresAt: room.socketTickets[ticketHash]?.expiresAt
    });
  }

  private async createSpectatorTicket(): Promise<Response> {
    const room = await this.loadRoom(this.state.id.toString());
    if (!room.settings.spectatorsEnabled) {
      return json({ error: "Spectators are disabled" }, 403);
    }
    if (!this.takeRateLimit("spectator-ticket", 60, 60_000)) {
      return json({ error: "Too many spectator tickets. Try again soon." }, 429);
    }

    const ticket = createToken();
    const ticketHash = await hashToken(ticket);
    this.pruneExpiredSpectatorTickets(room);
    room.spectatorTickets[ticketHash] = {
      expiresAt: Date.now() + 30_000
    };
    room.updatedAt = Date.now();
    await this.saveRoom(room);
    return json({
      ticket,
      expiresAt: room.spectatorTickets[ticketHash]?.expiresAt
    });
  }

  private async createObserverTicket(request: Request): Promise<Response> {
    const body = (await request.json().catch(() => ({}))) as TokenRequest;
    const room = await this.loadRoom(this.state.id.toString());
    if (room.settings.hostMode !== "dedicated_host") {
      return json({ error: "Player-host rooms cannot reveal hidden information" }, 403);
    }
    const host = await this.authenticateHost(room, body.seatId, body.token);
    if (!host) {
      return json({ error: "Only the host can open host observer" }, 403);
    }
    if (!this.takeRateLimit(`observer-ticket:${host.seatId}`, 20, 60_000)) {
      return json({ error: "Too many observer tickets. Try again soon." }, 429);
    }

    const ticket = createToken();
    const ticketHash = await hashToken(ticket);
    this.pruneExpiredObserverTickets(room);
    room.observerTickets[ticketHash] = {
      expiresAt: Date.now() + 30_000
    };
    room.updatedAt = Date.now();
    await this.saveRoom(room);
    return json({
      ticket,
      expiresAt: room.observerTickets[ticketHash]?.expiresAt
    });
  }

  private async openSocket(request: Request): Promise<Response> {
    if (request.headers.get("upgrade") !== "websocket") {
      return json({ error: "Expected WebSocket upgrade" }, 426);
    }
    const url = new URL(request.url);
    const room = await this.loadRoom(this.state.id.toString());
    const seat = await this.authenticateSocketTicket(room, url.searchParams.get("ticket"));
    if (!seat) {
      return json({ error: "Invalid or expired socket ticket" }, 403);
    }

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    server.accept();
    this.sessions.set(server, seat.seatId);
    seat.connectionStatus = "connected";
    seat.lastSeenAt = Date.now();
    room.updatedAt = Date.now();
    await this.saveRoom(room);

    server.addEventListener("message", (event) => {
      void this.handleSocketMessage(server, String(event.data)).catch((error) => {
        this.send(server, { type: "error", error: error instanceof Error ? error.message : "Unknown error" });
      });
    });
    server.addEventListener("close", () => {
      void this.closeSocket(server);
    });
    server.addEventListener("error", () => {
      void this.closeSocket(server);
    });

    this.sendSeatViews(room, server, seat.seatId);
    await this.broadcastRoom(room);
    return new Response(null, { status: 101, webSocket: client });
  }

  private async openSpectatorSocket(request: Request): Promise<Response> {
    if (request.headers.get("upgrade") !== "websocket") {
      return json({ error: "Expected WebSocket upgrade" }, 426);
    }
    const url = new URL(request.url);
    const room = await this.loadRoom(this.state.id.toString());
    if (!room.settings.spectatorsEnabled) {
      return json({ error: "Spectators are disabled" }, 403);
    }
    const ok = await this.authenticateSpectatorTicket(room, url.searchParams.get("ticket"));
    if (!ok) {
      return json({ error: "Invalid or expired spectator ticket" }, 403);
    }

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    server.accept();
    this.spectatorSessions.add(server);
    await this.saveRoom(room);

    server.addEventListener("message", (event) => {
      const message = JSON.parse(String(event.data)) as ClientMessage;
      if (message.type === "ping") {
        this.send(server, { type: "pong" });
      } else {
        this.send(server, { type: "error", error: "Spectators cannot act" });
      }
    });
    server.addEventListener("close", () => {
      this.spectatorSessions.delete(server);
    });
    server.addEventListener("error", () => {
      this.spectatorSessions.delete(server);
    });

    this.send(server, { type: "room_view", room: this.publicRoomView(room) });
    await this.broadcastRoom(room);
    return new Response(null, { status: 101, webSocket: client });
  }

  private async openObserverSocket(request: Request): Promise<Response> {
    if (request.headers.get("upgrade") !== "websocket") {
      return json({ error: "Expected WebSocket upgrade" }, 426);
    }
    const url = new URL(request.url);
    const room = await this.loadRoom(this.state.id.toString());
    if (room.settings.hostMode !== "dedicated_host") {
      return json({ error: "Player-host rooms cannot reveal hidden information" }, 403);
    }
    const ok = await this.authenticateObserverTicket(room, url.searchParams.get("ticket"));
    if (!ok) {
      return json({ error: "Invalid or expired observer ticket" }, 403);
    }

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    server.accept();
    this.observerSessions.add(server);
    await this.saveRoom(room);

    server.addEventListener("message", (event) => {
      const message = JSON.parse(String(event.data)) as ClientMessage;
      if (message.type === "ping") {
        this.send(server, { type: "pong" });
      } else {
        this.send(server, { type: "error", error: "Host observers cannot act" });
      }
    });
    server.addEventListener("close", () => {
      this.observerSessions.delete(server);
    });
    server.addEventListener("error", () => {
      this.observerSessions.delete(server);
    });

    this.send(server, { type: "observer_view", room: this.observerRoomView(room) });
    await this.broadcastRoom(room);
    return new Response(null, { status: 101, webSocket: client });
  }

  private async handleSocketMessage(socket: WebSocket, raw: string): Promise<void> {
    const seatId = this.sessions.get(socket);
    if (!seatId) {
      this.send(socket, { type: "error", error: "Unauthenticated socket" });
      return;
    }
    const message = JSON.parse(raw) as ClientMessage;
    const room = await this.loadRoom(this.state.id.toString());
    const seat = room.seats.find((candidate) => candidate.seatId === seatId);
    if (!seat) {
      this.send(socket, { type: "error", error: "Unknown seat" });
      return;
    }

    if (message.type === "ping") {
      this.send(socket, { type: "pong" });
      return;
    }
    if (!this.takeRateLimit(`action:${seatId}`, 60, 60_000)) {
      this.send(socket, { type: "error", error: "Too many actions. Try again soon." });
      return;
    }
    if (message.type === "start_game") {
      await this.startFromSocket(room, seatId);
      return;
    }
    if (message.type === "set_ready") {
      await this.setReady(room, seatId, Boolean(message.ready));
      return;
    }
    if (message.type === "day_chat") {
      await this.addChat(room, seatId, String(message.message ?? ""));
      return;
    }
    if (message.type === "werewolf_chat") {
      await this.addWerewolfChat(room, seatId, String(message.message ?? ""));
      return;
    }
    if (message.type === "propose_werewolf_target") {
      await this.proposeWerewolfTarget(room, seatId, String(message.targetId ?? ""));
      return;
    }
    if (message.type === "set_werewolf_ready") {
      await this.setWerewolfReady(room, seatId, Boolean(message.ready));
      return;
    }
    if (message.type === "set_day_ready") {
      await this.setDayReady(room, seatId, Boolean(message.ready));
      return;
    }
    if (!room.game) {
      this.send(socket, { type: "error", error: "Game has not started" });
      return;
    }

    const command = this.messageToCommand(room, seatId, message);
    room.game = applyCommand(room.game, command).state;
    if (command.type === "submit_vote" || command.type === "submit_sheriff_vote") {
      this.resolveVoteIfComplete(room);
    }
    this.logRoomEvent(room, "player_action", { seatId, action: command.type, phase: room.game.phase });
    this.afterGameMutation(room);
    await this.saveRoom(room);
    await this.broadcastRoom(room);
  }

  private async startFromSocket(room: RoomState, seatId: string): Promise<void> {
    if (room.status !== "lobby") {
      throw new Error("Game has already started");
    }
    if (room.hostSeatId !== seatId) {
      throw new Error("Only the host can start");
    }
    if (occupiedSeatCount(room) !== room.settings.playerCount || room.seats.some((seat) => !seat.nickname)) {
      throw new Error("Room is not full");
    }
    if (room.seats.some((seat) => !seat.ready)) {
      throw new Error("All players must be ready");
    }
    this.startGame(room);
    await this.saveRoom(room);
    await this.broadcastRoom(room);
  }

  private startGame(room: RoomState): void {
    const players: GamePlayer[] = room.seats.map((seat) => ({
      id: seat.seatId,
      nickname: seat.nickname as string
    }));
    room.game = createGame(players, mathRandomSource, getRoomPreset(room));
    room.status = "playing";
    for (const seat of room.seats) {
      seat.ready = false;
      delete seat.readyAt;
    }
    this.afterGameMutation(room);
    this.logRoomEvent(room, "game_started", { occupiedSeats: room.seats.length, phase: room.game.phase });
  }

  private advancePhase(room: RoomState): void {
    if (!room.game || room.status !== "playing" || room.game.phase === "ended") {
      throw new Error("Only playing games can advance phases");
    }
    const command = this.phaseAdvanceCommand(room);
    room.game = applyCommand(room.game, command).state;
  }

  private async setReady(room: RoomState, seatId: string, ready: boolean): Promise<void> {
    if (room.status !== "lobby") {
      throw new Error("Ready is only available in the lobby");
    }
    const seat = room.seats.find((candidate) => candidate.seatId === seatId);
    if (!seat?.nickname) {
      throw new Error("Unknown seat");
    }
    seat.ready = ready;
    if (ready) {
      seat.readyAt = Date.now();
    } else {
      delete seat.readyAt;
    }
    room.updatedAt = Date.now();
    await this.saveRoom(room);
    this.logRoomEvent(room, "seat_ready_changed", { seatId, ready });
    await this.broadcastRoom(room);
  }

  private assertLobby(room: RoomState): void {
    if (room.status !== "lobby") {
      throw new Error("Only lobby rooms can use this control");
    }
  }

  private kickSeat(room: RoomState, targetSeatId: string | undefined): void {
    if (!targetSeatId) throw new Error("Target seat is required");
    if (targetSeatId === room.hostSeatId) throw new Error("Host cannot kick themselves");
    const seat = room.seats.find((candidate) => candidate.seatId === targetSeatId);
    if (!seat?.nickname) throw new Error("Target seat is empty");
    this.closePlayerSockets(targetSeatId, "Kicked by host");
    delete seat.nickname;
    delete seat.playerTokenHash;
    delete seat.lastSeenAt;
    seat.ready = false;
    delete seat.readyAt;
    seat.connectionStatus = "disconnected";
  }

  private transferHost(room: RoomState, targetSeatId: string | undefined): void {
    if (!targetSeatId) throw new Error("Target seat is required");
    const seat = room.seats.find((candidate) => candidate.seatId === targetSeatId);
    if (!seat?.nickname) throw new Error("Target seat is empty");
    room.hostSeatId = seat.seatId;
  }

  private resetLobby(room: RoomState): void {
    room.status = "lobby";
    delete room.game;
    delete room.currentDeadlineAt;
    room.chatMessages = [];
    room.phaseInteraction = createPhaseInteraction();
    room.socketTickets = {};
    room.spectatorTickets = {};
    room.observerTickets = {};
    this.disconnectObservers("Lobby reset by host");
    for (const seat of room.seats) {
      if (seat.seatId !== room.hostSeatId) {
        this.closePlayerSockets(seat.seatId, "Lobby reset by host");
        delete seat.nickname;
        delete seat.playerTokenHash;
        delete seat.lastSeenAt;
        seat.ready = false;
        delete seat.readyAt;
        seat.connectionStatus = "disconnected";
      }
    }
  }

  private messageToCommand(room: RoomState, seatId: string, message: ClientMessage): GameCommand {
    const game = room.game;
    if (!game) {
      throw new Error("Game has not started");
    }
    if (message.type === "night_action") {
      if (game.phase === "night_werewolves") {
        if (!message.targetId) throw new Error("Target is required");
        return { type: "submit_werewolf_target", actorId: seatId, targetId: message.targetId, source: "direct" };
      }
      if (game.phase === "night_seer") {
        return { type: "submit_seer_target", actorId: seatId, ...(message.targetId ? { targetId: message.targetId } : {}) };
      }
      if (game.phase === "night_witch") {
        return {
          type: "submit_witch_action",
          actorId: seatId,
          ...(message.save && game.nightActions.werewolfTarget ? { saveTargetId: game.nightActions.werewolfTarget } : {}),
          ...(message.poisonTargetId ? { poisonTargetId: message.poisonTargetId } : {})
        };
      }
    }
    if (message.type === "thief_choice") {
      if (!message.role) throw new Error("Thief role choice is required");
      return { type: "submit_thief_choice", actorId: seatId, role: message.role as import("../engine").Role };
    }
    if (message.type === "cupid_lovers") {
      if (!message.targetIds || message.targetIds.length !== 2) throw new Error("Cupid requires two targets");
      return { type: "submit_cupid_lovers", actorId: seatId, targetIds: [message.targetIds[0], message.targetIds[1]] };
    }
    if (message.type === "vote") {
      return { type: "submit_vote", actorId: seatId, targetId: message.targetId ?? "abstain" };
    }
    if (message.type === "sheriff_vote") {
      return { type: "submit_sheriff_vote", actorId: seatId, targetId: message.targetId ?? "abstain" };
    }
    if (message.type === "hunter_shot") {
      return { type: "submit_hunter_shot", actorId: seatId, ...(message.targetId ? { targetId: message.targetId } : {}) };
    }
    if (message.type === "sheriff_successor") {
      return { type: "submit_sheriff_successor", actorId: seatId, ...(message.targetId ? { targetId: message.targetId } : {}) };
    }
    throw new Error("Unsupported message type");
  }

  private async addChat(room: RoomState, seatId: string, message: string): Promise<void> {
    if (!room.game || room.game.phase !== "day_discussion") {
      throw new Error("Day chat is only available during discussion");
    }
    if (!room.game.alive[seatId]) {
      throw new Error("Dead players cannot send day chat");
    }
    const text = message.trim();
    if (!text) {
      return;
    }
    if (!this.takeRateLimit(`chat:${seatId}`, 12, 60_000)) {
      throw new Error("Too many chat messages. Try again soon.");
    }
    const seat = room.seats.find((candidate) => candidate.seatId === seatId);
    room.chatMessages.push({
      id: `${Date.now()}-${room.chatMessages.length}`,
      seatId,
      nickname: seat?.nickname ?? seatId,
      message: text.slice(0, 240),
      createdAt: Date.now()
    });
    room.updatedAt = Date.now();
    await this.saveRoom(room);
    await this.broadcastRoom(room);
  }

  private async addWerewolfChat(room: RoomState, seatId: string, message: string): Promise<void> {
    this.assertLivingWerewolfTurn(room, seatId);
    const text = message.trim();
    if (!text) {
      return;
    }
    if (!this.takeRateLimit(`wolf-chat:${seatId}`, 12, 60_000)) {
      throw new Error("Too many Werewolf chat messages. Try again soon.");
    }
    const seat = room.seats.find((candidate) => candidate.seatId === seatId);
    room.phaseInteraction.werewolfChat.push({
      id: `${Date.now()}-${room.phaseInteraction.werewolfChat.length}`,
      seatId,
      nickname: seat?.nickname ?? seatId,
      message: text.slice(0, 240),
      createdAt: Date.now()
    });
    room.phaseInteraction.werewolfChat = room.phaseInteraction.werewolfChat.slice(-40);
    room.updatedAt = Date.now();
    await this.saveRoom(room);
    await this.broadcastRoom(room);
  }

  private async proposeWerewolfTarget(room: RoomState, seatId: string, targetId: string): Promise<void> {
    this.assertLivingWerewolfTurn(room, seatId);
    if (!targetId) {
      throw new Error("Target is required");
    }
    if (!this.isLegalWerewolfTarget(room, targetId)) {
      throw new Error("Invalid werewolf target");
    }
    room.phaseInteraction.werewolfTargetId = targetId;
    room.phaseInteraction.werewolfReadySeatIds = [];
    room.updatedAt = Date.now();
    await this.saveRoom(room);
    await this.broadcastRoom(room);
  }

  private async setWerewolfReady(room: RoomState, seatId: string, ready: boolean): Promise<void> {
    this.assertLivingWerewolfTurn(room, seatId);
    const readySet = new Set(room.phaseInteraction.werewolfReadySeatIds);
    if (ready) {
      readySet.add(seatId);
    } else {
      readySet.delete(seatId);
    }
    room.phaseInteraction.werewolfReadySeatIds = [...readySet];
    const advanced = this.tryAdvanceWerewolves(room);
    if (advanced) {
      this.afterGameMutation(room);
    } else {
      room.updatedAt = Date.now();
    }
    await this.saveRoom(room);
    await this.broadcastRoom(room);
  }

  private async setDayReady(room: RoomState, seatId: string, ready: boolean): Promise<void> {
    if (!room.game || room.game.phase !== "day_discussion") {
      throw new Error("Day readiness is only available during discussion");
    }
    if (!room.game.alive[seatId]) {
      throw new Error("Dead players cannot ready during discussion");
    }
    const readySet = new Set(room.phaseInteraction.dayReadySeatIds);
    if (ready) {
      readySet.add(seatId);
    } else {
      readySet.delete(seatId);
    }
    room.phaseInteraction.dayReadySeatIds = [...readySet];
    const advanced = this.tryAdvanceDayDiscussion(room);
    if (advanced) {
      this.afterGameMutation(room);
    } else {
      room.updatedAt = Date.now();
    }
    await this.saveRoom(room);
    await this.broadcastRoom(room);
  }

  private async closeSocket(socket: WebSocket): Promise<void> {
    const seatId = this.sessions.get(socket);
    this.sessions.delete(socket);
    if (!seatId) {
      return;
    }
    if ([...this.sessions.values()].includes(seatId)) {
      return;
    }
    const room = await this.loadRoom(this.state.id.toString());
    const seat = room.seats.find((candidate) => candidate.seatId === seatId);
    if (seat) {
      seat.connectionStatus = "disconnected";
      seat.lastSeenAt = Date.now();
      room.updatedAt = Date.now();
      await this.saveRoom(room);
      await this.broadcastRoom(room);
    }
  }

  private afterGameMutation(room: RoomState): void {
    this.syncPhaseInteraction(room);
    if (!room.game || room.game.phase === "ended") {
      room.status = room.game?.phase === "ended" ? "ended" : room.status;
      delete room.currentDeadlineAt;
    } else {
      const seconds = this.phaseSeconds()[room.game.phase] ?? 60;
      room.currentDeadlineAt = Date.now() + seconds * 1000;
      void this.state.storage.setAlarm(room.currentDeadlineAt);
    }
    room.updatedAt = Date.now();
    if (room.game?.phase === "ended") {
      this.logRoomEvent(room, "game_ended", { winner: room.game.winner });
    }
  }

  private phaseSeconds(): Record<string, number> {
    return this.env.MILLER_HOLLOW_TIMER_PROFILE === "smoke" ? SMOKE_PHASE_SECONDS : PRODUCTION_PHASE_SECONDS;
  }

  private takeRateLimit(key: string, limit: number, windowMs: number): boolean {
    const now = Date.now();
    const existing = this.rateBuckets.get(key);
    if (!existing || existing.resetAt <= now) {
      this.rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
      this.pruneRateBuckets(now);
      return true;
    }
    if (existing.count >= limit) {
      return false;
    }
    existing.count += 1;
    return true;
  }

  private pruneRateBuckets(now: number): void {
    if (this.rateBuckets.size < 512) return;
    for (const [key, bucket] of this.rateBuckets) {
      if (bucket.resetAt <= now) this.rateBuckets.delete(key);
    }
  }

  private logRoomEvent(room: RoomState, event: string, detail: Record<string, unknown> = {}): void {
    console.info(
      JSON.stringify({
        service: "miller-hollow",
        event,
        roomId: room.roomId,
        status: room.status,
        phase: room.game?.phase,
        activeSockets: this.sessions.size,
        ...detail
      })
    );
  }

  private resolveVoteIfComplete(room: RoomState): void {
    if (!room.game || (room.game.phase !== "day_vote" && room.game.phase !== "sheriff_election")) {
      return;
    }
    const livingPlayerIds = room.game.players.filter((player) => room.game?.alive[player.id]).map((player) => player.id);
    const votes = room.game.phase === "day_vote" ? room.game.votes : room.game.sheriff.electionVotes;
    const allVoted = livingPlayerIds.every((playerId) => votes[playerId]);
    if (allVoted) {
      room.game = applyCommand(
        room.game,
        room.game.phase === "day_vote"
          ? { type: "resolve_vote", missingVotesAsAbstain: true }
          : { type: "resolve_sheriff_election", missingVotesAsAbstain: true }
      ).state;
    }
  }

  private phaseAdvanceCommand(room: RoomState): GameCommand {
    if (!room.game) {
      throw new Error("Game has not started");
    }
    if (room.game.phase === "day_discussion") {
      return { type: "advance_to_vote" };
    }
    if (room.game.phase === "day_vote") {
      return { type: "resolve_vote", missingVotesAsAbstain: true };
    }
    if (room.game.phase === "sheriff_election") {
      return { type: "resolve_sheriff_election", missingVotesAsAbstain: true };
    }
    if (room.game.phase === "night_werewolves") {
      const actorId = this.livingWerewolves(room)[0];
      const targetId = room.phaseInteraction.werewolfTargetId;
      if (actorId && targetId && this.isLegalWerewolfTarget(room, targetId)) {
        return { type: "submit_werewolf_target", actorId, targetId, source: "proposal" };
      }
    }
    return buildTimeoutCommand(room.game, mathRandomSource);
  }

  private tryAdvanceWerewolves(room: RoomState): boolean {
    if (!room.game || room.game.phase !== "night_werewolves") {
      return false;
    }
    const livingWerewolves = this.livingWerewolves(room);
    const targetId = room.phaseInteraction.werewolfTargetId;
    if (!livingWerewolves.length || !targetId || !this.isLegalWerewolfTarget(room, targetId)) {
      return false;
    }
    const ready = new Set(room.phaseInteraction.werewolfReadySeatIds);
    if (!livingWerewolves.every((playerId) => ready.has(playerId))) {
      return false;
    }
    room.game = applyCommand(room.game, { type: "submit_werewolf_target", actorId: livingWerewolves[0] as string, targetId, source: "proposal" }).state;
    this.logRoomEvent(room, "werewolf_target_confirmed", { targetId, readyCount: livingWerewolves.length });
    return true;
  }

  private tryAdvanceDayDiscussion(room: RoomState): boolean {
    if (!room.game || room.game.phase !== "day_discussion") {
      return false;
    }
    const living = this.livingPlayers(room);
    const ready = new Set(room.phaseInteraction.dayReadySeatIds);
    if (!living.length || !living.every((playerId) => ready.has(playerId))) {
      return false;
    }
    room.game = applyCommand(room.game, { type: "advance_to_vote" }).state;
    this.logRoomEvent(room, "day_discussion_ready", { readyCount: living.length });
    return true;
  }

  private assertLivingWerewolfTurn(room: RoomState, seatId: string): void {
    if (!room.game || room.game.phase !== "night_werewolves") {
      throw new Error("Werewolf chat is only available during Werewolf night");
    }
    if (!room.game.alive[seatId] || room.game.roles[seatId] !== "werewolf") {
      throw new Error("Werewolf chat is only available to living Werewolves");
    }
  }

  private isLegalWerewolfTarget(room: RoomState, targetId: string): boolean {
    return Boolean(room.game?.alive[targetId] && room.game.roles[targetId] !== "werewolf");
  }

  private livingWerewolves(room: RoomState): string[] {
    if (!room.game) return [];
    return room.game.players.filter((player) => room.game?.alive[player.id] && room.game.roles[player.id] === "werewolf").map((player) => player.id);
  }

  private livingPlayers(room: RoomState): string[] {
    if (!room.game) return [];
    return room.game.players.filter((player) => room.game?.alive[player.id]).map((player) => player.id);
  }

  private syncPhaseInteraction(room: RoomState): void {
    const phase = room.game?.phase === "ended" ? undefined : room.game?.phase;
    if (room.phaseInteraction.phase !== phase) {
      room.phaseInteraction = createPhaseInteraction(phase);
    }
    if (!room.game) return;
    const livingSet = new Set(this.livingPlayers(room));
    const livingWerewolfSet = new Set(this.livingWerewolves(room));
    room.phaseInteraction.dayReadySeatIds = room.phaseInteraction.dayReadySeatIds.filter((seatId) => livingSet.has(seatId));
    room.phaseInteraction.werewolfReadySeatIds = room.phaseInteraction.werewolfReadySeatIds.filter((seatId) => livingWerewolfSet.has(seatId));
    if (room.phaseInteraction.werewolfTargetId && !this.isLegalWerewolfTarget(room, room.phaseInteraction.werewolfTargetId)) {
      delete room.phaseInteraction.werewolfTargetId;
      room.phaseInteraction.werewolfReadySeatIds = [];
    }
  }

  private async authenticate(room: RoomState, seatId: string | null | undefined, token: string | null | undefined) {
    if (!seatId || !token) {
      return undefined;
    }
    const seat = room.seats.find((candidate) => candidate.seatId === seatId);
    if (!seat?.playerTokenHash) {
      return undefined;
    }
    return (await hashToken(token)) === seat.playerTokenHash ? seat : undefined;
  }

  private async authenticateHost(room: RoomState, seatId: string | null | undefined, token: string | null | undefined) {
    if (room.settings.hostMode === "dedicated_host") {
      if (!token || !room.hostTokenHash) {
        return undefined;
      }
      return (await hashToken(token)) === room.hostTokenHash ? { seatId: "dedicated-host" } : undefined;
    }
    const seat = await this.authenticate(room, seatId, token);
    return seat?.seatId === room.hostSeatId ? seat : undefined;
  }

  private async authenticateSocketTicket(room: RoomState, ticket: string | null | undefined) {
    if (!ticket) {
      return undefined;
    }
    this.pruneExpiredSocketTickets(room);
    const ticketHash = await hashToken(ticket);
    const socketTicket = room.socketTickets[ticketHash];
    if (!socketTicket) {
      return undefined;
    }
    delete room.socketTickets[ticketHash];
    if (Date.now() > socketTicket.expiresAt) {
      return undefined;
    }
    return room.seats.find((candidate) => candidate.seatId === socketTicket.seatId);
  }

  private async authenticateSpectatorTicket(room: RoomState, ticket: string | null | undefined): Promise<boolean> {
    if (!ticket) {
      return false;
    }
    this.pruneExpiredSpectatorTickets(room);
    const ticketHash = await hashToken(ticket);
    const spectatorTicket = room.spectatorTickets[ticketHash];
    if (!spectatorTicket) {
      return false;
    }
    delete room.spectatorTickets[ticketHash];
    return Date.now() <= spectatorTicket.expiresAt;
  }

  private async authenticateObserverTicket(room: RoomState, ticket: string | null | undefined): Promise<boolean> {
    if (!ticket) {
      return false;
    }
    this.pruneExpiredObserverTickets(room);
    const ticketHash = await hashToken(ticket);
    const observerTicket = room.observerTickets[ticketHash];
    if (!observerTicket) {
      return false;
    }
    delete room.observerTickets[ticketHash];
    return Date.now() <= observerTicket.expiresAt;
  }

  private pruneExpiredSocketTickets(room: RoomState): void {
    const now = Date.now();
    for (const [ticketHash, ticket] of Object.entries(room.socketTickets)) {
      if (ticket.expiresAt <= now) {
        delete room.socketTickets[ticketHash];
      }
    }
  }

  private pruneExpiredSpectatorTickets(room: RoomState): void {
    const now = Date.now();
    for (const [ticketHash, ticket] of Object.entries(room.spectatorTickets)) {
      if (ticket.expiresAt <= now) {
        delete room.spectatorTickets[ticketHash];
      }
    }
  }

  private pruneExpiredObserverTickets(room: RoomState): void {
    const now = Date.now();
    for (const [ticketHash, ticket] of Object.entries(room.observerTickets)) {
      if (ticket.expiresAt <= now) {
        delete room.observerTickets[ticketHash];
      }
    }
  }

  private async loadRoom(roomId: string): Promise<RoomState> {
    const stored = await this.state.storage.get<RoomState>("room");
    if (stored) {
      const room = normalizeRoomState(stored);
      this.syncPhaseInteraction(room);
      return room;
    }
    const room = createInitialRoomState(roomId, Date.now());
    await this.saveRoom(room);
    return room;
  }

  private async saveRoom(room: RoomState): Promise<void> {
    await this.state.storage.put("room", room);
  }

  private async broadcastRoom(room: RoomState): Promise<void> {
    for (const [socket, seatId] of this.sessions) {
      this.sendSeatViews(room, socket, seatId);
    }
    for (const socket of this.spectatorSessions) {
      this.send(socket, { type: "room_view", room: this.publicRoomView(room) });
    }
    if (room.settings.hostMode !== "dedicated_host") {
      this.disconnectObservers("Player-host rooms cannot reveal hidden information");
    } else {
      for (const socket of this.observerSessions) {
        this.send(socket, { type: "observer_view", room: this.observerRoomView(room) });
      }
    }
  }

  private sendSeatViews(room: RoomState, socket: WebSocket, seatId: string): void {
    this.send(socket, { type: "room_view", room: this.publicRoomView(room) });
    if (room.game) {
      this.send(socket, {
        type: "private_view",
        privateView: this.privatePlayerView(room, seatId)
      });
    }
  }

  private send(socket: WebSocket, payload: unknown): void {
    try {
      socket.send(JSON.stringify(payload));
    } catch {
      this.sessions.delete(socket);
      this.spectatorSessions.delete(socket);
      this.observerSessions.delete(socket);
    }
  }

  private closePlayerSockets(seatId: string, reason: string): void {
    for (const [socket, socketSeatId] of this.sessions) {
      if (socketSeatId === seatId) {
        this.send(socket, { type: "error", error: reason });
        socket.close();
        this.sessions.delete(socket);
      }
    }
  }

  private disconnectSpectators(reason: string): void {
    for (const socket of this.spectatorSessions) {
      this.send(socket, { type: "error", error: reason });
      socket.close();
    }
    this.spectatorSessions.clear();
  }

  private disconnectObservers(reason: string): void {
    for (const socket of this.observerSessions) {
      this.send(socket, { type: "error", error: reason });
      socket.close();
    }
    this.observerSessions.clear();
  }

  private publicRoomView(room: RoomState) {
    const preset = getRoomPreset(room);
    return {
      roomId: room.roomId,
      status: room.status,
      settings: room.settings,
      preset: getPublicPresetSummary(preset),
      hostSeatId: room.hostSeatId,
      seats: room.seats.map((seat) => ({
        seatId: seat.seatId,
        nickname: seat.nickname,
        controller: seat.controller,
        connectionStatus: seat.connectionStatus,
        lastSeenAt: seat.lastSeenAt,
        ready: seat.ready ?? false,
        readyAt: seat.readyAt
      })),
      game: room.game ? toPublicView(room.game) : undefined,
      phaseInteraction: this.publicPhaseInteractionView(room),
      chatMessages: room.chatMessages,
      currentDeadlineAt: room.currentDeadlineAt,
      startEligibility: this.startEligibility(room),
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
      activeSpectators: this.spectatorSessions.size
    };
  }

  private observerRoomView(room: RoomState) {
    const publicView = this.publicRoomView(room);
    const game = room.game;
    const livingPlayerIds = game?.players.filter((player) => game.alive[player.id]).map((player) => player.id) ?? [];
    const votes = game?.phase === "day_vote" ? game.votes : {};
    const sheriffElectionVotes = game?.phase === "sheriff_election" ? game.sheriff.electionVotes : {};
    return {
      ...publicView,
      activeObservers: this.observerSessions.size,
      observer: {
        players:
          game?.players.map((player) => ({
            id: player.id,
            nickname: player.nickname,
            role: game.roles[player.id],
            alive: game.alive[player.id] ?? false,
            connectionStatus: room.seats.find((seat) => seat.seatId === player.id)?.connectionStatus ?? "disconnected",
            isHost: player.id === room.hostSeatId
          })) ?? [],
        phaseInteraction: {
          phase: room.phaseInteraction.phase,
          werewolfChat: room.phaseInteraction.werewolfChat,
          werewolfTargetId: room.phaseInteraction.werewolfTargetId,
          werewolfReadySeatIds: room.phaseInteraction.werewolfReadySeatIds,
          dayReadySeatIds: room.phaseInteraction.dayReadySeatIds
        },
        nightActions: game
          ? {
              werewolfTarget: game.nightActions.werewolfTarget,
              werewolfTargetSource: game.nightActions.werewolfTargetSource,
              seerSkipped: game.nightActions.seerSkipped,
              witchSavedTarget: game.nightActions.witchSavedTarget,
              witchPoisonTarget: game.nightActions.witchPoisonTarget
            }
          : undefined,
        seerResults: game?.nightActions.seerViews ?? {},
        thief: game?.thief,
        lovers: game?.lovers,
        sheriff: game
          ? {
              holderId: game.sheriff.holderId,
              electionVotes: sheriffElectionVotes,
              missingElectionVoterIds:
                game.phase === "sheriff_election" ? livingPlayerIds.filter((playerId) => !sheriffElectionVotes[playerId]) : [],
              successionFromId: game.sheriff.successionFromId,
              electionCount: game.sheriff.electionCount
            }
          : undefined,
        pendingReactions: game?.pendingReactions ?? [],
        witch: game
          ? {
              saveAvailable: game.witchSaveAvailable,
              poisonAvailable: game.witchPoisonAvailable
            }
          : undefined,
        votes,
        missingVoterIds: game?.phase === "day_vote" ? livingPlayerIds.filter((playerId) => !votes[playerId]) : [],
        voteTally: this.voteTally(game, votes)
      }
    };
  }

  private voteTally(game: RoomState["game"], votes: Record<string, string>): Record<string, number> {
    return Object.entries(votes).reduce<Record<string, number>>((counts, [voterId, targetId]) => {
      const weight = game?.sheriff.holderId === voterId ? 2 : 1;
      counts[targetId] = (counts[targetId] ?? 0) + weight;
      return counts;
    }, {});
  }

  private startEligibility(room: RoomState) {
    const occupiedSeats = room.seats.filter((seat) => seat.nickname).length;
    const readySeats = room.seats.filter((seat) => seat.nickname && seat.ready).length;
    const requiredSeats = room.settings.playerCount;
    if (room.status !== "lobby") {
      return { canStart: false, occupiedSeats, readySeats, requiredSeats, blockedReason: "Game already started" };
    }
    if (occupiedSeats < requiredSeats) {
      return { canStart: false, occupiedSeats, readySeats, requiredSeats, blockedReason: "Waiting for players" };
    }
    if (readySeats < requiredSeats) {
      return { canStart: false, occupiedSeats, readySeats, requiredSeats, blockedReason: "Waiting for ready players" };
    }
    return { canStart: true, occupiedSeats, readySeats, requiredSeats };
  }

  private privatePlayerView(room: RoomState, seatId: string): (PrivatePlayerView & { phaseInteraction?: unknown }) | undefined {
    if (!room.game) {
      return undefined;
    }
    const view = toPrivatePlayerView(room.game, seatId);
    const living = this.livingPlayers(room);
    const wolfCount = this.livingWerewolves(room).length;
    return {
      ...view,
      phaseInteraction: {
        ...(view.role === "werewolf" && view.alive && room.game.phase === "night_werewolves"
          ? {
              werewolfChat: room.phaseInteraction.werewolfChat,
              werewolfTargetId: room.phaseInteraction.werewolfTargetId,
              werewolfReadySeatIds: room.phaseInteraction.werewolfReadySeatIds,
              werewolfReadyCount: room.phaseInteraction.werewolfReadySeatIds.length,
              werewolfReadyRequired: wolfCount
            }
          : {}),
        ...(view.alive && room.game.phase === "day_discussion"
          ? {
              dayReadySeatIds: room.phaseInteraction.dayReadySeatIds,
              dayReadyCount: room.phaseInteraction.dayReadySeatIds.length,
              dayReadyRequired: living.length
            }
          : {})
      }
    };
  }

  private publicPhaseInteractionView(room: RoomState) {
    if (!room.game || room.game.phase === "ended") {
      return undefined;
    }
    if (room.game.phase === "night_werewolves") {
      return {
        phase: room.game.phase,
        werewolfReadyCount: room.phaseInteraction.werewolfReadySeatIds.length,
        werewolfReadyRequired: this.livingWerewolves(room).length
      };
    }
    if (room.game.phase === "day_discussion") {
      const living = this.livingPlayers(room);
      return {
        phase: room.game.phase,
        dayReadySeatIds: room.phaseInteraction.dayReadySeatIds,
        dayReadyCount: room.phaseInteraction.dayReadySeatIds.length,
        dayReadyRequired: living.length
      };
    }
    return { phase: room.game.phase };
  }
}

function json(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,OPTIONS",
      "access-control-allow-headers": "content-type"
    }
  });
}
