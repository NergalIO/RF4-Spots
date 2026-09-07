import { existsSync, mkdirSync, chmodSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

export function updatesDir(): string {
  const cwd = existsSync(join(process.cwd(), "updates"))
    ? join(process.cwd(), "updates")
    : join(here, "..", "..", "..", "updates");
  if (!existsSync(cwd)) mkdirSync(cwd, { recursive: true });
  try {
    chmodSync(cwd, 0o755);
  } catch {
    /* windows / volume perms */
  }
  return cwd;
}

export function mapsDir(): string {
  return existsSync(join(process.cwd(), "assets", "maps"))
    ? join(process.cwd(), "assets", "maps")
    : join(here, "..", "..", "..", "assets", "maps");
}
