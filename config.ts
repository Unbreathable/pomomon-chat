import { createConfig } from "@valentinkolb/ssr";
import type { Context } from "hono";
import { getCookie } from "hono/cookie";

// custom page options, enabled typesafe html function
type PageOptions = {
  title?: string;
  description?: string;
  c: Context;
};

export const { config, plugin, html } = createConfig<PageOptions>({
  // config
  dev: process.env.NODE_ENV === "development", // whether development mode is enabled
  verbose: false, // enable debug logging

  // add custom html template
  template: ({ body, scripts, title, description, c }) => {
    const theme = (getCookie(c, "theme") ?? "dark") as "light" | "dark";
    return `<!DOCTYPE html>
<html lang="de" class="${theme}">
  <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="view-transition" content="same-origin">
    <title>${title ?? "Chat"}</title>
    <meta name="description" content="${description ?? "Chat"}">
    <meta name="theme-color" content="#09090b">
    <meta name="mobile-web-app-capable" content="yes">
    <link rel="icon" href="/public/favicon.ico">
    <link rel="stylesheet" href="/public/global.css">
    <script>
      (function() {
        const theme = document.cookie.match(/theme=([^;]+)/)?.[1] || 'light';
        document.documentElement.classList.add(theme);
      })();
    </script>
  </head>
  <body>
    ${body}
  </body>
  ${scripts}
</html>`;
  },
});
