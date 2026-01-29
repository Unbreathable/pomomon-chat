import { Hono } from "hono";
import { upgradeWebSocket, websocket } from "hono/bun";
import type { ServerWebSocket } from "bun";
import { z } from "zod";
import { auth } from "@/backend/lib/auth";
import { rateLimit } from "@/backend/lib/rate-limit";
import { chatroomService } from "@/backend/services/chatrooms";
import { messageService } from "@/backend/services/messages";

import { WsQuerySchema, WsClientMessageSchema, type WsServerMessage, type User } from "@/shared/schemas";

// ==========================
// Helpers
// ==========================

type WsHandle = { send: (data: string) => void; close: () => void };

/** Sends an error message and closes the WebSocket connection. */
const sendError = (ws: WsHandle, message: string): void => {
  ws.send(JSON.stringify({ type: "error", message } satisfies WsServerMessage));
  ws.close();
};

/** Sends a typed message over the WebSocket. */
const sendMessage = (ws: { send: (data: string) => void }, msg: WsServerMessage): void => {
  ws.send(JSON.stringify(msg));
};

// ==========================
// Routes
// ==========================

/** WebSocket route for real-time chat messaging and notifications. */
const app = new Hono().get(
  "/",
  upgradeWebSocket((c) => {
    const sessionToken = c.req.query("session_token");
    const roomIdParam = c.req.query("room_id");

    // State set after validation in onOpen
    let user: User | null = null;
    let roomId: string | undefined = undefined;
    let unmutedRooms: Array<{ id: string; name: string }> = [];
    let validated = false;

    return {
      async onOpen(_, ws) {
        const socket = ws.raw as ServerWebSocket;

        // Validate query params
        const query = WsQuerySchema.safeParse({
          session_token: sessionToken,
          room_id: roomIdParam,
        });

        if (!query.success) {
          return sendError(ws, "Invalid query parameters");
        }

        // Validate session
        const validatedUser = await auth.session.getUser(query.data.session_token);
        if (!validatedUser) {
          return sendError(ws, "Invalid or expired session");
        }
        user = validatedUser;

        // If roomId provided, verify user has access
        if (query.data.room_id) {
          const hasAccess = await chatroomService.canAccess({
            chatroomId: query.data.room_id,
            userId: user.id,
          });
          if (!hasAccess) {
            return sendError(ws, "Chatroom not found or no access");
          }
          roomId = query.data.room_id;
        }

        // Get unmuted rooms for notifications
        const { chatrooms } = await chatroomService.getAll({
          filters: { userId: user.id, filterUnmuted: true, includeUnlisted: true },
          page: 1,
          perPage: 1000, // Get all unmuted rooms
        });
        unmutedRooms = chatrooms.map((c) => ({ id: c.id, name: c.name }));
        validated = true;

        // Subscribe to room and send join message (skip for bots)
        if (roomId) {
					socket.subscribe(roomId);

					// TODO: Replace with setting the user as online in the chat room
        }

        // Subscribe to unmuted rooms for notifications
        for (const room of unmutedRooms) {
          socket.subscribe(room.id);
        }
      },

      async onMessage(event, ws) {
        if (!validated || !user) return;

        const socket = ws.raw as ServerWebSocket;

        // Check rate limit
        if ((await rateLimit.check(user.id)).limited) {
          return sendError(ws, "Rate limit exceeded");
        }

        // Can only send if connected to a room
        if (!roomId) {
          return sendMessage(ws, { type: "error", message: "Cannot send message without roomId" });
        }

        // Parse message
        const parsed = WsClientMessageSchema.safeParse(JSON.parse(event.data.toString()));

        if (!parsed.success) {
          const prettyError = z.prettifyError(parsed.error);
          return sendMessage(ws, { type: "error", message: prettyError || "Invalid message format" });
        }

        const { data } = parsed;

        let message;
        try {
          message = await messageService.create({
            chatroomId: roomId,
            userId: user.id,
            createdBy: user.id,
            contentType: data.content_type,
            content: data.content,
            contentMeta: data.content_meta,
          });
        } catch (err) {
          console.error("Failed to create message:", err);
          return sendMessage(ws, { type: "error", message: "Internal server error" });
        }

        if ("error" in message) {
          return sendMessage(ws, { type: "error", message: "No access to chatroom" });
        }

        // Broadcast to room
        const wsMessage = { type: "message", data: message } as const;
        socket.publish(roomId, JSON.stringify(wsMessage));
        sendMessage(ws, wsMessage);
      },

      async onClose(_, ws) {
        if (!validated || !user || !roomId) return;

        // Bots don't produce join/leave messages
        if (user.is_bot) return;

        // TODO: Set as offline in the member list
      },
    };
  }),
);

export { websocket };
export default app;
