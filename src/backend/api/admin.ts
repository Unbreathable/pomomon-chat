import { Hono } from "hono";
import { z } from "zod";
import { redis } from "bun";
import { describeRoute } from "hono-openapi";
import { auth, type AuthContext } from "@/backend/lib/auth";
import { v } from "@/backend/lib/validator";
import { jsonResponse, requiresAdmin } from "@/backend/lib/openapi";
import { env } from "@/shared/env";
import { statsService } from "@/backend/services/stats";
import {
  CreateInviteSchema,
  InviteResponseSchema,
  ErrorResponseSchema,
  MessageResponseSchema,
  InviteTokenParamSchema,
} from "@/shared/schemas";

// Stats response schema
const StatsResponseSchema = z.object({
  users: z.number().describe("Total number of registered users"),
  chatrooms: z.number().describe("Total number of chatrooms"),
  messages: z.number().describe("Total number of messages"),
});

/** Admin routes: stats, invite management. All routes require admin role. */
const app = new Hono<AuthContext>()
  .get(
    "/stats",
    describeRoute({
      tags: ["Admin"],
      summary: "Get statistics",
      description:
        "Returns overall platform statistics including user, chatroom, and message counts. Requires admin role.",
      ...requiresAdmin,
      responses: {
        200: jsonResponse(StatsResponseSchema, "Platform statistics"),
      },
    }),
    auth.middleware.requireAuth,
    auth.middleware.requireAdmin,
    async (c) => c.json(await statsService.getAdminStats()),
  )
  .post(
    "/invites",
    describeRoute({
      tags: ["Admin"],
      summary: "Create invite token",
      description:
        "Generate a new invite token for user registration. Requires admin role. " +
        "The invite URL can be shared with the person to be invited. " +
        "Each token can only be used once and expires after the configured time.",
      ...requiresAdmin,
      responses: {
        200: jsonResponse(InviteResponseSchema, "Invite token and URL"),
      },
    }),
    auth.middleware.requireAuth,
    auth.middleware.requireAdmin,
    v("json", CreateInviteSchema),
    async (c) => {
      const { real_name } = c.req.valid("json");
      const token = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + env.INVITE_EXPIRY_SECONDS * 1000);

      await redis.set(`invite:${token}`, JSON.stringify({ real_name }), "EX", env.INVITE_EXPIRY_SECONDS);

      const baseUrl = new URL(c.req.url).origin;

      return c.json({
        invite_url: `${baseUrl}/auth/register/${token}`,
        token,
        expires_at: expiresAt.toISOString(),
      });
    },
  )
  .delete(
    "/invites/:token",
    describeRoute({
      tags: ["Admin"],
      summary: "Delete invite token",
      description: "Revoke an invite token before it's used or expires. Requires admin role.",
      ...requiresAdmin,
      responses: {
        200: jsonResponse(MessageResponseSchema, "Invite token revoked"),
        404: jsonResponse(ErrorResponseSchema, "Invite token not found or already used/expired"),
      },
    }),
    auth.middleware.requireAuth,
    auth.middleware.requireAdmin,
    v("param", InviteTokenParamSchema),
    async (c) => {
      const { token } = c.req.valid("param");

      const deleted = await redis.del(`invite:${token}`);

      if (deleted === 0) return c.json({ message: "Invite not found or already expired" }, 404);

      return c.json({ message: "Invite deleted successfully" });
    },
  );

export default app;
