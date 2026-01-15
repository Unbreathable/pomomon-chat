import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { routes } from "@valentinkolb/ssr/adapter/hono";
import { logger } from "hono/logger";
import { config, html } from "@config";
import api, { websocket, llms_txt } from "@/backend";
import pages, { NotFound } from "@/frontend/pages";

// ==========================
// Main App
// ==========================

const redactSensitive = (str: string): string =>
  str.replace(/session_token=[^&\s]+/g, "session_token=[REDACTED]");

const app = new Hono()
  .use(
    logger((str, ...rest) => {
      console.log(redactSensitive(str), ...rest);
    }),
  )
  .route("/_ssr", routes(config))
  .route("/api", api)
  .get("/llms.txt", (c) => c.text(llms_txt))
  .use("/public/*", serveStatic({ root: "./" }))
  .route("/", pages)
  .notFound((c) => html(<NotFound />, { title: "Not Found", c }))
  .onError((err, c) => {
    console.log(err);
    return c.text("Internal Server Error", 500);
  });

// ==========================
// Server with WebSocket Support
// ==========================

export default {
  port: parseInt(process.env.PORT ?? "3000", 10),
  fetch: app.fetch,
  websocket,
};
