import type { Context } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import { redis } from "bun";
import { env } from "@/shared/env";
import type { MessageResponse, User } from "@/shared/schemas";
import { userService } from "../services/users";
import { botService } from "../services/bots";

// ==========================
// Types
// ==========================

/** Hono context with authenticated user variables. */
export type AuthContext = {
  Variables: {
    user: User;
    sessionToken: string;
    /** True if authenticated via bot token instead of session */
    isBot: boolean;
  };
};

// ==========================
// Session Management
// ==========================

const session = {
  /** Extracts session token from cookie or Authorization header. */
  getToken: (c: Context): string | null => {
    const cookie = getCookie(c, "session_token");
    const bearer = c.req.header("Authorization")?.replace("Bearer ", "");
    return cookie || bearer || null;
  },

  /** Creates a new session and sets the session cookie. */
  create: async (c: Context, userId: string): Promise<string> => {
    const tokenPart = crypto.randomUUID();
    const token = `${userId}:${tokenPart}`;

    await redis.set(`session:${userId}:${tokenPart}`, "1", "EX", env.SESSION_EXPIRY_SECONDS);

    setCookie(c, "session_token", token, {
      httpOnly: true,
      secure: env.isProd,
      sameSite: "Lax",
      maxAge: env.SESSION_EXPIRY_SECONDS,
      path: "/",
    });
    return token;
  },

  /** Deletes the current session from Redis and clears the cookie. */
  delete: async (c: Context): Promise<void> => {
    const token = session.getToken(c);
    if (token) {
      const [userId, tokenPart] = token.split(":", 2);
      if (userId && tokenPart) {
        await redis.del(`session:${userId}:${tokenPart}`);
      }
    }
    deleteCookie(c, "session_token", { path: "/" });
  },

  /** Validates a session token and returns the associated user. */
  getUser: async (token: string): Promise<User | null> => {
    const [userId, tokenPart] = token.split(":", 2);
    if (!userId || !tokenPart) return null;

    const exists = await redis.get(`session:${userId}:${tokenPart}`);
    if (!exists) return null;

    return await userService.getById({ id: userId });
  },

  /** Deletes all sessions for a user (logout from all devices). */
  deleteAllForUser: async (userId: string): Promise<number> => {
    const pattern = `session:${userId}:*`;
    const keys = await redis.keys(pattern);
    if (keys.length === 0) return 0;

    await redis.del(...keys);
    return keys.length;
  },
};

// ==========================
// Middleware
// ==========================

const middleware = {
  /** Requires valid authentication (session token or bot token). Returns 401 if not authenticated. */
  requireAuth: createMiddleware<AuthContext>(async (c, next) => {
    // Check for bot token first (X-Bot-Token header)
    const botToken = c.req.header("X-Bot-Token");
    if (botToken) {
      const botId = await botService.verifyToken({ token: botToken });
      if (!botId) {
        return c.json({ message: "Invalid bot token" } as MessageResponse, 401);
      }

      const user = await userService.getById({ id: botId });
      if (!user || !user.is_bot) {
        return c.json({ message: "Bot not found" } as MessageResponse, 401);
      }

      c.set("user", user);
      c.set("sessionToken", "");
      c.set("isBot", true);
      return next();
    }

    // Fall back to session token
    const token = session.getToken(c);
    if (!token) return c.json({ message: "Authentication required" } as MessageResponse, 401);

    const user = await session.getUser(token);
    if (!user) return c.json({ message: "Invalid or expired session" } as MessageResponse, 401);

    c.set("user", user);
    c.set("sessionToken", token);
    c.set("isBot", false);
    await next();
  }),

  /** Requires admin role. Must be used after requireAuth. */
  requireAdmin: createMiddleware<AuthContext>(async (c, next) => {
    const user = c.get("user");
    if (!user || user.role !== "admin") {
      return c.json({ message: "Admin access required" } as MessageResponse, 403);
    }
    await next();
  }),

  /** Redirects to login page if not authenticated. For page routes. */
  redirectIfNotAuthenticated: createMiddleware<AuthContext>(async (c, next) => {
    const token = session.getToken(c);
    if (!token) return c.redirect("/auth/login");

    const user = await session.getUser(token);
    if (!user) return c.redirect("/auth/login");

    c.set("user", user);
    c.set("sessionToken", token);
    await next();
  }),

  /** Redirects to home if already authenticated. For login/register pages. */
  redirectIfAuthenticated: createMiddleware<AuthContext>(async (c, next) => {
    const token = session.getToken(c);
    if (token) {
      const user = await session.getUser(token);
      if (user) return c.redirect("/");
    }
    await next();
  }),
};

// ==========================
// Password Helpers
// ==========================

const pwd = {
  /**
   * Hashes a password using the Bun password hashing algorithm.
   * @param password - The password to hash.
   * @returns A promise that resolves to the hashed password.
   */
  hash: (password: string): Promise<string> => Bun.password.hash(password),
  /**
   * Validates a password and its confirmation.
   * @param password - The password to validate.
   * @param passwordConfirm - The password confirmation.
   * @returns Error message if validation fails, null if valid.
   */
  validate: (password: string, passwordConfirm: string): string | null => {
    if (!password || password.length < 8 || password.length > 128) {
      return "Password must be at least 8 characters long and less than 128 characters";
    } else if (password !== passwordConfirm) {
      return "Passwords do not match";
    } else if (!/^(?=.*[a-zA-Z])(?=.*[\d!@#$%^&*(),.?":{}|<>])/.test(password)) {
      return "Password must contain at least one letter and one number or special character";
    }
    return null;
  },
  /**
   * Verifies a password against a hash.
   * @param password - The password to verify.
   * @param hash - The hash to verify against.
   * @returns True if the password matches the hash, false otherwise.
   */
  verify: (password: string, hash: string): Promise<boolean> => Bun.password.verify(password, hash),
};

// Export

export const auth = {
  pwd,
  session,
  middleware,
};
