import { Hono } from "hono";
import { z } from "zod";
import { describeRoute } from "hono-openapi";
import { auth, type AuthContext } from "@/backend/lib/auth";
import { v } from "@/backend/lib/validator";
import { jsonResponse, requiresAuth } from "@/backend/lib/openapi";
import { gifService } from "@/backend/services/gifs";
import { ErrorResponseSchema } from "@/shared/schemas";
import { env } from "@/shared/env";

// GIF response schemas
const GifSchema = z.object({
  id: z.string().describe("Unique GIF identifier from Klipy"),
  url: z.string().describe("Full-size GIF URL (Klipy CDN)"),
  preview_url: z.string().describe("Preview/thumbnail URL"),
  width: z.number().describe("GIF width in pixels"),
  height: z.number().describe("GIF height in pixels"),
});

const GifListResponseSchema = z.object({
  gifs: z.array(GifSchema).describe("List of GIF objects"),
  has_next: z.boolean().describe("Whether more pages are available"),
});

/**
 * GIF routes: search, trending, and recent GIFs via Klipy API.
 */
const app = new Hono<AuthContext>()
  .get(
    "/",
    describeRoute({
      tags: ["GIFs"],
      summary: "Search or get trending GIFs",
      description:
        "Search for GIFs by keyword or get trending GIFs if no query is provided. " +
        "Powered by Klipy API. Results are paginated.",
      ...requiresAuth,
      responses: {
        200: jsonResponse(GifListResponseSchema, "List of GIFs"),
        503: jsonResponse(ErrorResponseSchema, "GIF service not configured"),
        500: jsonResponse(ErrorResponseSchema, "Failed to fetch from Klipy API"),
      },
    }),
    auth.middleware.requireAuth,
    v(
      "query",
      z.object({
        q: z.string().optional().describe("Search query (optional, returns trending if empty)"),
        page: z.coerce.number().int().positive().optional().default(1),
        per_page: z.coerce.number().int().min(1).max(50).optional().default(24),
      }),
    ),
    async (c) => {
      if (!env.KLIPY_API_KEY) {
        return c.json({ message: "GIF service not configured (KLIPY_API_KEY not set)" }, 503);
      }

      const { q, page, per_page } = c.req.valid("query");

      try {
        const result = q
          ? await gifService.search({ query: q, page, perPage: per_page })
          : await gifService.getTrending({ page, perPage: per_page });

        return c.json(result);
      } catch (error) {
        console.error("GIF API error:", error);
        return c.json({ message: "Failed to fetch GIFs" }, 500);
      }
    },
  )

  .get(
    "/recent",
    describeRoute({
      tags: ["GIFs"],
      summary: "Get recently used GIFs",
      description: "Returns the current user's recently used GIFs, ordered by most recent first.",
      ...requiresAuth,
      responses: {
        200: jsonResponse(GifListResponseSchema, "List of recently used GIFs"),
        503: jsonResponse(ErrorResponseSchema, "GIF service not configured"),
        500: jsonResponse(ErrorResponseSchema, "Failed to fetch recent GIFs"),
      },
    }),
    auth.middleware.requireAuth,
    v(
      "query",
      z.object({
        page: z.coerce.number().int().positive().optional().default(1),
        per_page: z.coerce.number().int().min(1).max(50).optional().default(24),
      }),
    ),
    async (c) => {
      if (!env.KLIPY_API_KEY) {
        return c.json({ message: "GIF service not configured (KLIPY_API_KEY not set)" }, 503);
      }

      const user = c.get("user");
      const { page, per_page } = c.req.valid("query");

      try {
        const result = await gifService.getRecent({
          userId: user.id,
          page,
          perPage: per_page,
        });

        return c.json(result);
      } catch (error) {
        console.error("GIF recent API error:", error);
        return c.json({ message: "Failed to fetch recent GIFs" }, 500);
      }
    },
  );

export default app;
