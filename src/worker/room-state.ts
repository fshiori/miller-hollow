import type { GameState } from "../engine";

export type RoomStatus = "lobby" | "playing" | "ended";
export type ConnectionStatus = "connected" | "disconnected";

export interface SeatState {
  seatId: string;
  nickname?: string;
  controller: "human" | "ai";
  playerTokenHash?: string;
  connectionStatus: ConnectionStatus;
  lastSeenAt?: number;
}

export interface RoomState {
  roomId: string;
  status: RoomStatus;
  settings: {
    playerCount: 8;
    presetId: "official_8_player_base_v1";
  };
  seats: SeatState[];
  hostSeatId?: string;
  game?: GameState;
  chatMessages: ChatMessage[];
  socketTickets: Record<string, SocketTicket>;
  currentDeadlineAt?: number;
  createdAt: number;
  updatedAt: number;
}

export interface SocketTicket {
  seatId: string;
  expiresAt: number;
}

export interface ChatMessage {
  id: string;
  seatId: string;
  nickname: string;
  message: string;
  createdAt: number;
}

export function createInitialRoomState(roomId: string, now: number): RoomState {
  return {
    roomId,
    status: "lobby",
    settings: {
      playerCount: 8,
      presetId: "official_8_player_base_v1"
    },
    seats: Array.from({ length: 8 }, (_, index) => ({
      seatId: `seat-${index + 1}`,
      controller: "human",
      connectionStatus: "disconnected"
    })),
    chatMessages: [],
    socketTickets: {},
    createdAt: now,
    updatedAt: now
  };
}
