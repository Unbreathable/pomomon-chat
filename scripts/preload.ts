import { plugin } from "@config";
import tailwind from "bun-plugin-tailwind";

Bun.plugin(plugin());

// Build CSS to public folder for dev mode
await Bun.build({
  entrypoints: ["src/frontend/styles/global.css"],
  outdir: "public",
  plugins: [tailwind],
});
