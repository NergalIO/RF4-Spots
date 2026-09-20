import { createServer } from "node:http";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import express from "express";
import { afterEach, describe, expect, it } from "vitest";
import { mountWebApp } from "./staticAssets.js";

const dirs: string[] = [];

afterEach(() => {
  while (dirs.length) {
    rmSync(dirs.pop()!, { recursive: true, force: true });
  }
});

function tempWebDir() {
  const dir = mkdtempSync(join(tmpdir(), "rf4-web-"));
  dirs.push(dir);
  return dir;
}

function listen(app: express.Express) {
  const server = createServer(app);
  return new Promise<{ url: string; close: () => Promise<void> }>((resolve, reject) => {
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      if (!addr || typeof addr === "string") {
        reject(new Error("нет порта"));
        return;
      }
      resolve({
        url: `http://127.0.0.1:${addr.port}`,
        close: () =>
          new Promise((done, fail) => {
            server.close((err) => (err ? fail(err) : done()));
          }),
      });
    });
  });
}

describe("mountWebApp", () => {
  it("отдаёт assets, даже если index.html появился после старта", async () => {
    const dir = tempWebDir();
    const app = express();
    mountWebApp(app, dir);
    const { url, close } = await listen(app);
    try {
      const before = await fetch(`${url}/`);
      expect(before.status).toBe(200);
      expect(await before.text()).not.toContain('id="root"');

      mkdirSync(join(dir, "assets"));
      writeFileSync(
        join(dir, "index.html"),
        `<!doctype html><html><script type="module" src="/assets/app.js"></script><div id="root"></div></html>`,
      );
      writeFileSync(join(dir, "assets", "app.js"), "window.__RF4=1;");

      const html = await fetch(`${url}/`);
      expect(await html.text()).toContain('id="root"');

      const js = await fetch(`${url}/assets/app.js`);
      expect(js.status).toBe(200);
      expect(await js.text()).toContain("window.__RF4=1");
    } finally {
      await close();
    }
  });
});
