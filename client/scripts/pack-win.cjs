const { spawnSync } = require("child_process");
const crypto = require("crypto");
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

if (!process.env.VITE_SERVER_URL && !process.env.VITE_ALLOWED_SERVERS) {
  console.warn(
    "VITE_SERVER_URL не задан: установленный клиент сможет ходить только на localhost. Для продакшена: set VITE_SERVER_URL=https://ваш-домен",
  );
}

const buildStatus = run("npm", ["run", "build"]);
if (buildStatus !== 0) process.exit(buildStatus);

const pinnedPath = path.join(clientDir, "dist", "pinned-server.json");
if (!fs.existsSync(pinnedPath)) {
  fs.writeFileSync(
    pinnedPath,
    JSON.stringify(
      {
        url: String(process.env.VITE_SERVER_URL || "").trim().replace(/\/$/, ""),
        allowed: String(process.env.VITE_ALLOWED_SERVERS || "").trim(),
      },
      null,
      2,
    ),
  );
}

function sha512File(filePath) {
  const hash = crypto.createHash("sha512");
  hash.update(fs.readFileSync(filePath));
  return hash.digest("base64");
}

function publishUpdates() {
  const pkg = JSON.parse(fs.readFileSync(path.join(clientDir, "package.json"), "utf8"));
  const version = pkg.version;
  const exeName = `RF4Spots-Setup-${version}.exe`;
  const exePath = path.join(releaseDir, exeName);
  if (!fs.existsSync(exePath)) {
    console.warn(`Нет установщика ${exeName}, папка обновлений не заполнена.`);
    return;
  }
  const sha = sha512File(exePath);
  const size = fs.statSync(exePath).size;
  const yml = [
    `version: ${version}`,
    "files:",
    `  - url: ${exeName}`,
    `    sha512: ${sha}`,
    `    size: ${size}`,
    `path: ${exeName}`,
    `sha512: ${sha}`,
    `releaseDate: ${new Date().toISOString()}`,
    "",
  ].join("\n");
  fs.writeFileSync(path.join(releaseDir, "latest.yml"), yml);

  const dest = path.join(clientDir, "..", "server", "updates");
  fs.mkdirSync(dest, { recursive: true });
  const copyNames = [exeName, "latest.yml", `${exeName}.blockmap`].filter((name) =>
    fs.existsSync(path.join(releaseDir, name)),
  );
  for (const name of copyNames) {
    fs.copyFileSync(path.join(releaseDir, name), path.join(dest, name));
    console.log("server/updates ←", name);
  }
  console.log(
    process.env.PACK_ON_SERVER
      ? "Установщик лежит в server/updates и отдаётся как /updates."
      : "Скопируйте server/updates на Linux-сервер (файлы большие, в git их нет).",
  );
}

let packStatus = 1;
for (let attempt = 1; attempt <= 4; attempt++) {
  packStatus = run(
    "npx",
    process.platform === "win32"
      ? ["electron-builder", "--win", "nsis", "-c.electronDist=node_modules/electron/dist"]
      : ["electron-builder", "--win", "nsis"],
  );
  if (packStatus === 0) break;
  console.warn(`\nelectron-builder не смог упаковать приложение (попытка ${attempt}/4). Жду и пробую снова...\n`);
  cleanRelease();
  sleep(2000 * attempt);
}

if (packStatus === 0) publishUpdates();
process.exit(packStatus);
