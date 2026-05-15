import {
  applyCommand,
  buildTimeoutCommand,
  createGame,
  mathRandomSource,
  toPrivatePlayerView,
  toPublicView,
  type GameCommand,
  type GamePlayer
} from "../engine";
import { createInitialRoomState, type RoomState } from "./room-state";
import { createToken, hashToken } from "./tokens";
import type { Env } from "./env";

const PRODUCTION_PHASE_SECONDS: Record<string, number> = {
  night_werewolves: 90,
  night_seer: 60,
  night_witch: 90,
  day_discussion: 300,
  day_vote: 90
};

const SMOKE_PHASE_SECONDS: Record<string, number> = {
  night_werewolves: 45,
  night_seer: 35,
  night_witch: 45,
  day_discussion: 20,
  day_vote: 60
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

interface ClientMessage {
  type?: string;
  targetId?: string;
  save?: boolean;
  poisonTargetId?: string;
  message?: string;
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

    if (request.method === "GET" && url.pathname.endsWith("/diagnostics")) {
      return this.diagnostics(request);
    }

    if (request.method === "GET" && url.pathname.endsWith("/socket")) {
      return this.openSocket(request);
    }

    if (request.method === "GET" && url.pathname.endsWith("/spectator-socket")) {
      return this.openSpectatorSocket(request);
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

    const command: GameCommand =
      room.game.phase === "day_discussion"
        ? { type: "advance_to_vote" }
        : buildTimeoutCommand(room.game, mathRandomSource);
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
    room.hostSeatId ??= seat.seatId;
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
      privateView: room.game ? toPrivatePlayerView(room.game, seat.seatId) : undefined,
      seatId: seat.seatId
    });
  }

  private async start(request: Request): Promise<Response> {
    const body = (await request.json().catch(() => ({}))) as TokenRequest;
    const room = await this.loadRoom(this.state.id.toString());
    if (room.status !== "lobby") {
      return json({ error: "Game has already started" }, 409);
    }
    const host = await this.authenticate(room, body.seatId, body.token);
    if (!host || host.seatId !== room.hostSeatId) {
      return json({ error: "Only the host can start" }, 403);
    }
    if (room.seats.some((seat) => !seat.nickname)) {
      return json({ error: "Room is not full" }, 409);
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
        this.transferHost(room, body.targetSeatId);
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

  private async reset(request: Request): Promise<Response> {
    const body = (await request.json().catch(() => ({}))) as TokenRequest;
    const room = await this.loadRoom(this.state.id.toString());
    const host = await this.authenticate(room, body.seatId, body.token);
    if (!host || host.seatId !== room.hostSeatId) {
      return json({ error: "Only the host can reset" }, 403);
    }
    if (room.status === "playing") {
      return json({ error: "Playing games cannot be reset" }, 409);
    }

    room.status = "lobby";
    delete room.game;
    delete room.currentDeadlineAt;
    room.chatMessages = [];
    room.socketTickets = {};
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
      privateView: room.game ? toPrivatePlayerView(room.game, seat.seatId) : undefined
    });
  }

  private async diagnostics(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const room = await this.loadRoom(this.state.id.toString());
    const seat = await this.authenticate(room, url.searchParams.get("seatId"), url.searchParams.get("token"));
    if (!seat || seat.seatId !== room.hostSeatId) {
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
      pendingSocketTickets: Object.keys(room.socketTickets).length,
      chatMessages: room.chatMessages.length,
      settings: {
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
    if (message.type === "day_chat") {
      await this.addChat(room, seatId, String(message.message ?? ""));
      return;
    }
    if (!room.game) {
      this.send(socket, { type: "error", error: "Game has not started" });
      return;
    }

    const command = this.messageToCommand(room, seatId, message);
    room.game = applyCommand(room.game, command).state;
    if (command.type === "submit_vote") {
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
    if (room.seats.some((seat) => !seat.nickname)) {
      throw new Error("Room is not full");
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
    room.game = createGame(players, mathRandomSource);
    room.status = "playing";
    this.afterGameMutation(room);
    this.logRoomEvent(room, "game_started", { occupiedSeats: room.seats.length, phase: room.game.phase });
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
    room.socketTickets = {};
    room.spectatorTickets = {};
    for (const seat of room.seats) {
      if (seat.seatId !== room.hostSeatId) {
        this.closePlayerSockets(seat.seatId, "Lobby reset by host");
        delete seat.nickname;
        delete seat.playerTokenHash;
        delete seat.lastSeenAt;
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
        return { type: "submit_werewolf_target", actorId: seatId, targetId: message.targetId };
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
    if (message.type === "vote") {
      return { type: "submit_vote", actorId: seatId, targetId: message.targetId ?? "abstain" };
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
    if (!room.game || room.game.phase !== "day_vote") {
      return;
    }
    const livingPlayerIds = room.game.players.filter((player) => room.game?.alive[player.id]).map((player) => player.id);
    const allVoted = livingPlayerIds.every((playerId) => room.game?.votes[playerId]);
    if (allVoted) {
      room.game = applyCommand(room.game, { type: "resolve_vote", missingVotesAsAbstain: true }).state;
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

  private async loadRoom(roomId: string): Promise<RoomState> {
    const stored = await this.state.storage.get<RoomState>("room");
    if (stored) {
      stored.settings.spectatorsEnabled ??= true;
      stored.settings.locked ??= false;
      stored.chatMessages ??= [];
      stored.socketTickets ??= {};
      stored.spectatorTickets ??= {};
      return stored;
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
  }

  private sendSeatViews(room: RoomState, socket: WebSocket, seatId: string): void {
    this.send(socket, { type: "room_view", room: this.publicRoomView(room) });
    if (room.game) {
      this.send(socket, {
        type: "private_view",
        privateView: toPrivatePlayerView(room.game, seatId)
      });
    }
  }

  private send(socket: WebSocket, payload: unknown): void {
    try {
      socket.send(JSON.stringify(payload));
    } catch {
      this.sessions.delete(socket);
      this.spectatorSessions.delete(socket);
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

  private publicRoomView(room: RoomState) {
    return {
      roomId: room.roomId,
      status: room.status,
      settings: room.settings,
      hostSeatId: room.hostSeatId,
      seats: room.seats.map((seat) => ({
        seatId: seat.seatId,
        nickname: seat.nickname,
        controller: seat.controller,
        connectionStatus: seat.connectionStatus,
        lastSeenAt: seat.lastSeenAt
      })),
      game: room.game ? toPublicView(room.game) : undefined,
      chatMessages: room.chatMessages,
      currentDeadlineAt: room.currentDeadlineAt,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
      activeSpectators: this.spectatorSessions.size
    };
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
