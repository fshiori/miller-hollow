import { RoomObject } from "./room-object";
import type { Env } from "./env";

export { RoomObject };

const APP_VERSION = "0.1.1";
const CREATE_ROOM_LIMIT = { limit: 10, windowMs: 60_000 };
const createRoomBuckets = new Map<string, RateBucket>();

interface RateBucket {
  count: number;
  resetAt: number;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-methods": "GET,POST,OPTIONS",
          "access-control-allow-headers": "content-type"
        }
      });
    }

    if (request.method === "GET" && url.pathname === "/api/health") {
      return Response.json({
        ok: true,
        service: "miller-hollow",
        version: APP_VERSION,
        buildSha: env.MILLER_HOLLOW_BUILD_SHA ?? "local",
        storage: "durable_object_sqlite",
        timerProfile: env.MILLER_HOLLOW_TIMER_PROFILE ?? "production"
      });
    }

    if (request.method === "POST" && url.pathname === "/api/rooms") {
      const client = request.headers.get("cf-connecting-ip") ?? "local";
      if (!takeRateLimit(createRoomBuckets, client, CREATE_ROOM_LIMIT.limit, CREATE_ROOM_LIMIT.windowMs)) {
        return Response.json({ error: "Too many rooms created. Try again soon." }, { status: 429 });
      }
      const id = env.ROOMS.newUniqueId();
      const stub = env.ROOMS.get(id);
      const joinUrl = `/room/${id.toString()}`;
      await stub.fetch(new Request(`${url.origin}/rooms/${id.toString()}/state`));
      return Response.json({ roomId: id.toString(), joinUrl });
    }

    const roomMatch = url.pathname.match(/^\/api\/rooms\/([^/]+)\/(join|reconnect|start|reset|state|private|diagnostics|socket-ticket|socket)$/);
    if (roomMatch) {
      const roomId = roomMatch[1];
      const action = roomMatch[2];
      if (!roomId || !action) {
        return Response.json({ error: "Invalid room route" }, { status: 400 });
      }
      const id = env.ROOMS.idFromString(roomId);
      const stub = env.ROOMS.get(id);
      return stub.fetch(new Request(`${url.origin}/rooms/${roomId}/${action}${url.search}`, request));
    }

    return env.ASSETS.fetch(request);
  }
};

function takeRateLimit(buckets: Map<string, RateBucket>, key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    pruneRateBuckets(buckets, now);
    return true;
  }
  if (existing.count >= limit) {
    return false;
  }
  existing.count += 1;
  return true;
}

function pruneRateBuckets(buckets: Map<string, RateBucket>, now: number): void {
  if (buckets.size < 1024) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}
