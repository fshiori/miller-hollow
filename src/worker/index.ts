import { RoomObject } from "./room-object";
import { DEFAULT_BASIC_PRESET_ID, isBasicPresetId, validateCustomRoleSetup, type CustomRoleSetup } from "../engine";
import type { Env } from "./env";
import type { HostMode } from "./room-state";

export { RoomObject };

const APP_VERSION = "0.7.0";
const CREATE_ROOM_LIMIT = { limit: 10, windowMs: 60_000 };
const SMOKE_CREATE_ROOM_LIMIT = { limit: 50, windowMs: 60_000 };
const createRoomBuckets = new Map<string, RateBucket>();

interface RateBucket {
  count: number;
  resetAt: number;
}

interface CreateRoomRequest {
  presetId?: unknown;
  customRoleSetup?: CustomRoleSetup;
  hostMode?: HostMode;
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
      const body = (await request.json().catch(() => ({}))) as CreateRoomRequest;
      if (body.customRoleSetup) {
        try {
          validateCustomRoleSetup(body.customRoleSetup);
        } catch (error) {
          return Response.json({ error: error instanceof Error ? error.message : "Invalid custom role setup" }, { status: 400 });
        }
      } else if (body.presetId !== undefined && !isBasicPresetId(body.presetId)) {
        return Response.json({ error: "Unsupported preset" }, { status: 400 });
      }
      const client = request.headers.get("cf-connecting-ip") ?? "local";
      const createLimit = env.MILLER_HOLLOW_TIMER_PROFILE === "smoke" ? SMOKE_CREATE_ROOM_LIMIT : CREATE_ROOM_LIMIT;
      if (!takeRateLimit(createRoomBuckets, client, createLimit.limit, createLimit.windowMs)) {
        return Response.json({ error: "Too many rooms created. Try again soon." }, { status: 429 });
      }
      const id = env.ROOMS.newUniqueId();
      const stub = env.ROOMS.get(id);
      const joinUrl = `/room/${id.toString()}`;
      await stub.fetch(new Request(`${url.origin}/rooms/${id.toString()}/state`));
      let initialized: { hostToken?: string } = {};
      if (body.customRoleSetup || body.presetId || body.hostMode === "dedicated_host") {
        const initializeResponse = await stub.fetch(
          new Request(`${url.origin}/rooms/${id.toString()}/initialize`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              ...(body.customRoleSetup ? { customRoleSetup: body.customRoleSetup } : { presetId: body.presetId ?? DEFAULT_BASIC_PRESET_ID }),
              hostMode: body.hostMode === "dedicated_host" ? "dedicated_host" : "player_host"
            })
          })
        );
        initialized = (await initializeResponse.json().catch(() => ({}))) as { hostToken?: string };
      }
      return Response.json({ roomId: id.toString(), joinUrl, ...(initialized.hostToken ? { hostToken: initialized.hostToken } : {}) });
    }

    const roomMatch = url.pathname.match(/^\/api\/rooms\/([^/]+)\/(.+)$/);
    if (roomMatch) {
      const roomId = roomMatch[1];
      const action = roomMatch[2];
      if (!roomId || !action) {
        return Response.json({ error: "Invalid room route" }, { status: 400 });
      }
      if (!isRoomActionAllowed(action)) {
        return Response.json({ error: "Invalid room route" }, { status: 404 });
      }
      const id = env.ROOMS.idFromString(roomId);
      const stub = env.ROOMS.get(id);
      return stub.fetch(new Request(`${url.origin}/rooms/${roomId}/${action}${url.search}`, request));
    }

    const assetResponse = await env.ASSETS.fetch(request);
    if (request.method === "GET" && assetResponse.status === 404 && acceptsHtml(request)) {
      return env.ASSETS.fetch(new Request(`${url.origin}/`, request));
    }
    return assetResponse;
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

function isRoomActionAllowed(action: string): boolean {
  return [
    "join",
    "reconnect",
    "start",
    "reset",
    "state",
    "private",
    "diagnostics",
    "socket-ticket",
    "socket",
    "spectator-ticket",
    "spectator-socket",
    "observer-ticket",
    "observer-socket",
    "observer-state",
    "host/lock",
    "host/unlock",
    "host/enable-spectators",
    "host/disable-spectators",
    "host/kick",
    "host/transfer",
    "host/advance-phase",
    "host/open-sheriff-election",
    "host/add-ai-players",
    "host/ai-step",
    "host/reset-lobby"
  ].includes(action);
}

function pruneRateBuckets(buckets: Map<string, RateBucket>, now: number): void {
  if (buckets.size < 1024) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

function acceptsHtml(request: Request): boolean {
  return request.headers.get("accept")?.includes("text/html") ?? false;
}
