import { defineConfig } from "vitest/config";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: { alias: { "@": resolve(here, "src") } },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
