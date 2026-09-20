const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const clientDir = path.join(__dirname, "..");
const distDir = path.join(clientDir, "dist");
const webDir = path.join(clientDir, "..", "server", "web");

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: clientDir,
    env: { ...process.env },
    stdio: "inherit",
    shell: true,
  });
  return result.status ?? 1;
}

function emptyWebDir() {
  fs.mkdirSync(webDir, { recursive: true });
  for (const name of fs.readdirSync(webDir)) {
    if (name === ".gitkeep") continue;
    fs.rmSync(path.join(webDir, name), { recursive: true, force: true });
  }
}

const viteStatus = run("npm", ["run", "build"]);
if (viteStatus !== 0) process.exit(viteStatus);

if (!fs.existsSync(path.join(distDir, "index.html"))) {
  console.error("Нет client/dist/index.html после сборки");
  process.exit(1);
}

emptyWebDir();
for (const name of fs.readdirSync(distDir)) {
  fs.cpSync(path.join(distDir, name), path.join(webDir, name), { recursive: true });
}

const indexPath = path.join(webDir, "index.html");
const html = fs.readFileSync(indexPath, "utf8").replaceAll("=\"./assets/", "=\"/assets/");
fs.writeFileSync(indexPath, html);

console.log(`Веб-клиент скопирован в ${path.relative(path.join(clientDir, ".."), webDir)}`);
