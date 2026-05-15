type RoleId = "werewolf" | "seer" | "witch" | "villager" | string;
type TeamId = "village" | "werewolves" | string;
type PhaseId = "night_werewolves" | "night_seer" | "night_witch" | "day_discussion" | "day_vote" | "ended" | string;

const roleLabels: Record<string, string> = {
  werewolf: "狼人",
  seer: "預言家",
  witch: "女巫",
  villager: "村民",
  hunter: "獵人",
  cupid: "丘比特",
  thief: "盜賊",
  little_girl: "小女孩",
  captain: "警長",
  "Fortune Teller": "預言家",
  Seer: "預言家",
  Werewolf: "狼人",
  Witch: "女巫",
  "Ordinary Townsfolk": "村民",
  Villager: "村民"
};

const teamLabels: Record<string, string> = {
  village: "村莊陣營",
  werewolves: "狼人陣營"
};

const phaseLabels: Record<string, string> = {
  lobby: "大廳",
  night_werewolves: "狼人夜晚",
  night_seer: "預言家夜晚",
  night_witch: "女巫夜晚",
  day_discussion: "白天討論",
  day_vote: "白天投票",
  ended: "遊戲結束"
};

const connectionLabels: Record<string, string> = {
  offline: "離線",
  connecting: "連線中",
  connected: "已連線",
  reconnecting: "重新連線中",
  disconnected: "已斷線"
};

const statusLabels: Record<string, string> = {
  lobby: "大廳",
  playing: "遊戲中",
  ended: "遊戲結束"
};

const blockedReasonLabels: Record<string, string> = {
  "Game already started": "遊戲已經開始。",
  "Waiting for players": "等待玩家加入。",
  "Waiting for ready players": "等待所有玩家準備。"
};

const phaseStatusLabels: Record<string, string> = {
  "Werewolves submitted": "狼人已提交目標",
  "Waiting for werewolves": "等待狼人行動",
  "Waiting for seer": "等待預言家行動",
  "Waiting for witch": "等待女巫行動",
  "Discussion open": "討論開放中",
  Voting: "投票中",
  "Game over": "遊戲結束"
};

const actionStateLabels: Record<string, string> = {
  "Choose a victim": "選擇一名受害者",
  "Inspect a player": "查驗一名玩家",
  "Use or skip potions": "使用或略過藥水",
  Vote: "投票",
  "Werewolf target": "狼人目標"
};

const errorLabels: Record<string, string> = {
  "Create room failed": "建立房間失敗。",
  "Join failed": "加入房間失敗。",
  "Reconnect failed. Join the room again.": "重新連線失敗，請重新加入房間。",
  "Could not open connection.": "無法建立連線。",
  "Spectator connection rejected.": "觀戰連線被拒絕。",
  "Connection lost. Reconnecting...": "連線中斷，正在嘗試重新連線。",
  "Connection error. Retrying...": "連線發生錯誤，正在重試。",
  "Could not watch room.": "無法觀戰這個房間。",
  "Server rejected that action.": "伺服器拒絕這個操作。",
  "Could not create socket ticket": "無法建立連線票券。",
  "Could not create spectator ticket": "無法建立觀戰票券。",
  "Reset failed": "重設房間失敗。",
  "Host control failed": "房主操作失敗。",
  "Diagnostics failed": "讀取診斷資訊失敗。",
  "Connection is not ready yet.": "連線尚未就緒。",
  "Action failed": "操作失敗。",
  "Unsupported preset": "不支援的房間設定。",
  "Too many rooms created. Try again soon.": "建立房間次數過多，請稍後再試。",
  "Invalid room route": "房間路徑無效。",
  "Not found": "找不到房間。",
  "Nickname is required": "請先輸入暱稱。",
  "Room is locked": "房間已鎖定。",
  "Game has already started": "遊戲已經開始。",
  "Room is full": "房間已滿。",
  "Invalid reconnect token": "重新連線憑證無效。",
  "Only the host can start": "只有房主可以開始遊戲。",
  "Room is not full": "房間尚未坐滿。",
  "All players must be ready": "所有玩家都必須先準備。",
  "Only the host can use room controls": "只有房主可以使用房間工具。",
  "Playing games cannot be reset": "遊戲進行中不能重設房間。",
  "Unknown host control": "未知的房主操作。",
  "Room is already open": "房間已經開放。",
  "Only the host can reset": "只有房主可以重設房間。",
  "Invalid token": "憑證無效。",
  "Only the host can read diagnostics": "只有房主可以讀取診斷資訊。",
  "Too many socket tickets. Try again soon.": "連線請求過多，請稍後再試。",
  "Spectators are disabled": "觀戰目前已關閉。",
  "Too many spectator tickets. Try again soon.": "觀戰請求過多，請稍後再試。",
  "Expected WebSocket upgrade": "連線格式不正確。",
  "Invalid or expired socket ticket": "連線票券無效或已過期。",
  "Invalid or expired spectator ticket": "觀戰票券無效或已過期。",
  "Spectators cannot act": "觀戰者不能執行操作。",
  "Unauthenticated socket": "連線尚未驗證。",
  "Unknown seat": "未知座位。",
  "Too many actions. Try again soon.": "操作過於頻繁，請稍後再試。",
  "Game has not started": "遊戲尚未開始。",
  "Ready is only available in the lobby": "只有在大廳可以準備。",
  "Only lobby rooms can use this control": "只有大廳中的房間可以使用這個控制。",
  "Target seat is required": "請選擇目標座位。",
  "Host cannot kick themselves": "房主不能踢出自己。",
  "Target seat is empty": "目標座位是空的。",
  "Target is required": "請選擇目標。",
  "Unsupported message type": "不支援的訊息類型。",
  "Day chat is only available during discussion": "只有白天討論階段可以發言。",
  "Dead players cannot send day chat": "死亡玩家不能發言。",
  "Too many chat messages. Try again soon.": "發言過於頻繁，請稍後再試。",
  "Werewolf chat is only available during Werewolf night": "只有狼人夜晚可以使用狼人討論。",
  "Werewolf chat is only available to living Werewolves": "只有存活狼人可以使用狼人討論。",
  "Too many Werewolf chat messages. Try again soon.": "狼人討論發言過於頻繁，請稍後再試。",
  "Day readiness is only available during discussion": "只有白天討論階段可以準備投票。",
  "Dead players cannot ready during discussion": "死亡玩家不能準備投票。",
  "No legal werewolf timeout command is available": "目前沒有可用的狼人逾時動作。",
  "Invalid werewolf target": "狼人目標無效。",
  "No living Seer can inspect a target": "沒有存活的預言家可以查驗目標。",
  "Unknown Seer target": "預言家目標無效。",
  "No living Witch can use a potion": "沒有存活的女巫可以使用藥水。",
  "Invalid Witch save": "女巫救人目標無效。",
  "Witch poison has already been used": "女巫已經使用過毒藥。",
  "Witch cannot poison themselves in V1": "女巫不能毒殺自己。",
  "No living players": "沒有存活玩家。",
  "Unknown player": "未知玩家。",
  "Only playing games can advance phases": "只有進行中的遊戲可以快轉階段。"
};

export function labelRole(role: RoleId | undefined): string {
  if (!role) return "未知";
  return roleLabels[role] ?? role;
}

export function labelTeam(team: TeamId | undefined): string {
  if (!team) return "未知陣營";
  return teamLabels[team] ?? team;
}

export function labelPhase(phase: PhaseId | undefined): string {
  if (!phase) return "大廳";
  return phaseLabels[phase] ?? phase;
}

export function labelConnection(status: string | undefined): string {
  if (!status) return "未知";
  return connectionLabels[status] ?? status;
}

export function labelRoomStatus(status: string | undefined): string {
  if (!status) return "未知";
  return statusLabels[status] ?? status;
}

export function labelBlockedReason(reason: string | undefined): string {
  if (!reason) return "";
  return blockedReasonLabels[reason] ?? localizeError(reason);
}

export function labelPhaseStatus(label: string | undefined): string {
  if (!label) return "";
  const winnerMatch = label.match(/^(village|werewolves) win$/);
  if (winnerMatch?.[1]) return `${labelTeam(winnerMatch[1])}獲勝`;
  return phaseStatusLabels[label] ?? label;
}

export function labelActionState(label: string | undefined): string {
  if (!label) return "";
  return actionStateLabels[label] ?? label;
}

export function labelPreset(label: string | undefined, playerCount: number): string {
  if (!label) return `${playerCount} 人基本局`;
  if (label.includes("official beginner")) return `${playerCount} 人官方基本局`;
  if (label.includes("app basic")) return `${playerCount} 人相容基本局`;
  return label;
}

export function localizeError(message: string | undefined): string {
  if (!message) return "操作失敗。";
  if (message.includes("requires exactly")) return "玩家人數不符合房間設定。";
  if (message.startsWith("Player ") && message.includes(" is not the living Seer")) return "這名玩家不是存活的預言家。";
  if (message.startsWith("Player ") && message.includes(" is not the living Witch")) return "這名玩家不是存活的女巫。";
  if (message.startsWith("Player ") && message.includes(" is not alive")) return "這名玩家已死亡。";
  if (message.startsWith("Player ") && message.includes(" is not ")) return "這名玩家不能執行此角色行動。";
  if (message.startsWith("Expected phase ")) return "目前階段不能執行這個操作。";
  if (message.startsWith("No timeout command for phase ")) return "目前階段沒有可用的逾時動作。";
  if (message.startsWith("Cannot reduce to ")) return "目前座位已有玩家，不能縮減房間人數。";
  return errorLabels[message] ?? message;
}

export function localizeEvent(message: string): string {
  if (message === "The game has started.") return "遊戲開始。";
  if (message === "The Seer wakes.") return "預言家醒來。";
  if (message === "The Witch wakes.") return "女巫醒來。";
  if (message === "Day discussion begins.") return "白天討論開始。";
  if (message === "Voting begins.") return "投票開始。";
  if (message === "Night falls.") return "夜晚降臨。";
  if (message === "No one died tonight." || message === "No one died during the night.") return "今晚無人死亡。";
  if (message === "Vote tied. No one was executed.") return "投票平手，無人被處決。";
  if (message === "The village executed one player.") return "村莊處決了一名玩家。";
  if (message === "The vote did not execute anyone.") return "這次投票沒有處決任何人。";

  const deathMatch = message.match(/^(.+) died tonight\.$/);
  if (deathMatch?.[1]) return `${deathMatch[1]} 今晚死亡。`;

  const nightDeathCountMatch = message.match(/^([0-9]+) player\(s\) died during the night\.$/);
  if (nightDeathCountMatch?.[1]) return `今晚有 ${nightDeathCountMatch[1]} 名玩家死亡。`;

  const executeMatch = message.match(/^(.+) was executed\.$/);
  if (executeMatch?.[1]) return `${executeMatch[1]} 被處決。`;

  const winnerMatch = message.match(/^(village|werewolves) win\.$/);
  if (winnerMatch?.[1]) return `${labelTeam(winnerMatch[1])}獲勝。`;

  const sawMatch = message.match(/^You saw (.+)\.$/);
  if (sawMatch?.[1]) return `你看見了${labelRole(sawMatch[1])}。`;

  return message;
}
