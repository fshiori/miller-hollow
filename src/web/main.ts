import "./styles.css";
import {
  labelActionState,
  labelBlockedReason,
  labelConnection,
  labelPhase,
  labelPhaseStatus,
  labelPreset,
  labelRole,
  labelRoomStatus,
  labelTeam,
  localizeError,
  localizeEvent
} from "./copy";
import { escapeHtml } from "./render";

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
  ready: boolean;
  readyAt?: number;
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
    playerCount: number;
    presetId: string;
    spectatorsEnabled: boolean;
    locked: boolean;
  };
  preset?: {
    id: string;
    family: "official_basic" | "app_basic";
    label: string;
    rulesSource: "official_rulebook" | "miller_hollow_app";
    playerCount: number;
    roleSummary: Array<{ role: string; label: string; count: number }>;
  };
  seats: SeatView[];
  game?: {
    phase: Phase;
    round: number;
    players: PublicPlayerView[];
    winner?: string;
    publicEvents: { id: string; message: string }[];
    phaseStatus: {
      label: string;
      submittedCount?: number;
      requiredCount?: number;
    };
    endgameReveal?: {
      winner: string;
      players: PublicPlayerView[];
      timeline: { id: string; message: string }[];
    };
  };
  chatMessages: { id: string; seatId: string; nickname: string; message: string; createdAt: number }[];
  currentDeadlineAt?: number;
  startEligibility?: {
    canStart: boolean;
    occupiedSeats: number;
    readySeats: number;
    requiredSeats: number;
    blockedReason?: string;
  };
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
  actionState: {
    required: boolean;
    submitted: boolean;
    label?: string;
    waitingFor?: string;
    cannotActReason?: string;
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
        <section class="auth-layout">
          <header class="masthead">
            <div class="eyebrow">隱藏身分桌遊</div>
            <h1>米勒山谷</h1>
            <p>8-18 人。沒有主持人也能開始一場村莊對抗。</p>
          </header>
          <div class="panel auth-panel">
            <form id="create-form" class="auth-card primary-auth">
              <h2>建立房間</h2>
              <label>暱稱<input name="nickname" maxlength="32" required autocomplete="nickname" /></label>
              <label>玩家人數
                <select name="presetId">
                  ${Array.from({ length: 11 }, (_, index) => {
                    const count = index + 8;
                    return `<option value="official_basic_${count}">${count} 人</option>`;
                  }).join("")}
                </select>
              </label>
              <button type="submit">建立房間</button>
            </form>
            <form id="join-form" class="auth-card">
              <h2>加入房間</h2>
              <label>房間 ID<input name="roomId" required value="${escapeHtml(roomIdFromPath)}" /></label>
              <label>暱稱<input name="nickname" maxlength="32" required autocomplete="nickname" /></label>
              <button type="submit">加入房間</button>
              ${roomIdFromPath ? `<a class="text-link" href="/room/${escapeHtml(roomIdFromPath)}/watch">觀戰</a>` : ""}
            </form>
          </div>
        </section>
      </main>
    `;
    bindAuthForms();
    return;
  }

  const seats = room?.seats ?? [];
  const requiredSeats = room?.startEligibility?.requiredSeats ?? room?.preset?.playerCount ?? room?.settings.playerCount ?? seats.length;
  const game = room?.game;
  const phase = game?.phase ?? "lobby";
  const playerById = new Map(game?.players.map((player) => [player.id, player]) ?? []);
  app.innerHTML = `
    <main class="shell game-screen phase-${escapeHtml(String(game?.phase ?? "lobby"))}">
      <header class="topbar">
        <div class="brand-block">
          <div class="eyebrow">即時房間</div>
          <h1>米勒山谷</h1>
          <p>房間 <code data-testid="room-id">${escapeHtml(session.roomId)}</code></p>
        </div>
        <div class="top-actions">
          ${renderRoomMeta()}
          <div class="status-pill">${escapeHtml(labelConnection(connectionStatus))}</div>
          <button id="leave-button" class="secondary">離開</button>
        </div>
      </header>
      ${statusMessage ? `<div class="banner">${escapeHtml(statusMessage)}</div>` : ""}

      <section class="layout">
        <aside class="sidebar">
          <section class="panel seat-panel">
            <div class="panel-heading">
              <h2>村莊座位</h2>
              <span>${seats.filter((seat) => seat.nickname).length}/${requiredSeats}</span>
            </div>
            <div class="seat-list table-grid">
              ${seats
                .map((seat) => {
                  const player = playerById.get(seat.seatId);
                  const host = seat.seatId === room?.hostSeatId ? " host" : "";
                  const mine = seat.seatId === session?.seatId ? " mine" : "";
                  return `
                    <div class="seat${host}${mine}${player && !player.alive ? " dead" : ""}">
                      <div class="seat-main">
                        <strong>${escapeHtml(seat.nickname ?? "空位")}</strong>
                        <span><i class="status-dot ${escapeHtml(seat.connectionStatus)}"></i>${escapeHtml(seat.seatId)} · ${escapeHtml(labelConnection(seat.connectionStatus))}${seat.nickname ? ` · ${seat.ready ? "已準備" : "未準備"}` : ""}</span>
                      </div>
                      ${player ? `<span class="seat-state">${player.alive ? "存活" : "死亡"}${player.role ? ` · ${escapeHtml(labelRole(player.role))}` : ""}</span>` : ""}
                      ${renderSeatHostActions(seat)}
                    </div>
                  `;
                })
                .join("")}
            </div>
            ${renderReadyButton()}
            ${renderStartButton()}
          </section>

          ${renderHostTools()}

          <section class="panel role-panel">
            <div class="panel-heading">
              <h2>你的角色</h2>
              ${privateView ? `<span>${privateView.alive ? "可行動" : "死亡"}</span>` : "<span>尚未揭曉</span>"}
            </div>
            ${renderPrivatePanel()}
          </section>
        </aside>

        <section class="main-column">
          <section class="panel phase-panel">
            <div class="phase-row">
              <div>
                <h2>${escapeHtml(labelPhase(game?.phase))}</h2>
                <p>${game ? `第 ${game.round} 輪 · ${escapeHtml(labelPhaseStatus(game.phaseStatus.label))}` : `${room?.startEligibility?.occupiedSeats ?? seats.filter((seat) => seat.nickname).length}/${requiredSeats} 人就座 · ${room?.startEligibility?.readySeats ?? 0} 人準備`}</p>
              </div>
              <div>
                <div data-testid="phase" class="phase-chip">${escapeHtml(labelPhase(String(phase)))}</div>
                ${room?.currentDeadlineAt ? `<div id="timer" class="timer">${formatDeadline(room.currentDeadlineAt)}</div>` : ""}
              </div>
            </div>
            ${renderActionPanel()}
          </section>
          ${renderEndgamePanel()}

          <section class="panel">
            <div class="panel-heading">
              <h2>白天聊天</h2>
              <span>${(room?.chatMessages ?? []).length}</span>
            </div>
            <div class="chat-log">
              ${(room?.chatMessages ?? [])
                .slice(-40)
                .map((message) => `<p><strong>${escapeHtml(message.nickname)}</strong> ${escapeHtml(message.message)}</p>`)
                .join("") || `<p class="muted">目前沒有白天訊息。</p>`}
            </div>
            <form id="chat-form" class="inline-form">
              <input name="message" maxlength="240" placeholder="白天討論時可以傳訊息給存活玩家" ${
                game?.phase === "day_discussion" && privateView?.alive ? "" : "disabled"
              } />
              <button type="submit" ${game?.phase === "day_discussion" && privateView?.alive ? "" : "disabled"}>送出</button>
            </form>
          </section>

          <section class="panel">
            <div class="panel-heading">
              <h2>系統紀錄</h2>
              <span>${(game?.publicEvents ?? []).length}</span>
            </div>
            <div class="event-log">
              ${(game?.publicEvents ?? [])
                .slice(-16)
                .map((event) => `<p>${escapeHtml(localizeEvent(event.message))}</p>`)
                .join("") || `<p class="muted">等待玩家加入。</p>`}
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
  const requiredSeats = room?.startEligibility?.requiredSeats ?? room?.preset?.playerCount ?? room?.settings.playerCount ?? seats.length;
  const game = room?.game;
  const phase = game?.phase ?? "lobby";
  const playerById = new Map(game?.players.map((player) => [player.id, player]) ?? []);
  app.innerHTML = `
    <main class="shell game-screen spectator-screen phase-${escapeHtml(String(game?.phase ?? "lobby"))}">
      <header class="topbar">
        <div>
          <div class="eyebrow">觀戰中</div>
          <h1>米勒山谷</h1>
          <p>房間 <code data-testid="room-id">${escapeHtml(spectatorRoomId)}</code></p>
        </div>
        <div class="top-actions">
          ${renderRoomMeta()}
          <div class="status-pill">${escapeHtml(labelConnection(connectionStatus))}</div>
          <a class="button-link secondary" href="/room/${escapeHtml(spectatorRoomId)}">加入</a>
        </div>
      </header>
      ${statusMessage ? `<div class="banner">${escapeHtml(statusMessage)}</div>` : ""}
      <section class="layout">
        <aside class="sidebar">
          <section class="panel">
            <h2>座位</h2>
            <div class="seat-list">
              ${seats
                .map((seat) => {
                  const player = playerById.get(seat.seatId);
                  return `
                    <div class="seat">
                      <strong>${escapeHtml(seat.nickname ?? "空位")}</strong>
                      <span><i class="status-dot ${escapeHtml(seat.connectionStatus)}"></i>${escapeHtml(seat.seatId)} · ${escapeHtml(labelConnection(seat.connectionStatus))}</span>
                      ${player ? `<span>${player.alive ? "存活" : "死亡"}${player.role ? ` · ${escapeHtml(labelRole(player.role))}` : ""}</span>` : ""}
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
                <p>${game ? `第 ${game.round} 輪` : `${seats.filter((seat) => seat.nickname).length}/${requiredSeats} 人就座`}</p>
              </div>
              <div>
                <div data-testid="phase" class="phase-chip">${escapeHtml(labelPhase(String(phase)))}</div>
                ${room?.currentDeadlineAt ? `<div id="timer" class="timer">${formatDeadline(room.currentDeadlineAt)}</div>` : ""}
              </div>
            </div>
          </section>
          <section class="panel">
            <h2>白天聊天</h2>
            <div class="chat-log">
              ${(room?.chatMessages ?? [])
                .slice(-40)
                .map((message) => `<p><strong>${escapeHtml(message.nickname)}</strong> ${escapeHtml(message.message)}</p>`)
                .join("") || `<p class="muted">目前沒有白天訊息。</p>`}
            </div>
          </section>
          <section class="panel">
            <h2>系統紀錄</h2>
            <div class="event-log">
              ${(game?.publicEvents ?? [])
                .slice(-16)
                .map((event) => `<p>${escapeHtml(localizeEvent(event.message))}</p>`)
                .join("") || `<p class="muted">等待玩家加入。</p>`}
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
  const eligibility = room.startEligibility;
  return `
    ${eligibility?.blockedReason ? `<p class="muted">${escapeHtml(labelBlockedReason(eligibility.blockedReason))}</p>` : ""}
    <button id="start-button" ${eligibility?.canStart ? "" : "disabled"}>開始遊戲</button>
  `;
}

function renderReadyButton(): string {
  if (!session || !room || room.status !== "lobby") return "";
  const mine = room.seats.find((seat) => seat.seatId === session?.seatId);
  if (!mine?.nickname) return "";
  return `<button id="ready-button" class="${mine.ready ? "secondary" : ""}" type="button">${mine.ready ? "取消準備" : "準備"}</button>`;
}

function renderRoomMeta(): string {
  if (!room) return "";
  return `
    <div class="room-meta">
      <span>${escapeHtml(labelRoomStatus(room.status))}</span>
      <span>${escapeHtml(labelPreset(room.preset?.label, room.settings.playerCount))}</span>
      <span>${room.settings.locked ? "已鎖定" : "開放中"}</span>
      <span>${room.settings.spectatorsEnabled ? "可觀戰" : "不可觀戰"}</span>
      ${typeof room.activeSpectators === "number" ? `<span>${room.activeSpectators} 位觀戰者</span>` : ""}
    </div>
  `;
}

function renderHostTools(): string {
  if (!session || !room || session.seatId !== room.hostSeatId) return "";
  return `
    <section class="panel tools-panel">
      <h2>房間工具</h2>
      ${renderRoleSummary()}
      <div class="tool-row">
        <button id="copy-link-button" class="secondary" type="button">複製連結</button>
        <button id="copy-watch-link-button" class="secondary" type="button">觀戰連結</button>
        <button id="diagnostics-button" class="secondary" type="button">診斷資訊</button>
        <button id="lock-button" class="secondary" type="button">${room.settings.locked ? "解鎖" : "鎖定"}</button>
        <button id="spectators-button" class="secondary" type="button">${room.settings.spectatorsEnabled ? "關閉觀戰" : "開放觀戰"}</button>
        ${room.status === "playing" && room.game?.phase !== "ended" ? `<button id="advance-phase-button" class="secondary" type="button">快轉階段</button>` : ""}
      </div>
      ${room.status !== "playing" ? `<button id="reset-button" type="button">重設大廳</button>` : ""}
    </section>
  `;
}

function renderRoleSummary(): string {
  const summary = room?.preset?.roleSummary ?? [];
  if (!summary.length) return "";
  return `<p class="muted">${summary.map((entry) => `${entry.count} ${labelRole(entry.role)}`).map(escapeHtml).join(" · ")}</p>`;
}

function renderSeatHostActions(seat: SeatView): string {
  if (!session || !room || session.seatId !== room.hostSeatId || room.status !== "lobby" || !seat.nickname) return "";
  if (seat.seatId === room.hostSeatId) return "";
  return `
    <div class="seat-actions">
      <button type="button" class="mini secondary" data-kick-seat="${escapeHtml(seat.seatId)}">踢出</button>
      <button type="button" class="mini secondary" data-transfer-seat="${escapeHtml(seat.seatId)}">轉房主</button>
    </div>
  `;
}

function renderPrivatePanel(): string {
  if (!privateView) {
    return `<p class="muted">遊戲開始後會顯示你的角色。</p>`;
  }
  const seerResults = Object.entries(privateView.seerResults)
    .map(([playerId, role]) => `<li>${escapeHtml(nameFor(playerId))}: ${escapeHtml(labelRole(role))}</li>`)
    .join("");
  return `
    <div class="role-card">
      <strong data-testid="role">${escapeHtml(labelRole(privateView.role))}</strong>
      <span>${privateView.alive ? "存活" : "死亡"}</span>
    </div>
    ${
      privateView.werewolfTeammates.length
        ? `<p>狼隊隊友：${privateView.werewolfTeammates.map(nameFor).map(escapeHtml).join("、")}</p>`
        : ""
    }
    ${seerResults ? `<ul>${seerResults}</ul>` : ""}
    <p class="muted">${escapeHtml(actionStateLabel(privateView))}</p>
  `;
}

function renderActionPanel(): string {
  if (!room?.game || !privateView) {
    const requiredSeats = room?.startEligibility?.requiredSeats ?? room?.preset?.playerCount ?? 8;
    return `<p class="muted">全部 ${requiredSeats} 個座位都有人並完成準備後，房主才能開始遊戲。</p>`;
  }
  if (room.game.winner) {
    return `<div class="result">${escapeHtml(labelTeam(room.game.winner))}獲勝。</div>`;
  }
  if (!privateView.alive) {
    return `<p class="muted">你已死亡。你可以觀看公開資訊，但不能行動。</p>`;
  }
  if (privateView.legalActions.includes("submit_werewolf_target")) {
    return targetForm("night-form", "選擇一名受害者", privateView.legalTargets, "送出");
  }
  if (privateView.legalActions.includes("submit_seer_target")) {
    return targetForm("night-form", "查驗一名玩家", privateView.legalTargets, "查驗");
  }
  if (privateView.legalActions.includes("submit_witch_action")) {
    const victim = privateView.pendingWerewolfTarget;
    return `
      <form id="witch-form" class="action-form">
        <p>受害者：<strong>${victim ? escapeHtml(nameFor(victim)) : "無"}</strong></p>
        <label class="check"><input type="checkbox" name="save" ${privateView.witchPotions.saveAvailable && victim ? "" : "disabled"} /> 拯救受害者</label>
        <label>毒藥目標
          <select name="poisonTargetId" ${privateView.witchPotions.poisonAvailable ? "" : "disabled"}>
            <option value="">不使用毒藥</option>
            ${privateView.legalTargets.map((id) => `<option value="${escapeHtml(id)}">${escapeHtml(nameFor(id))}</option>`).join("")}
          </select>
        </label>
        <button type="submit">送出</button>
      </form>
    `;
  }
  if (privateView.legalActions.includes("submit_vote")) {
    return targetForm("vote-form", "投票", ["abstain", ...privateView.legalTargets], "投票");
  }
  return `<p class="muted">等待目前階段結束。</p>`;
}

function renderEndgamePanel(): string {
  const reveal = room?.game?.endgameReveal;
  if (!reveal) return "";
  return `
    <section class="panel endgame-panel">
      <div class="panel-heading">
        <h2>遊戲結束</h2>
        <span>${escapeHtml(labelTeam(reveal.winner))}獲勝</span>
      </div>
      <div class="reveal-grid">
        ${reveal.players
          .map(
            (player) => `
              <div class="reveal-card">
                <strong>${escapeHtml(player.nickname)}</strong>
                <span>${escapeHtml(labelRole(player.role))} · ${player.alive ? "存活" : "死亡"}</span>
              </div>
            `
          )
          .join("")}
      </div>
      <div class="event-log">
        ${reveal.timeline.map((event) => `<p>${escapeHtml(localizeEvent(event.message))}</p>`).join("")}
      </div>
    </section>
  `;
}

function actionStateLabel(view: PrivateView): string {
  if (view.actionState.submitted) return "已提交。";
  if (view.actionState.waitingFor) return `等待${labelActionState(view.actionState.waitingFor)}。`;
  if (view.actionState.cannotActReason) return localizeError(view.actionState.cannotActReason);
  if (view.actionState.label) return labelActionState(view.actionState.label);
  return "目前不需要行動。";
}

function targetForm(id: string, label: string, targets: string[], button: string): string {
  return `
    <form id="${id}" class="action-form">
      <label>${escapeHtml(label)}
        <select name="targetId" required>
          ${targets.map((target) => `<option value="${escapeHtml(target)}">${escapeHtml(target === "abstain" ? "棄票" : nameFor(target))}</option>`).join("")}
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
    const presetId = String(new FormData(form).get("presetId") ?? "official_basic_8");
    await runUiAction(async () => {
      const roomResponse = await fetch("/api/rooms", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ presetId })
      });
      const created = (await roomResponse.json()) as { roomId: string };
      if (!roomResponse.ok) throw new Error("Create room failed");
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
  document.querySelector<HTMLButtonElement>("#ready-button")?.addEventListener("click", () => {
    const mine = room?.seats.find((seat) => seat.seatId === session?.seatId);
    send({ type: "set_ready", ready: !mine?.ready });
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
  document.querySelector<HTMLButtonElement>("#advance-phase-button")?.addEventListener("click", () => {
    void hostControl("advance-phase");
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
  if (!response.ok) throw new Error(localizeError(joined.error ?? "Join failed"));
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
    statusMessage = localizeError("Reconnect failed. Join the room again.");
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
    statusMessage = localizeError(error instanceof Error ? error.message : "Could not open connection.");
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
        statusMessage = localizeError(payload.error ?? "Spectator connection rejected.");
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
      statusMessage = localizeError("Connection lost. Reconnecting...");
      render();
      window.setTimeout(() => void openSpectator(), 1500);
    });
    spectatorSocket.addEventListener("error", () => {
      connectionStatus = "reconnecting";
      statusMessage = localizeError("Connection error. Retrying...");
      render();
    });
  } catch (error) {
    connectionStatus = "offline";
    statusMessage = localizeError(error instanceof Error ? error.message : "Could not watch room.");
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
      statusMessage = localizeError(payload.error ?? "Server rejected that action.");
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
      statusMessage = localizeError("Connection lost. Reconnecting...");
      render();
    }
    window.setTimeout(() => openSocket(), 1500);
  });
  socket.addEventListener("error", () => {
    connectionStatus = "reconnecting";
    statusMessage = localizeError("Connection error. Retrying...");
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
    throw new Error(localizeError(payload.error ?? "Could not create socket ticket"));
  }
  return payload.ticket;
}

async function createSpectatorTicket(roomId: string): Promise<string> {
  const response = await fetch(`/api/rooms/${roomId}/spectator-ticket`, {
    method: "POST"
  });
  const payload = (await response.json()) as { ticket?: string; error?: string };
  if (!response.ok || !payload.ticket) {
    throw new Error(localizeError(payload.error ?? "Could not create spectator ticket"));
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
    if (!response.ok) throw new Error(localizeError(payload.error ?? "Reset failed"));
    room = payload;
    privateView = undefined;
    statusMessage = "房間已重設。";
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
    if (!response.ok) throw new Error(localizeError(payload.error ?? "Host control failed"));
    room = payload;
    statusMessage = "房間已更新。";
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
    if (!response.ok) throw new Error(localizeError(payload.error ?? "Diagnostics failed"));
    statusMessage = `診斷資訊：${labelRoomStatus(payload.status)}${payload.phase ? `/${labelPhase(payload.phase)}` : ""}，${payload.occupiedSeats ?? 0} 個座位，${payload.activeSockets ?? 0} 個連線，${payload.pendingSocketTickets ?? 0} 張票券。`;
    render();
  });
}

async function copyRoomLink(): Promise<void> {
  if (!session) return;
  const link = `${location.origin}/room/${session.roomId}`;
  if (navigator.clipboard) {
    await navigator.clipboard.writeText(link);
  }
  statusMessage = "房間連結已複製。";
  render();
}

async function copyWatchLink(): Promise<void> {
  if (!session) return;
  const link = `${location.origin}/room/${session.roomId}/watch`;
  if (navigator.clipboard) {
    await navigator.clipboard.writeText(link);
  }
  statusMessage = "觀戰連結已複製。";
  render();
}

function send(message: Record<string, unknown>): void {
  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
  } else {
    statusMessage = localizeError("Connection is not ready yet.");
    render();
  }
}

async function runUiAction(action: () => Promise<void>): Promise<void> {
  try {
    statusMessage = "";
    await action();
  } catch (error) {
    statusMessage = localizeError(error instanceof Error ? error.message : "Action failed");
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
