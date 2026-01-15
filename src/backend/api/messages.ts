import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { auth, type AuthContext } from "@/backend/lib/auth";
import { v } from "@/backend/lib/validator";
import { jsonResponse, imageResponse, requiresAuth } from "@/backend/lib/openapi";
import { parsePagination, createPagination } from "@/shared/pagination";
import { messageService } from "@/backend/services/messages";
import { parseWebpDataUrl, webpResponse } from "@/backend/lib/images";
import {
  ErrorResponseSchema,
  MessageIdParamSchema,
  MessageDataSchema,
  MessagesListResponseSchema,
  MessageSearchQuerySchema,
  UpdateMessageSchema,
  MessageResponseSchema,
  CreateMessageSchema,
} from "@/shared/schemas";

/** Message routes: CRUD operations, search, and images. */
const app = new Hono<AuthContext>()
  .get(
    "/",
    describeRoute({
      tags: ["Messages"],
      summary: "Search messages",
      description:
        "Search for messages in a chatroom. Requires chatroom_id parameter. " +
        "Supports full-text search and filtering by content type. " +
        "Admins can include deleted messages with deleted=true.",
      ...requiresAuth,
      responses: {
        200: jsonResponse(MessagesListResponseSchema, "Paginated list of messages"),
        403: jsonResponse(ErrorResponseSchema, "No access to this chatroom"),
        404: jsonResponse(ErrorResponseSchema, "Chatroom not found"),
      },
    }),
    auth.middleware.requireAuth,
    v("query", MessageSearchQuerySchema),
    async (c) => {
      const user = c.get("user");
      const query = c.req.valid("query");
      const { page, perPage, offset } = parsePagination(query);

      const result = await messageService.getAll({
        filters: {
          chatroomId: query.chatroom_id,
          userId: user.id,
          search: query.search,
          contentType: query.content_type,
          includeDeleted: query.deleted,
        },
        page,
        perPage,
        isAdmin: user.role === "admin",
      });

      if ("error" in result) {
        return c.json(
          { message: result.error === "not_found" ? "Chatroom not found" : "No access to this chatroom" },
          result.error === "not_found" ? 404 : 403,
        );
      }

      return c.json({
        messages: result.messages,
        pagination: createPagination({ page, perPage, offset }, result.total),
      });
    },
  )

  .post(
    "/",
    describeRoute({
      tags: ["Messages"],
      summary: "Send message (bot only)",
      description:
        "Send a message to a chatroom via REST API. " +
        "This endpoint is only available for bot accounts using X-Bot-Token authentication. " +
        "Regular users must use the WebSocket endpoint to send messages.",
      ...requiresAuth,
      responses: {
        201: jsonResponse(MessageDataSchema, "Created message"),
        400: jsonResponse(ErrorResponseSchema, "Invalid message content"),
        403: jsonResponse(ErrorResponseSchema, "Bot-only endpoint or no chatroom access"),
        404: jsonResponse(ErrorResponseSchema, "Chatroom not found"),
      },
    }),
    auth.middleware.requireAuth,
    v("json", CreateMessageSchema),
    async (c) => {
      const user = c.get("user");
      const isBot = c.get("isBot");

      // Only bots can use this endpoint
      if (!isBot) {
        return c.json({ message: "This endpoint is only available for bot accounts" }, 403);
      }

      const { chatroom_id, content_type, content, content_meta } = c.req.valid("json");

      // Validate content based on type
      if (content_type === "image") {
        if (content.length > 500_000) {
          return c.json({ message: "Image too large (max 500KB)" }, 400);
        }
        if (!/^data:image\/webp;base64,[A-Za-z0-9+/]+=*$/.test(content)) {
          return c.json({ message: "Must be a WebP base64 data URL" }, 400);
        }
      } else if (content_type === "gif") {
        if (!content.startsWith("https://static.klipy.com/")) {
          return c.json({ message: "Must be a Klipy CDN URL" }, 400);
        }
      } else if (content_type === "text") {
        if (content.length > 10_000) {
          return c.json({ message: "Text too long (max 10KB)" }, 400);
        }
      }

      const result = await messageService.create({
        chatroomId: chatroom_id,
        userId: user.id,
        createdBy: user.id,
        contentType: content_type,
        content,
        contentMeta: content_meta,
      });

      if ("error" in result) {
        const errorMessages = {
          no_access: { message: "No access to this chatroom", status: 403 },
          not_found: { message: "Chatroom not found", status: 404 },
        } as const;
        const error = errorMessages[result.error as keyof typeof errorMessages];
        return c.json({ message: error?.message ?? "Unknown error" }, error?.status ?? 400);
      }

      return c.json(result, 201);
    },
  )

  .get(
    "/:id",
    describeRoute({
      tags: ["Messages"],
      summary: "Get message by ID",
      description:
        "Returns a single message with its edit history. " +
        "User must have access to the chatroom containing the message.",
      ...requiresAuth,
      responses: {
        200: jsonResponse(MessageDataSchema, "Message with edit history"),
        403: jsonResponse(ErrorResponseSchema, "No access to this chatroom"),
        404: jsonResponse(ErrorResponseSchema, "Message not found"),
      },
    }),
    auth.middleware.requireAuth,
    v("param", MessageIdParamSchema),
    async (c) => {
      const user = c.get("user");
      const { id } = c.req.valid("param");

      const result = await messageService.getById({
        id,
        userId: user.id,
        isAdmin: user.role === "admin",
      });

      if ("error" in result) {
        return c.json(
          { message: result.error === "not_found" ? "Message not found" : "No access to this chatroom" },
          result.error === "not_found" ? 404 : 403,
        );
      }

      return c.json(result);
    },
  )

  .patch(
    "/:id",
    describeRoute({
      tags: ["Messages"],
      summary: "Edit message",
      description:
        "Edit a text message. Only the message creator can edit. " +
        "Messages can only be edited within 10 minutes of creation. " +
        "Image and GIF messages cannot be edited. " +
        "The previous content is saved to the edit history.",
      ...requiresAuth,
      responses: {
        200: jsonResponse(MessageDataSchema, "Updated message with edit history"),
        400: jsonResponse(ErrorResponseSchema, "Message too old, not editable type, or content unchanged"),
        403: jsonResponse(ErrorResponseSchema, "Not the message creator or no chatroom access"),
        404: jsonResponse(ErrorResponseSchema, "Message not found"),
      },
    }),
    auth.middleware.requireAuth,
    v("param", MessageIdParamSchema),
    v("json", UpdateMessageSchema),
    async (c) => {
      const user = c.get("user");
      const { id } = c.req.valid("param");
      const { content } = c.req.valid("json");

      const result = await messageService.update({
        id,
        userId: user.id,
        content,
      });

      if ("error" in result) {
        const errorMessages = {
          not_found: { message: "Message not found", status: 404 },
          no_access: { message: "No access to this chatroom", status: 403 },
          not_creator: { message: "Only the message creator can edit", status: 403 },
          too_old: { message: "Messages can only be edited within 10 minutes", status: 400 },
          not_editable: { message: "Only text messages can be edited", status: 400 },
          no_change: { message: "New content is identical to current content", status: 400 },
        } as const;
        const error = errorMessages[result.error];
        return c.json({ message: error.message }, error.status);
      }

      return c.json(result);
    },
  )

  .delete(
    "/:id",
    describeRoute({
      tags: ["Messages"],
      summary: "Delete message",
      description:
        "Soft-delete a message. Only the message creator can delete. " +
        "Messages can only be deleted within 10 minutes of creation. " +
        "Deleted messages are hidden from regular users but can be viewed by admins.",
      ...requiresAuth,
      responses: {
        200: jsonResponse(MessageResponseSchema, "Message deleted"),
        400: jsonResponse(ErrorResponseSchema, "Message too old to delete"),
        403: jsonResponse(ErrorResponseSchema, "Not the message creator or no chatroom access"),
        404: jsonResponse(ErrorResponseSchema, "Message not found"),
      },
    }),
    auth.middleware.requireAuth,
    v("param", MessageIdParamSchema),
    async (c) => {
      const user = c.get("user");
      const { id } = c.req.valid("param");

      const result = await messageService.remove({
        id,
        userId: user.id,
      });

      if ("error" in result) {
        const errorMessages = {
          not_found: { message: "Message not found", status: 404 },
          no_access: { message: "No access to this chatroom", status: 403 },
          not_creator: { message: "Only the message creator can delete", status: 403 },
          too_old: { message: "Messages can only be deleted within 10 minutes", status: 400 },
        } as const;
        const error = errorMessages[result.error];
        return c.json({ message: error.message }, error.status);
      }

      return c.json({ message: "Message deleted" });
    },
  );

// Image route added separately to avoid type inference issues with Response return type
app.get(
  "/:id/image",
  describeRoute({
    tags: ["Messages"],
    summary: "Get message image",
    description:
      "Returns the image attached to a message as a WebP file. " +
      "Only applicable for messages with content_type 'image'.",
    ...requiresAuth,
    responses: {
      200: imageResponse("Message image as WebP"),
      404: jsonResponse(ErrorResponseSchema, "Message not found or has no image"),
      500: jsonResponse(ErrorResponseSchema, "Invalid image data stored"),
    },
  }),
  auth.middleware.requireAuth,
  v("param", MessageIdParamSchema),
  async (c) => {
    const { id } = c.req.valid("param");

    const data = await messageService.getImageData({ id });
    if (!data) return c.json({ message: "Image not found" }, 404);

    const buffer = parseWebpDataUrl(data.content);
    if (!buffer) return c.json({ message: "Invalid image data" }, 500);

    return webpResponse(buffer);
  },
);

export default app;
