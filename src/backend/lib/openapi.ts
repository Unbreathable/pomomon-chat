import { resolver, type GenerateSpecOptions } from "hono-openapi";
import type { ZodType } from "zod";

import apiDescription from "@docs/api-description.md" with { type: "text" };
import { env } from "@/shared/env";

// ==========================
// Response Helpers
// ==========================

/**
 * Helper to define JSON response schema for OpenAPI documentation.
 *
 * @param schema - Zod schema for the response body
 * @param description - Human-readable description of the response
 * @returns OpenAPI response object with application/json content type
 */
export const jsonResponse = <T extends ZodType>(schema: T, description: string) => ({
  description,
  content: {
    "application/json": {
      schema: resolver(schema),
    },
  },
});

/**
 * Helper to define image response for OpenAPI documentation.
 *
 * @param description - Human-readable description of the response
 * @returns OpenAPI response object with image/webp content type
 */
export const imageResponse = (description: string) => ({
  description,
  content: {
    "image/webp": {
      schema: { type: "string" as const, format: "binary" },
    },
  },
});

// ==========================
// OpenAPI Specification
// ==========================

/**
 * OpenAPI spec metadata for the API documentation.
 * Includes info, tags, and security schemes.
 */
export const openApiMeta: Partial<GenerateSpecOptions> = {
  documentation: {
    info: {
      title: `${env.APP_NAME} API`,
      version: "0.0.1",
      description: apiDescription,
    },
    servers: [{ url: "/api", description: "API Server" }],
    tags: [
      { name: "Auth", description: "Authentication endpoints (login, register, logout)" },
      { name: "Users", description: "User management and profiles" },
      { name: "Chatrooms", description: "Chatroom CRUD, membership, and messaging" },
      { name: "Messages", description: "Message content (images)" },
      { name: "Admin", description: "Admin-only operations (requires admin role)" },
      { name: "GIFs", description: "GIF search via Klipy API" },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "session_token",
          description: "Session cookie (automatically set after login)",
        },
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          description: "Bearer token in Authorization header",
        },
        wsQueryAuth: {
          type: "apiKey",
          in: "query",
          name: "session_token",
          description: "Session token as query parameter (WebSocket connections only)",
        },
      },
    },
  },
};

// ==========================
// Security Requirements
// ==========================

/**
 * Security requirement for routes that need authentication.
 * Accepts either cookie or bearer token.
 * Use with spread operator in describeRoute: `...requiresAuth`
 */
export const requiresAuth = {
  security: [{ cookieAuth: [] as string[], bearerAuth: [] as string[] }],
};

/**
 * Security requirement for routes that need admin role.
 * Accepts either cookie or bearer token.
 * Use with spread operator in describeRoute: `...requiresAdmin`
 *
 * Note: This only documents the requirement - actual enforcement
 * must be done with auth.middleware.requireAdmin middleware.
 */
export const requiresAdmin = {
  security: [{ cookieAuth: [] as string[], bearerAuth: [] as string[] }],
};
