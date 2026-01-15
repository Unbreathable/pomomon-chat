import { Hono } from "hono";
import { z } from "zod";
import { describeRoute } from "hono-openapi";
import { auth, type AuthContext } from "@/backend/lib/auth";
import { v } from "@/backend/lib/validator";
import { jsonResponse, imageResponse, requiresAuth, requiresAdmin } from "@/backend/lib/openapi";
import { parsePagination, createPagination } from "@/shared/pagination";
import { userService } from "@/backend/services/users";
import {
  PaginationQuerySchema,
  UpdateUserSchema,
  UpdateUserRoleSchema,
  UserSchema,
  UsersListResponseSchema,
  ErrorResponseSchema,
  MessageResponseSchema,
  ResetPasswordTokenResponseSchema,
  UserIdParamSchema,
  SearchQueryParamSchema,
} from "@/shared/schemas";
import { parseWebpDataUrl, generateFallback, webpResponse } from "@/backend/lib/images";

/** User routes: profile management, admin user operations, avatars. */
const app = new Hono<AuthContext>()
  .get(
    "/:id/avatar",
    describeRoute({
      tags: ["Users"],
      summary: "Get user avatar",
      description:
        "Returns the user's avatar as a WebP image. If no custom avatar is set, returns a generated fallback image based on the username. " +
        "Note: The avatar URL in user objects contains '?fallback' query param when using a generated image.",
      ...requiresAuth,
      responses: {
        200: imageResponse("User avatar as WebP image"),
        404: jsonResponse(ErrorResponseSchema, "User not found"),
      },
    }),
    auth.middleware.requireAuth,
    v("param", UserIdParamSchema),
    async (c) => {
      const { id } = c.req.valid("param");

      const data = await userService.getAvatarData({ id });
      if (!data) return c.json({ message: "User not found" }, 404);

      if (data.avatar) {
        const buffer = parseWebpDataUrl(data.avatar);
        if (buffer) return webpResponse(buffer);
      }

      const fallback = await generateFallback(id, data.username);
      return webpResponse(fallback);
    },
  )
  .get(
    "/search",
    describeRoute({
      tags: ["Users"],
      summary: "Search users",
      description:
        "Search for users by username. Returns up to 5 matching users. Useful for member management in chatrooms.",
      ...requiresAuth,
      responses: {
        200: jsonResponse(z.array(UserSchema), "List of matching users (max 5)"),
      },
    }),
    auth.middleware.requireAuth,
    v("query", SearchQueryParamSchema),
    async (c) => {
      const { search } = c.req.valid("query");
      const result = await userService.getAll({ filters: { search }, page: 1, perPage: 5 });
      return c.json(result.users);
    },
  )
  .get(
    "/me",
    describeRoute({
      tags: ["Users"],
      summary: "Get current user",
      description: "Returns the profile data of the currently authenticated user.",
      ...requiresAuth,
      responses: {
        200: jsonResponse(UserSchema, "Current user's profile data"),
      },
    }),
    auth.middleware.requireAuth,
    (c) => c.json(c.get("user")),
  )
  .patch(
    "/me",
    describeRoute({
      tags: ["Users"],
      summary: "Update current user",
      description:
        "Update the profile of the currently authenticated user. All fields are optional. " +
        "Avatar should be a WebP base64 data URL, set to null to remove custom avatar.",
      ...requiresAuth,
      responses: {
        200: jsonResponse(UserSchema, "Updated user profile"),
        400: jsonResponse(ErrorResponseSchema, "No fields provided or validation error"),
      },
    }),
    auth.middleware.requireAuth,
    v("json", UpdateUserSchema),
    async (c) => {
      const updates = c.req.valid("json");
      if (Object.keys(updates).length === 0) return c.json({ message: "No fields to update" }, 400);
      return c.json(await userService.update({ id: c.get("user").id, data: updates }));
    },
  )
  .delete(
    "/me",
    describeRoute({
      tags: ["Users"],
      summary: "Delete current user",
      description: "Permanently delete the currently authenticated user's account. This action cannot be undone.",
      ...requiresAuth,
      responses: {
        200: jsonResponse(MessageResponseSchema, "Account deleted successfully"),
      },
    }),
    auth.middleware.requireAuth,
    async (c) => {
      await userService.remove({ id: c.get("user").id });
      return c.json({ message: "User deleted successfully" });
    },
  )
  .get(
    "/",
    describeRoute({
      tags: ["Users"],
      summary: "List all users",
      description: "Returns a paginated list of all users. Requires admin role. Supports search by username.",
      ...requiresAdmin,
      responses: {
        200: jsonResponse(UsersListResponseSchema, "Paginated list of users"),
      },
    }),
    auth.middleware.requireAuth,
    auth.middleware.requireAdmin,
    v("query", PaginationQuerySchema),
    async (c) => {
      const { page, perPage, offset } = parsePagination(c.req.valid("query"));
      const search = c.req.query("search");
      const result = await userService.getAll({ filters: { search }, page, perPage });
      return c.json({
        users: result.users,
        pagination: createPagination({ page, perPage, offset }, result.total),
      });
    },
  )
  .get(
    "/:id",
    describeRoute({
      tags: ["Users"],
      summary: "Get user by ID",
      description: "Returns the public profile of a user by their ID.",
      ...requiresAuth,
      responses: {
        200: jsonResponse(UserSchema, "User profile data"),
        404: jsonResponse(ErrorResponseSchema, "User not found"),
      },
    }),
    auth.middleware.requireAuth,
    v("param", UserIdParamSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const user = await userService.getById({ id });
      if (!user) return c.json({ message: "User not found" }, 404);
      return c.json(user);
    },
  )
  .delete(
    "/:id",
    describeRoute({
      tags: ["Users"],
      summary: "Delete user by ID",
      description:
        "Permanently delete a user account. Users can delete their own account, admins can delete any account. This action cannot be undone.",
      ...requiresAuth,
      responses: {
        200: jsonResponse(MessageResponseSchema, "User deleted successfully"),
        403: jsonResponse(ErrorResponseSchema, "Not authorized to delete this user"),
        404: jsonResponse(ErrorResponseSchema, "User not found"),
      },
    }),
    auth.middleware.requireAuth,
    v("param", UserIdParamSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const currentUser = c.get("user");
      if (currentUser.id !== id && currentUser.role !== "admin") return c.json({ message: "Unauthorized" }, 403);
      if (!(await userService.remove({ id }))) return c.json({ message: "User not found" }, 404);
      return c.json({ message: "User deleted successfully" });
    },
  )
  .delete(
    "/:id/sessions",
    describeRoute({
      tags: ["Users"],
      summary: "Delete all sessions",
      description:
        "Invalidate all active sessions for a user, logging them out of all devices. Users can invalidate their own sessions, admins can invalidate any user's sessions.",
      ...requiresAuth,
      responses: {
        200: jsonResponse(MessageResponseSchema, "Sessions invalidated with count"),
        403: jsonResponse(ErrorResponseSchema, "Not authorized to manage this user's sessions"),
      },
    }),
    auth.middleware.requireAuth,
    v("param", UserIdParamSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const currentUser = c.get("user");
      if (currentUser.id !== id && currentUser.role !== "admin") return c.json({ message: "Unauthorized" }, 403);
      const deletedCount = await auth.session.deleteAllForUser(id);
      return c.json({ message: `${deletedCount} session(s) deleted successfully` });
    },
  )
  .post(
    "/:id/reset-password",
    describeRoute({
      tags: ["Users"],
      summary: "Create password reset token",
      description:
        "Generate a password reset token for a user. Requires admin role. " +
        "The returned URL can be shared with the user to reset their password.",
      ...requiresAdmin,
      responses: {
        200: jsonResponse(ResetPasswordTokenResponseSchema, "Reset token and URL"),
        404: jsonResponse(ErrorResponseSchema, "User not found"),
      },
    }),
    auth.middleware.requireAuth,
    auth.middleware.requireAdmin,
    v("param", UserIdParamSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const user = await userService.getById({ id });
      if (!user) return c.json({ message: "User not found" }, 404);
      const { token, expiresAt } = await userService.createPasswordResetToken({ userId: id });
      const baseUrl = new URL(c.req.url).origin;
      return c.json({
        reset_url: `${baseUrl}/auth/reset/${token}`,
        token,
        expires_at: expiresAt.toISOString(),
      });
    },
  )
  .patch(
    "/:id/role",
    describeRoute({
      tags: ["Users"],
      summary: "Update user role",
      description:
        "Change a user's system role (user/admin). Requires admin role. " +
        "Admins cannot demote themselves to prevent accidental lockout.",
      ...requiresAdmin,
      responses: {
        200: jsonResponse(UserSchema, "Updated user data with new role"),
        400: jsonResponse(ErrorResponseSchema, "Cannot demote yourself"),
        404: jsonResponse(ErrorResponseSchema, "User not found"),
      },
    }),
    auth.middleware.requireAuth,
    auth.middleware.requireAdmin,
    v("param", UserIdParamSchema),
    v("json", UpdateUserRoleSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const { role } = c.req.valid("json");
      const currentUser = c.get("user");
      if (currentUser.id === id && role === "user") return c.json({ message: "You cannot demote yourself" }, 400);
      const user = await userService.getById({ id });
      if (!user) return c.json({ message: "User not found" }, 404);
      return c.json(await userService.updateRole({ id, role }));
    },
  );

export default app;
