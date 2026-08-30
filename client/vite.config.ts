import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

const here = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(resolve(here, "package.json"), "utf8")) as { version: string };

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, here, "VITE_");
  const payload = JSON.stringify(
    {
      url: String(env.VITE_SERVER_URL ?? process.env.VITE_SERVER_URL ?? "").trim().replace(/\/$/, ""),
      allowed: String(env.VITE_ALLOWED_SERVERS ?? process.env.VITE_ALLOWED_SERVERS ?? "").trim(),
    },
    null,
    2,
  );
  return {
    plugins: [
      react(),
      {
        name: "pinned-server",
        closeBundle() {
          writeFileSync(resolve(here, "dist", "pinned-server.json"), payload);
        },
      },
    ],
    base: "./",
    define: { __APP_VERSION__: JSON.stringify(pkg.version) },
    resolve: { alias: { "@": resolve(here, "src") } },
    server: { port: 5173, strictPort: true },
    build: { outDir: "dist", emptyOutDir: true },
  };
});
