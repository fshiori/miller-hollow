export type ClientAction =
  | { type: "start_game" }
  | { type: "set_ready"; ready: boolean }
  | { type: "night_action"; targetId?: string; save?: boolean; poisonTargetId?: string }
  | { type: "vote"; targetId: string }
  | { type: "day_chat"; message: string }
  | { type: "ping" };
