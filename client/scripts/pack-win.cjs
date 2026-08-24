const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const clientDir = path.join(__dirname, "..");
const releaseDir = path.join(clientDir, "release");

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function removePath(target) {
  for (let i = 0; i < 10; i++) {
    try {
      fs.rmSync(target, { recursive: true, force: true });
      return;
    } catch (err) {
      if (i === 9) {
        throw new Error(
          `Не удалось удалить ${target} (${err.code || err.message}). Закройте папку в Проводнике и повторите npm run pack.`,
        );
      }
      sleep(400 * (i + 1));
    }
  }
}

function cleanRelease() {
  if (!fs.existsSync(releaseDir)) return;
  for (const name of fs.readdirSync(releaseDir)) {
    if (name.endsWith(".lock") || name.startsWith("win-unpacked")) {
      removePath(path.join(releaseDir, name));
    }
  }
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: clientDir,
    env: { ...process.env, CSC_IDENTITY_AUTO_DISCOVERY: "false" },
    stdio: "inherit",
    shell: true,
  });
  return result.status ?? 1;
}

cleanRelease();

const buildStatus = run("npm", ["run", "build"]);
if (buildStatus !== 0) process.exit(buildStatus);

let packStatus = 1;
for (let attempt = 1; attempt <= 4; attempt++) {
  packStatus = run("npx", ["electron-builder", "--win", "nsis"]);
  if (packStatus === 0) break;
  console.warn(`\nelectron-builder не смог упаковать приложение (попытка ${attempt}/4). Жду и пробую снова...\n`);
  cleanRelease();
  sleep(2000 * attempt);
}

process.exit(packStatus);
