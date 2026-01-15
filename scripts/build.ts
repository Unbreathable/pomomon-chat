// Set NODE_ENV for production build
process.env.NODE_ENV = "production";

import { plugin } from "@config";
import tailwind from "bun-plugin-tailwind";

// Which entrypoint to build
const entry = Bun.argv[2] ?? "app.tsx";

// Build server + islands + copy public directory
await Bun.build({
  entrypoints: [`src/${entry}`],
  outdir: "dist",
  target: "bun",
  minify: true,
  plugins: [plugin(), tailwind],
});

console.log(`Built src/${entry} -> dist/${entry}`);

// Build CSS to public folder
await Bun.build({
  entrypoints: ["src/frontend/styles/global.css"],
  outdir: "dist/public",
  minify: true,
  plugins: [tailwind],
});

console.log(`Built src/frontend/styles/global.css -> dist/public/global.css`);
