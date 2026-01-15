import { Hono } from "hono";
import { redis } from "bun";
import { describeRoute } from "hono-openapi";
import { v } from "@/backend/lib/validator";
import { jsonResponse, requiresAuth } from "@/backend/lib/openapi";
import { auth, type AuthContext } from "@/backend/lib/auth";
import { userService } from "@/backend/services/users";
import {
  RegisterSchema,
  LoginSchema,
  ResetPasswordSchema,
  ChangePasswordSchema,
  AuthResponseSchema,
  ErrorResponseSchema,
  MessageResponseSchema,
} from "@/shared/schemas";

/** Authentication routes: login, register, logout, password management. */
const app = new Hono<AuthContext>()
  .post(
    "/login",
    describeRoute({
      tags: ["Auth"],
      summary: "Login",
      description:
        "Authenticate with username and password. Returns a session token and sets a session cookie. " +
        "The session token can be used in the Authorization header (Bearer) or as a cookie for subsequent requests.",
      responses: {
        200: jsonResponse(AuthResponseSchema, "Login successful, returns session token and user data"),
        401: jsonResponse(ErrorResponseSchema, "Invalid username or password"),
      },
    }),
    v("json", LoginSchema),
    async (c) => {
      const { username, password } = c.req.valid("json");

      const user = await userService.getByUsername({ username });
      if (!user || !(await auth.pwd.verify(password, user.password_hash))) {
        return c.json({ message: "Invalid username or password" }, 401);
      }

      const sessionToken = await auth.session.create(c, user.id);
      const { password_hash: _, ...userWithoutPassword } = user;

      return c.json({ session_token: sessionToken, user: userWithoutPassword });
    },
  )
  .post(
    "/register",
    describeRoute({
      tags: ["Auth"],
      summary: "Register",
      description:
        "Create a new user account using an invite token. Invite tokens are created by admins and can only be used once. " +
        "Returns a session token and automatically logs in the new user.",
      responses: {
        200: jsonResponse(AuthResponseSchema, "Registration successful, returns session token and user data"),
        400: jsonResponse(
          ErrorResponseSchema,
          "Invalid invite token, username taken, or password requirements not met",
        ),
      },
    }),
    v("json", RegisterSchema),
    async (c) => {
      const { invite_token, username, password, passwordConfirm, acceptTerms } = c.req.valid("json");

      if (!acceptTerms) return c.json({ message: "You must accept the Terms of Service" }, 400);

      const passwordError = auth.pwd.validate(password, passwordConfirm);
      if (passwordError) return c.json({ message: passwordError }, 400);

      const inviteData = await redis.get(`invite:${invite_token}`);
      if (!inviteData) return c.json({ message: "Invalid or expired invite token" }, 400);

      const { real_name } = JSON.parse(inviteData);

      try {
        const user = await userService.create({
          username,
          passwordHash: await auth.pwd.hash(password),
          realName: real_name,
        });

        await redis.del(`invite:${invite_token}`);
        const sessionToken = await auth.session.create(c, user.id);

        return c.json({ session_token: sessionToken, user });
      } catch {
        return c.json({ message: "Unable to create user, username may already be taken" }, 400);
      }
    },
  )
  .post(
    "/logout",
    describeRoute({
      tags: ["Auth"],
      summary: "Logout",
      description: "Invalidate the current session and clear the session cookie.",
      ...requiresAuth,
      responses: {
        200: jsonResponse(MessageResponseSchema, "Session invalidated successfully"),
      },
    }),
    async (c) => {
      await auth.session.delete(c);
      return c.json({ message: "Logged out" });
    },
  )
  .post(
    "/change-password",
    describeRoute({
      tags: ["Auth"],
      summary: "Change password",
      description:
        "Change the password for the currently authenticated user. " +
        "Password must be at least 8 characters and contain uppercase, lowercase, and a number.",
      ...requiresAuth,
      responses: {
        200: jsonResponse(MessageResponseSchema, "Password changed successfully"),
        400: jsonResponse(ErrorResponseSchema, "Password requirements not met or passwords don't match"),
      },
    }),
    auth.middleware.requireAuth,
    v("json", ChangePasswordSchema),
    async (c) => {
      const { password, passwordConfirm } = c.req.valid("json");

      const passwordError = auth.pwd.validate(password, passwordConfirm);
      if (passwordError) return c.json({ message: passwordError }, 400);

      await userService.updatePassword({ id: c.get("user").id, passwordHash: await auth.pwd.hash(password) });

      return c.json({ message: "Password changed successfully" });
    },
  )
  .post(
    "/reset-password",
    describeRoute({
      tags: ["Auth"],
      summary: "Reset password",
      description:
        "Reset a user's password using a reset token. Reset tokens are created by admins for users who forgot their password. " +
        "After successful reset, returns a session token and logs in the user.",
      responses: {
        200: jsonResponse(AuthResponseSchema, "Password reset successful, returns session token and user data"),
        400: jsonResponse(ErrorResponseSchema, "Invalid or expired reset token, or password requirements not met"),
        404: jsonResponse(ErrorResponseSchema, "User associated with token not found"),
      },
    }),
    v("json", ResetPasswordSchema),
    async (c) => {
      const { reset_token, password, passwordConfirm } = c.req.valid("json");

      const passwordError = auth.pwd.validate(password, passwordConfirm);
      if (passwordError) return c.json({ message: passwordError }, 400);

      const resetData = await userService.getPasswordResetToken({ token: reset_token });
      if (!resetData) return c.json({ message: "Invalid or expired reset token" }, 400);

      const user = await userService.getById({ id: resetData.user_id });
      if (!user) return c.json({ message: "User not found" }, 404);

      await userService.updatePassword({ id: user.id, passwordHash: await auth.pwd.hash(password) });
      await userService.deletePasswordResetToken({ token: reset_token });

      const sessionToken = await auth.session.create(c, user.id);

      return c.json({ session_token: sessionToken, user });
    },
  );

export default app;
