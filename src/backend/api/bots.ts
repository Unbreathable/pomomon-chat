import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { auth, type AuthContext } from "@/backend/lib/auth";
import { v } from "@/backend/lib/validator";
import { jsonResponse, requiresAuth } from "@/backend/lib/openapi";
import { parsePagination, createPagination } from "@/shared/pagination";
import { botService } from "@/backend/services/bots";
import {
  PaginationQuerySchema,
  CreateBotSchema,
  UpdateBotSchema,
  BotSchema,
  BotsListResponseSchema,
  CreateBotResponseSchema,
  ErrorResponseSchema,
  MessageResponseSchema,
  BotIdParamSchema,
} from "@/shared/schemas";

/** Bot routes: create, manage, and delete bot accounts. */
const app = new Hono<AuthContext>()
  .get(
    "/",
    describeRoute({
      tags: ["Bots"],
      summary: "List your bots",
      description:
        "Returns a paginated list of bots owned by the current user. " + "Admins can view all bots in the system.",
      ...requiresAuth,
      responses: {
        200: jsonResponse(BotsListResponseSchema, "Paginated list of bots"),
      },
    }),
    auth.middleware.requireAuth,
    v("query", PaginationQuerySchema),
    async (c) => {
      const user = c.get("user");
      const { page, perPage, offset } = parsePagination(c.req.valid("query"));

      const result = await botService.getAll({ userId: user.id, page, perPage });

      return c.json({
        bots: result.bots,
        pagination: createPagination({ page, perPage, offset }, result.total),
      });
    },
  )
  .post(
    "/",
    describeRoute({
      tags: ["Bots"],
      summary: "Create a bot",
      description:
        "Create a new bot account. The response includes the bot token which is shown only once. " +
        "Store it securely as it cannot be retrieved later (only regenerated). " +
        "Regular users have a limit on how many bots they can create (configured via MAX_BOTS_PER_USER). " +
        "Admins are exempt from this limit.",
      ...requiresAuth,
      responses: {
        201: jsonResponse(CreateBotResponseSchema, "Bot created with token (shown only once)"),
        400: jsonResponse(ErrorResponseSchema, "Validation error"),
        403: jsonResponse(ErrorResponseSchema, "Bot limit reached"),
        409: jsonResponse(ErrorResponseSchema, "Username already taken"),
      },
    }),
    auth.middleware.requireAuth,
    v("json", CreateBotSchema),
    async (c) => {
      const user = c.get("user");
      const data = c.req.valid("json");

      // Check bot limit
      const canCreate = await botService.canCreateBot({ userId: user.id });
      if (!canCreate) {
        return c.json({ message: "Bot limit reached. Delete a bot or contact an admin." }, 403);
      }

      try {
        const { bot, token } = await botService.create({
          username: data.username,
          bio: data.bio,
          ownerId: user.id,
        });
        return c.json({ bot, token }, 201);
      } catch (error: any) {
        if (error.code === "23505") {
          return c.json({ message: "Username already taken" }, 409);
        }
        throw error;
      }
    },
  )
  .get(
    "/:id",
    describeRoute({
      tags: ["Bots"],
      summary: "Get bot by ID",
      description: "Returns details of a specific bot. Users can only view their own bots, admins can view any bot.",
      ...requiresAuth,
      responses: {
        200: jsonResponse(BotSchema, "Bot details"),
        403: jsonResponse(ErrorResponseSchema, "Not authorized to view this bot"),
        404: jsonResponse(ErrorResponseSchema, "Bot not found"),
      },
    }),
    auth.middleware.requireAuth,
    v("param", BotIdParamSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const user = c.get("user");

      const bot = await botService.getById({ id });
      if (!bot) return c.json({ message: "Bot not found" }, 404);

      // Check ownership (admins can view any bot)
      if (bot.bot_owner_id !== user.id && user.role !== "admin") {
        return c.json({ message: "Not authorized to view this bot" }, 403);
      }

      return c.json(bot);
    },
  )
  .patch(
    "/:id",
    describeRoute({
      tags: ["Bots"],
      summary: "Update bot",
      description:
        "Update a bot's profile (username, bio, avatar). Users can only update their own bots, admins can update any bot. " +
        "Avatar should be a WebP base64 data URL, set to null to remove custom avatar.",
      ...requiresAuth,
      responses: {
        200: jsonResponse(BotSchema, "Updated bot details"),
        400: jsonResponse(ErrorResponseSchema, "No fields provided or validation error"),
        403: jsonResponse(ErrorResponseSchema, "Not authorized to update this bot"),
        404: jsonResponse(ErrorResponseSchema, "Bot not found"),
        409: jsonResponse(ErrorResponseSchema, "Username already taken"),
      },
    }),
    auth.middleware.requireAuth,
    v("param", BotIdParamSchema),
    v("json", UpdateBotSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const user = c.get("user");
      const updates = c.req.valid("json");

      if (Object.keys(updates).length === 0) {
        return c.json({ message: "No fields to update" }, 400);
      }

      const bot = await botService.getById({ id });
      if (!bot) return c.json({ message: "Bot not found" }, 404);

      // Check ownership (admins can update any bot)
      if (bot.bot_owner_id !== user.id && user.role !== "admin") {
        return c.json({ message: "Not authorized to update this bot" }, 403);
      }

      try {
        return c.json(await botService.update({ id, data: updates }));
      } catch (error: any) {
        if (error.code === "23505") {
          return c.json({ message: "Username already taken" }, 409);
        }
        throw error;
      }
    },
  )
  .delete(
    "/:id",
    describeRoute({
      tags: ["Bots"],
      summary: "Delete bot",
      description:
        "Permanently delete a bot account. Users can only delete their own bots, admins can delete any bot. " +
        "This also removes the bot from all chatrooms and invalidates its token.",
      ...requiresAuth,
      responses: {
        200: jsonResponse(MessageResponseSchema, "Bot deleted successfully"),
        403: jsonResponse(ErrorResponseSchema, "Not authorized to delete this bot"),
        404: jsonResponse(ErrorResponseSchema, "Bot not found"),
      },
    }),
    auth.middleware.requireAuth,
    v("param", BotIdParamSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const user = c.get("user");

      const bot = await botService.getById({ id });
      if (!bot) return c.json({ message: "Bot not found" }, 404);

      // Check ownership (admins can delete any bot)
      if (bot.bot_owner_id !== user.id && user.role !== "admin") {
        return c.json({ message: "Not authorized to delete this bot" }, 403);
      }

      await botService.remove({ id });
      return c.json({ message: "Bot deleted successfully" });
    },
  )
  .post(
    "/:id/regenerate-token",
    describeRoute({
      tags: ["Bots"],
      summary: "Regenerate bot token",
      description:
        "Generate a new token for the bot, invalidating the old one. " +
        "The new token is shown only once. Users can only regenerate tokens for their own bots.",
      ...requiresAuth,
      responses: {
        200: jsonResponse(CreateBotResponseSchema, "New token generated (shown only once)"),
        403: jsonResponse(ErrorResponseSchema, "Not authorized to manage this bot"),
        404: jsonResponse(ErrorResponseSchema, "Bot not found"),
      },
    }),
    auth.middleware.requireAuth,
    v("param", BotIdParamSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const user = c.get("user");

      const bot = await botService.getById({ id });
      if (!bot) return c.json({ message: "Bot not found" }, 404);

      // Check ownership (admins can regenerate any bot's token)
      if (bot.bot_owner_id !== user.id && user.role !== "admin") {
        return c.json({ message: "Not authorized to manage this bot" }, 403);
      }

      const token = await botService.regenerateToken({ id });

      // Refresh bot data to get updated token_prefix
      const updatedBot = await botService.getById({ id });
      return c.json({ bot: updatedBot!, token });
    },
  );

export default app;
