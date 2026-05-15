export interface Session {
  roomId: string;
  seatId: string;
  token: string;
}

export function loadSession(): Session | undefined {
  const saved = localStorage.getItem("miller-hollow:session");
  return saved ? (JSON.parse(saved) as Session) : undefined;
}

export function saveSession(value: Session): void {
  localStorage.setItem("miller-hollow:session", JSON.stringify(value));
}

export function clearStoredSession(): void {
  localStorage.removeItem("miller-hollow:session");
}
