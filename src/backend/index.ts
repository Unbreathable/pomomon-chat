import { Hono } from "hono";
import { Scalar } from "@scalar/hono-api-reference";
import authRoutes from "./api/auth";
import adminRoutes from "./api/admin";
import usersRoutes from "./api/users";
import chatroomRoutes from "./api/chatrooms";
import messageRoutes from "./api/messages";
import gifRoutes from "./api/gifs";
import botRoutes from "./api/bots";
import websocketRoutes, { websocket } from "./api/websocket";
import { rateLimit } from "@/backend/lib/rate-limit";
import { openApiMeta } from "@/backend/lib/openapi";
import { generateSpecs } from "hono-openapi";
import { createMarkdownFromOpenApi } from "@scalar/openapi-to-markdown";
import { prettyJSON } from "hono/pretty-json";

/**
 * Main API router.
 * All routes are rate-limited and typed for RPC client generation.
 * Includes OpenAPI documentation at /docs and /openapi.json.
 */
const api = new Hono()
  .use(rateLimit.middleware)
  .use(prettyJSON())
  .route("/auth", authRoutes)
  .route("/admin", adminRoutes)
  .route("/users", usersRoutes)
  .route("/chatrooms", chatroomRoutes)
  .route("/messages", messageRoutes)
  .route("/gifs", gifRoutes)
  .route("/bots", botRoutes)
  .route("/ws", websocketRoutes);

const spec = await generateSpecs(api, openApiMeta);
const llms_txt = await createMarkdownFromOpenApi(JSON.stringify(spec));

// OpenAPI documentation routes (added separately to avoid circular reference)
api.get("/openapi.json", (c) => c.json(spec));
api.get(
  "/docs",
  Scalar({
    theme: "saturn",
    url: "/api/openapi.json",
    hideClientButton: true,
  }),
);

export default api;
export type ApiType = typeof api;
export { websocket, llms_txt };
