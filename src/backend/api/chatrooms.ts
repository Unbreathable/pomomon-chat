import { Hono } from "hono";
import { z } from "zod";
import { describeRoute } from "hono-openapi";
import { auth, type AuthContext } from "@/backend/lib/auth";
import { v } from "@/backend/lib/validator";
import { jsonResponse, imageResponse, requiresAuth } from "@/backend/lib/openapi";
import { parsePagination, createPagination } from "@/shared/pagination";
import { chatroomService } from "@/backend/services/chatrooms";
import { messageService } from "@/backend/services/messages";
import {
  CreateChatroomSchema,
  UpdateChatroomSchema,
  PaginationQuerySchema,
  ChatroomQuerySchema,
  MessageTypeSchema,
  AddMemberSchema,
  JoinByTokenSchema,
  ChatroomSchema,
  ChatroomsListResponseSchema,
  MessagesListResponseSchema,
  ChatroomMembersListResponseSchema,
  ErrorResponseSchema,
  MessageResponseSchema,
  ChatroomIdParamSchema,
  ChatroomMemberParamSchema,
} from "@/shared/schemas";
import { parseWebpDataUrl, generateFallback, webpResponse } from "@/backend/lib/images";

// Join token response schema
const JoinTokenResponseSchema = z.object({
  join_token: z.string().describe("New join token for invite links"),
});

/** Chatroom routes: CRUD, messages, favorites, mute settings, membership, images. */
const app = new Hono<AuthContext>()
  .get(
    "/",
    describeRoute({
      tags: ["Chatrooms"],
      summary: "List chatrooms",
      description:
        "Returns a paginated list of chatrooms accessible to the current user. " +
        "Includes townsquare rooms (public) and rooms where the user is a member. " +
        "Use query parameters to filter by favorites, unmuted, or search by name.",
      ...requiresAuth,
      responses: {
        200: jsonResponse(ChatroomsListResponseSchema, "Paginated list of chatrooms with user-specific fields"),
      },
    }),
    auth.middleware.requireAuth,
    v("query", ChatroomQuerySchema),
    async (c) => {
      const user = c.get("user");
      const query = c.req.valid("query");
      const { page, perPage, offset } = parsePagination(query);
      const result = await chatroomService.getAll({
        filters: {
          userId: user.id,
          search: query.search,
          filterFavorited: query.favorited,
          filterUnmuted: query.unmuted,
          includeUnlisted: query.unlisted,
          includeDeleted: query.deleted,
        },
        page,
        perPage,
      });
      return c.json({
        chatrooms: result.chatrooms,
        pagination: createPagination({ page, perPage, offset }, result.total),
      });
    },
  )

  .post(
    "/",
    describeRoute({
      tags: ["Chatrooms"],
      summary: "Create chatroom",
      description:
        "Create a new chatroom. The creating user automatically becomes a manager. " +
        "Townsquare rooms are visible to all users, non-townsquare rooms require membership. " +
        "Unlisted rooms don't appear in the public list but can be accessed via direct link.",
      ...requiresAuth,
      responses: {
        200: jsonResponse(ChatroomSchema, "Created chatroom"),
      },
    }),
    auth.middleware.requireAuth,
    v("json", CreateChatroomSchema),
    async (c) => {
      const { name, description, unlisted, is_townsquare, bots_allowed } = c.req.valid("json");
      return c.json(
        await chatroomService.create({
          name,
          description,
          unlisted,
          isTownsquare: is_townsquare,
          botsAllowed: bots_allowed,
          createdBy: c.get("user").id,
        }),
      );
    },
  )

  .get(
    "/:id/messages",
    describeRoute({
      tags: ["Chatrooms"],
      summary: "Get messages",
      description:
        "Returns a paginated list of messages in a chatroom. User must have access to the chatroom. " +
        "Use 'before' parameter for cursor-based pagination (load older messages). " +
        "Filter by content_type to get only specific message types.",
      ...requiresAuth,
      responses: {
        200: jsonResponse(MessagesListResponseSchema, "Paginated list of messages"),
        403: jsonResponse(ErrorResponseSchema, "User does not have access to this chatroom"),
        404: jsonResponse(ErrorResponseSchema, "Chatroom not found"),
      },
    }),
    auth.middleware.requireAuth,
    v("param", ChatroomIdParamSchema),
    v(
      "query",
      PaginationQuerySchema.extend({
        before: z.uuid().optional().describe("Message ID to load messages before (for cursor pagination)"),
        content_type: MessageTypeSchema.optional().describe("Filter by message type"),
      }),
    ),
    async (c) => {
      const { id } = c.req.valid("param");
      const query = c.req.valid("query");
      const user = c.get("user");
      const { page, perPage, offset } = parsePagination(query);
      const result = await messageService.getAll({
        filters: { chatroomId: id, userId: user.id, before: query.before, contentType: query.content_type },
        page,
        perPage,
        isAdmin: user.role === "admin",
      });
      if ("error" in result) {
        return c.json(
          { message: result.error === "not_found" ? "Chatroom not found" : "No access" },
          result.error === "not_found" ? 404 : 403,
        );
      }
      return c.json({
        messages: result.messages,
        pagination: createPagination({ page, perPage, offset }, result.total),
      });
    },
  )

  .put(
    "/:id/favorite",
    describeRoute({
      tags: ["Chatrooms"],
      summary: "Add to favorites",
      description: "Add a chatroom to the current user's favorites. Favorited rooms appear first in the list.",
      ...requiresAuth,
      responses: {
        200: jsonResponse(MessageResponseSchema, "Chatroom added to favorites"),
        403: jsonResponse(ErrorResponseSchema, "User does not have access to this chatroom"),
        404: jsonResponse(ErrorResponseSchema, "Chatroom not found"),
      },
    }),
    auth.middleware.requireAuth,
    v("param", ChatroomIdParamSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const result = await chatroomService.setFavorite({ userId: c.get("user").id, chatroomId: id });
      if ("error" in result) {
        return c.json(
          { message: result.error === "not_found" ? "Chatroom not found" : "No access" },
          result.error === "not_found" ? 404 : 403,
        );
      }
      return c.json({ message: "Favorited" });
    },
  )

  .delete(
    "/:id/favorite",
    describeRoute({
      tags: ["Chatrooms"],
      summary: "Remove from favorites",
      description: "Remove a chatroom from the current user's favorites.",
      ...requiresAuth,
      responses: {
        200: jsonResponse(MessageResponseSchema, "Chatroom removed from favorites"),
        403: jsonResponse(ErrorResponseSchema, "User does not have access to this chatroom"),
        404: jsonResponse(ErrorResponseSchema, "Chatroom not found"),
      },
    }),
    auth.middleware.requireAuth,
    v("param", ChatroomIdParamSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const result = await chatroomService.removeFavorite({ userId: c.get("user").id, chatroomId: id });
      if ("error" in result) {
        return c.json(
          { message: result.error === "not_found" ? "Chatroom not found" : "No access" },
          result.error === "not_found" ? 404 : 403,
        );
      }
      return c.json({ message: "Unfavorited" });
    },
  )

  .put(
    "/:id/mute",
    describeRoute({
      tags: ["Chatrooms"],
      summary: "Mute chatroom",
      description: "Disable notifications for this chatroom. Muted rooms won't trigger push notifications or alerts.",
      ...requiresAuth,
      responses: {
        200: jsonResponse(MessageResponseSchema, "Chatroom muted"),
        403: jsonResponse(ErrorResponseSchema, "User does not have access to this chatroom"),
        404: jsonResponse(ErrorResponseSchema, "Chatroom not found"),
      },
    }),
    auth.middleware.requireAuth,
    v("param", ChatroomIdParamSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const result = await chatroomService.mute({ userId: c.get("user").id, chatroomId: id });
      if ("error" in result) {
        return c.json(
          { message: result.error === "not_found" ? "Chatroom not found" : "No access" },
          result.error === "not_found" ? 404 : 403,
        );
      }
      return c.json({ message: "Muted" });
    },
  )

  .delete(
    "/:id/mute",
    describeRoute({
      tags: ["Chatrooms"],
      summary: "Unmute chatroom",
      description: "Re-enable notifications for this chatroom.",
      ...requiresAuth,
      responses: {
        200: jsonResponse(MessageResponseSchema, "Chatroom unmuted"),
        403: jsonResponse(ErrorResponseSchema, "User does not have access to this chatroom"),
        404: jsonResponse(ErrorResponseSchema, "Chatroom not found"),
      },
    }),
    auth.middleware.requireAuth,
    v("param", ChatroomIdParamSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const result = await chatroomService.unmute({ userId: c.get("user").id, chatroomId: id });
      if ("error" in result) {
        return c.json(
          { message: result.error === "not_found" ? "Chatroom not found" : "No access" },
          result.error === "not_found" ? 404 : 403,
        );
      }
      return c.json({ message: "Unmuted" });
    },
  )

  .get(
    "/:id",
    describeRoute({
      tags: ["Chatrooms"],
      summary: "Get chatroom",
      description:
        "Returns detailed information about a chatroom. " +
        "Includes user-specific fields like is_favorited, is_unmuted, user_role, and can_manage. " +
        "The join_token is only visible to users with 'manage' role.",
      ...requiresAuth,
      responses: {
        200: jsonResponse(ChatroomSchema, "Chatroom details with user-specific fields"),
        404: jsonResponse(ErrorResponseSchema, "Chatroom not found or user doesn't have access"),
      },
    }),
    auth.middleware.requireAuth,
    v("param", ChatroomIdParamSchema),
    async (c) => {
      const chatroom = await chatroomService.getById({ id: c.req.valid("param").id, userId: c.get("user").id });
      if (!chatroom) return c.json({ message: "Chatroom not found" }, 404);
      return c.json(chatroom);
    },
  )

  .patch(
    "/:id",
    describeRoute({
      tags: ["Chatrooms"],
      summary: "Update chatroom",
      description:
        "Update chatroom properties. Requires 'manage' role or admin. " +
        "The 'pinned' field can only be changed by system admins.",
      ...requiresAuth,
      responses: {
        200: jsonResponse(ChatroomSchema, "Updated chatroom"),
        400: jsonResponse(ErrorResponseSchema, "No fields to update"),
        403: jsonResponse(
          ErrorResponseSchema,
          "Insufficient permissions (need 'manage' role or admin, or admin for pinned)",
        ),
        404: jsonResponse(ErrorResponseSchema, "Chatroom not found"),
      },
    }),
    auth.middleware.requireAuth,
    v("param", ChatroomIdParamSchema),
    v("json", UpdateChatroomSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const updates = c.req.valid("json");
      const user = c.get("user");

      if (Object.keys(updates).length === 0) {
        return c.json({ message: "No fields to update" }, 400);
      }

      const chatroom = await chatroomService.getById({ id, userId: user.id });
      if (!chatroom) return c.json({ message: "Chatroom not found" }, 404);
      if (!chatroom.can_manage && user.role !== "admin") {
        return c.json({ message: "You don't have permission to edit this chatroom" }, 403);
      }

      if (user.role !== "admin" && updates.pinned !== undefined) {
        return c.json({ message: "Only admins can change pinned status" }, 403);
      }

      return c.json(await chatroomService.update({ id, data: updates }));
    },
  )

  .get(
    "/:id/members",
    describeRoute({
      tags: ["Chatrooms"],
      summary: "List members",
      description: "Returns a paginated list of chatroom members with their roles.",
      ...requiresAuth,
      responses: {
        200: jsonResponse(ChatroomMembersListResponseSchema, "Paginated list of members with roles"),
        404: jsonResponse(ErrorResponseSchema, "Chatroom not found"),
      },
    }),
    auth.middleware.requireAuth,
    v("param", ChatroomIdParamSchema),
    v("query", PaginationQuerySchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const { page, perPage, offset } = parsePagination(c.req.valid("query"));

      const chatroom = await chatroomService.getById({ id, userId: c.get("user").id });
      if (!chatroom) return c.json({ message: "Chatroom not found" }, 404);

      const result = await chatroomService.getMembers({ chatroomId: id, page, perPage });

      if ("error" in result) {
        return c.json({ message: "Chatroom not found" }, 404);
      }

      return c.json({
        members: result.members,
        pagination: createPagination({ page, perPage, offset }, result.total),
      });
    },
  )

  .post(
    "/:id/members",
    describeRoute({
      tags: ["Chatrooms"],
      summary: "Add member",
      description:
        "Add a user to the chatroom. Requires 'manage' role or admin. " +
        "Cannot add members to townsquare rooms (they are public by default). " +
        "Bots can only be added to chatrooms where bots_allowed is true.",
      ...requiresAuth,
      responses: {
        200: jsonResponse(MessageResponseSchema, "Member added successfully"),
        400: jsonResponse(ErrorResponseSchema, "Cannot add members to townsquare rooms or bots not allowed"),
        403: jsonResponse(ErrorResponseSchema, "Requires 'manage' role or admin"),
        404: jsonResponse(ErrorResponseSchema, "Chatroom or user not found"),
      },
    }),
    auth.middleware.requireAuth,
    v("param", ChatroomIdParamSchema),
    v("json", AddMemberSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const { user_id, role } = c.req.valid("json");

      const chatroom = await chatroomService.getById({ id, userId: c.get("user").id });
      if (!chatroom) return c.json({ message: "Chatroom not found" }, 404);
      if (!chatroom.can_manage) {
        return c.json({ message: "You don't have permission to add members" }, 403);
      }

      if (chatroom.is_townsquare) {
        return c.json({ message: "Cannot add members to a townsquare room" }, 400);
      }

      const result = await chatroomService.addMember({ chatroomId: id, userId: user_id, role });
      if (!result.success) {
        return c.json({ message: result.error }, 400);
      }
      return c.json({ message: "Member added" });
    },
  )

  .patch(
    "/:id/members/:userId",
    describeRoute({
      tags: ["Chatrooms"],
      summary: "Update member role",
      description: "Change a member's role in the chatroom. Requires 'manage' role or admin.",
      ...requiresAuth,
      responses: {
        200: jsonResponse(MessageResponseSchema, "Member role updated"),
        400: jsonResponse(ErrorResponseSchema, "Invalid operation"),
        403: jsonResponse(ErrorResponseSchema, "Requires 'manage' role or admin"),
        404: jsonResponse(ErrorResponseSchema, "Chatroom not found"),
      },
    }),
    auth.middleware.requireAuth,
    v("param", ChatroomMemberParamSchema),
    v("json", z.object({ role: z.enum(["member", "manage"]) })),
    async (c) => {
      const { id, userId: targetUserId } = c.req.valid("param");
      const { role } = c.req.valid("json");
      const currentUser = c.get("user");

      const chatroom = await chatroomService.getById({ id, userId: currentUser.id });
      if (!chatroom) return c.json({ message: "Chatroom not found" }, 404);

      if (!chatroom.can_manage) {
        return c.json({ message: "You don't have permission to update members" }, 403);
      }

      const result = await chatroomService.updateMemberRole({ chatroomId: id, userId: targetUserId, role });
      if (!result.success) {
        return c.json({ message: result.error }, 400);
      }

      return c.json({ message: "Member updated" });
    },
  )

  .delete(
    "/:id/members/:userId",
    describeRoute({
      tags: ["Chatrooms"],
      summary: "Remove member",
      description:
        "Remove a member from the chatroom. Requires 'manage' role or admin, or users can remove themselves (leave). " +
        "Cannot remove members from townsquare rooms.",
      ...requiresAuth,
      responses: {
        200: jsonResponse(MessageResponseSchema, "Member removed"),
        400: jsonResponse(ErrorResponseSchema, "Cannot remove from townsquare rooms"),
        403: jsonResponse(ErrorResponseSchema, "Requires 'manage' role or self-removal"),
        404: jsonResponse(ErrorResponseSchema, "Chatroom not found"),
      },
    }),
    auth.middleware.requireAuth,
    v("param", ChatroomMemberParamSchema),
    async (c) => {
      const { id, userId: targetUserId } = c.req.valid("param");
      const currentUser = c.get("user");
      const isSelf = currentUser.id === targetUserId;

      const chatroom = await chatroomService.getById({ id, userId: currentUser.id });
      if (!chatroom) return c.json({ message: "Chatroom not found" }, 404);

      if (chatroom.is_townsquare) {
        return c.json({ message: "Cannot remove members from a townsquare room" }, 400);
      }

      if (!isSelf && !chatroom.can_manage) {
        return c.json({ message: "You don't have permission to remove members" }, 403);
      }

      const result = await chatroomService.removeMember({ chatroomId: id, userId: targetUserId });
      if (!result.success) {
        return c.json({ message: result.error }, 400);
      }

      return c.json({ message: "Member removed" });
    },
  )

  .post(
    "/:id/join",
    describeRoute({
      tags: ["Chatrooms"],
      summary: "Join via token",
      description:
        "Join a non-townsquare chatroom using a join token. " +
        "Join tokens are shared by chatroom managers to invite new members.",
      ...requiresAuth,
      responses: {
        200: jsonResponse(MessageResponseSchema, "Successfully joined the chatroom"),
        400: jsonResponse(ErrorResponseSchema, "Invalid or expired join token"),
      },
    }),
    auth.middleware.requireAuth,
    v("param", ChatroomIdParamSchema),
    v("json", JoinByTokenSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const { join_token } = c.req.valid("json");

      const result = await chatroomService.joinByToken({
        chatroomId: id,
        userId: c.get("user").id,
        joinToken: join_token,
      });

      if (!result.success) {
        return c.json({ message: result.error }, 400);
      }

      return c.json({ message: "Joined chatroom" });
    },
  )

  .post(
    "/:id/reset-join-token",
    describeRoute({
      tags: ["Chatrooms"],
      summary: "Reset join token",
      description:
        "Generate a new join token, invalidating the old one. Requires 'manage' role or admin. " +
        "Not available for townsquare rooms as they don't use join tokens.",
      ...requiresAuth,
      responses: {
        200: jsonResponse(JoinTokenResponseSchema, "New join token"),
        400: jsonResponse(ErrorResponseSchema, "Townsquare rooms don't have join tokens"),
        403: jsonResponse(ErrorResponseSchema, "Requires 'manage' role or admin"),
        404: jsonResponse(ErrorResponseSchema, "Chatroom not found"),
      },
    }),
    auth.middleware.requireAuth,
    v("param", ChatroomIdParamSchema),
    async (c) => {
      const { id } = c.req.valid("param");

      const chatroom = await chatroomService.getById({ id, userId: c.get("user").id });
      if (!chatroom) return c.json({ message: "Chatroom not found" }, 404);
      if (!chatroom.can_manage) {
        return c.json({ message: "You don't have permission to reset the join token" }, 403);
      }

      if (chatroom.is_townsquare) {
        return c.json({ message: "Townsquare rooms don't have join tokens" }, 400);
      }

      const newToken = await chatroomService.resetJoinToken({ chatroomId: id });
      return c.json({ join_token: newToken });
    },
  )

  .delete(
    "/:id",
    describeRoute({
      tags: ["Chatrooms"],
      summary: "Delete chatroom",
      description:
        "Soft-delete a chatroom. Requires 'manage' role or admin. " +
        "Deleted chatrooms are hidden from regular users but can be restored by admins.",
      ...requiresAuth,
      responses: {
        200: jsonResponse(MessageResponseSchema, "Chatroom deleted"),
        403: jsonResponse(ErrorResponseSchema, "Requires 'manage' role or admin"),
        404: jsonResponse(ErrorResponseSchema, "Chatroom not found"),
      },
    }),
    auth.middleware.requireAuth,
    v("param", ChatroomIdParamSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const user = c.get("user");

      const chatroom = await chatroomService.getById({ id, userId: user.id });
      if (!chatroom) return c.json({ message: "Chatroom not found" }, 404);

      if (!chatroom.can_manage && user.role !== "admin") {
        return c.json({ message: "You don't have permission to delete this chatroom" }, 403);
      }

      await chatroomService.update({ id, data: { deleted: true } });
      return c.json({ message: "Chatroom deleted" });
    },
  );

// Image route added separately to avoid type inference issues with Response return type
app.get(
  "/:id/image",
  describeRoute({
    tags: ["Chatrooms"],
    summary: "Get chatroom image",
    description:
      "Returns the chatroom's image as a WebP file. If no custom image is set, returns a generated fallback based on the chatroom name. " +
      "Note: The image URL in chatroom objects contains '?fallback' query param when using a generated image.",
    ...requiresAuth,
    responses: {
      200: imageResponse("Chatroom image as WebP"),
      404: jsonResponse(ErrorResponseSchema, "Chatroom not found"),
    },
  }),
  auth.middleware.requireAuth,
  v("param", ChatroomIdParamSchema),
  async (c) => {
    const { id } = c.req.valid("param");

    const data = await chatroomService.getImageData({ id });
    if (!data) return c.json({ message: "Chatroom not found" }, 404);

    if (data.image) {
      const buffer = parseWebpDataUrl(data.image);
      if (buffer) return webpResponse(buffer);
    }

    const fallback = await generateFallback(id, data.name);
    return webpResponse(fallback);
  },
);

export default app;
