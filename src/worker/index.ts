import { RoomObject } from "./room-object";
import type { Env } from "./env";

export { RoomObject };

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

    if (request.method === "POST" && url.pathname === "/api/rooms") {
      const id = env.ROOMS.newUniqueId();
      const stub = env.ROOMS.get(id);
      const joinUrl = `/room/${id.toString()}`;
      await stub.fetch(new Request(`${url.origin}/rooms/${id.toString()}/state`));
      return Response.json({ roomId: id.toString(), joinUrl });
    }

    const roomMatch = url.pathname.match(/^\/api\/rooms\/([^/]+)\/(join|reconnect|start|state|private|socket-ticket|socket)$/);
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
