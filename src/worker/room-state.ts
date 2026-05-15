import { DEFAULT_BASIC_PRESET_ID, getBasicPreset, isBasicPresetId, type BasicPresetId, type GameState } from "../engine";
import type { Phase } from "../engine/phases";

export type RoomStatus = "lobby" | "playing" | "ended";
export type ConnectionStatus = "connected" | "disconnected";
export type SupportedPlayerCount = number;

export interface SeatState {
  seatId: string;
  nickname?: string;
  controller: "human" | "ai";
  playerTokenHash?: string;
  connectionStatus: ConnectionStatus;
  lastSeenAt?: number;
  ready?: boolean;
  readyAt?: number;
}

export interface RoomState {
  roomId: string;
  status: RoomStatus;
  settings: {
    playerCount: SupportedPlayerCount;
    presetId: BasicPresetId;
    spectatorsEnabled: boolean;
    locked: boolean;
  };
  seats: SeatState[];
  hostSeatId?: string;
  game?: GameState;
  chatMessages: ChatMessage[];
  phaseInteraction: PhaseInteractionState;
  socketTickets: Record<string, SocketTicket>;
  spectatorTickets: Record<string, SpectatorTicket>;
  observerTickets: Record<string, ObserverTicket>;
  currentDeadlineAt?: number;
  createdAt: number;
  updatedAt: number;
}

export interface SocketTicket {
  seatId: string;
  expiresAt: number;
}

export interface SpectatorTicket {
  expiresAt: number;
}

export interface ObserverTicket {
  expiresAt: number;
}

export interface ChatMessage {
  id: string;
  seatId: string;
  nickname: string;
  message: string;
  createdAt: number;
}

export interface WerewolfChatMessage {
  id: string;
  seatId: string;
  nickname: string;
  message: string;
  createdAt: number;
}

export interface PhaseInteractionState {
  phase?: Phase;
  werewolfChat: WerewolfChatMessage[];
  werewolfTargetId?: string;
  werewolfReadySeatIds: string[];
  dayReadySeatIds: string[];
}

export function createInitialRoomState(roomId: string, now: number): RoomState {
  const preset = getBasicPreset(DEFAULT_BASIC_PRESET_ID);
  return {
    roomId,
    status: "lobby",
    settings: {
      playerCount: preset.playerCount,
      presetId: preset.id,
      spectatorsEnabled: true,
      locked: false
    },
    seats: createEmptySeats(preset.playerCount),
    chatMessages: [],
    phaseInteraction: createPhaseInteraction(),
    socketTickets: {},
    spectatorTickets: {},
    observerTickets: {},
    createdAt: now,
    updatedAt: now
  };
}

export function createEmptySeats(playerCount: SupportedPlayerCount): SeatState[] {
  return Array.from({ length: playerCount }, (_, index) => ({
    seatId: `seat-${index + 1}`,
    controller: "human",
    connectionStatus: "disconnected",
    ready: false
  }));
}

export function normalizeRoomState(room: RoomState): RoomState {
  const settings = room.settings as RoomState["settings"] & { presetId?: unknown; playerCount?: unknown };
  const preset = isBasicPresetId(settings.presetId) ? getBasicPreset(settings.presetId) : getBasicPreset(DEFAULT_BASIC_PRESET_ID);
  room.settings = {
    playerCount: preset.playerCount,
    presetId: preset.id,
    spectatorsEnabled: settings.spectatorsEnabled ?? true,
    locked: settings.locked ?? false
  };
  room.chatMessages ??= [];
  room.phaseInteraction = normalizePhaseInteraction(room.phaseInteraction, room.game?.phase);
  room.socketTickets ??= {};
  room.spectatorTickets ??= {};
  room.observerTickets ??= {};
  room.seats = normalizeSeats(room.seats ?? [], preset.playerCount);
  for (const seat of room.seats) {
    seat.controller ??= "human";
    seat.connectionStatus ??= "disconnected";
    seat.ready ??= false;
  }
  return room;
}

export function createPhaseInteraction(phase?: Phase): PhaseInteractionState {
  return {
    ...(phase ? { phase } : {}),
    werewolfChat: [],
    werewolfReadySeatIds: [],
    dayReadySeatIds: []
  };
}

function normalizePhaseInteraction(value: PhaseInteractionState | undefined, phase: Phase | undefined): PhaseInteractionState {
  if (!value || value.phase !== phase) {
    return createPhaseInteraction(phase);
  }
  return {
    ...(phase ? { phase } : {}),
    werewolfChat: Array.isArray(value.werewolfChat) ? value.werewolfChat.slice(-40) : [],
    ...(typeof value.werewolfTargetId === "string" ? { werewolfTargetId: value.werewolfTargetId } : {}),
    werewolfReadySeatIds: Array.isArray(value.werewolfReadySeatIds) ? [...new Set(value.werewolfReadySeatIds)] : [],
    dayReadySeatIds: Array.isArray(value.dayReadySeatIds) ? [...new Set(value.dayReadySeatIds)] : []
  };
}

export function occupiedSeatCount(room: RoomState): number {
  return room.seats.filter((seat) => seat.nickname).length;
}

export function resizeSeatsForPreset(room: RoomState, presetId: BasicPresetId): void {
  const preset = getBasicPreset(presetId);
  const occupied = occupiedSeatCount(room);
  if (preset.playerCount < occupied) {
    throw new Error(`Cannot reduce to ${preset.playerCount} players while ${occupied} seats are occupied`);
  }
  room.settings.playerCount = preset.playerCount;
  room.settings.presetId = preset.id;
  room.seats = normalizeSeats(room.seats, preset.playerCount);
  for (const seat of room.seats) {
    if (seat.nickname) {
      seat.ready = false;
      delete seat.readyAt;
    }
  }
}

function normalizeSeats(seats: SeatState[], playerCount: SupportedPlayerCount): SeatState[] {
  const next = seats.slice(0, playerCount);
  for (let index = next.length; index < playerCount; index += 1) {
    next.push({
      seatId: `seat-${index + 1}`,
      controller: "human",
      connectionStatus: "disconnected",
      ready: false
    });
  }
  return next;
}
