const { spawnSync } = require("child_process");
const fs = require("fs");
const http = require("http");
const https = require("https");
const os = require("os");
const path = require("path");
const { URL } = require("url");

const GRADLE_VERSION = "8.14.3";
const clientDir = path.join(__dirname, "..");
const androidDir = path.join(clientDir, "android");
const releaseDir = path.join(clientDir, "release");
const toolsDir = path.join(clientDir, ".tools");
const updatesDir = path.join(clientDir, "..", "server", "updates");

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function removePath(target) {
  for (let i = 0; i < 10; i++) {
    try {
      fs.rmSync(target, { recursive: true, force: true });
      return;
    } catch (err) {
      if (i === 9) throw err;
      sleep(400 * (i + 1));
    }
  }
}

function run(command, args, opts = {}) {
  const cwd = opts.cwd || clientDir;
  const env = opts.env || process.env;
  if (process.platform === "win32") {
    const line = [command, ...args]
      .map((part) => (/\s/.test(String(part)) ? `"${part}"` : String(part)))
      .join(" ");
    const result = spawnSync(line, { cwd, env, stdio: "inherit", shell: true, windowsHide: true });
    return result.status ?? 1;
  }
  const result = spawnSync(command, args, { cwd, env, stdio: "inherit" });
  return result.status ?? 1;
}

function versionCode(version) {
  const [maj, min, pat] = String(version).split(".").map((n) => parseInt(n, 10) || 0);
  return maj * 10000 + min * 100 + pat;
}

function downloadFile(url, dest, hops = 0) {
  return new Promise((resolve, reject) => {
    if (hops > 8) {
      reject(new Error(`Слишком много редиректов: ${url}`));
      return;
    }
    const tmp = `${dest}.part`;
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    const file = fs.createWriteStream(tmp);
    const getter = url.startsWith("http://") ? http : https;
    const req = getter.get(url, { headers: { "User-Agent": "rf4-spots-pack-apk" } }, (res) => {
      const loc = res.headers.location;
      if (res.statusCode >= 300 && res.statusCode < 400 && loc) {
        file.close();
        fs.unlink(tmp, () => {});
        downloadFile(new URL(loc, url).href, dest, hops + 1).then(resolve, reject);
        return;
      }
      if (res.statusCode !== 200) {
        file.close();
        fs.unlink(tmp, () => {});
        reject(new Error(`Не удалось скачать ${url} (${res.statusCode})`));
        return;
      }
      res.pipe(file);
      file.on("finish", () => {
        file.close(() => {
          fs.renameSync(tmp, dest);
          resolve();
        });
      });
    });
    req.on("error", (err) => {
      file.close();
      fs.unlink(tmp, () => {});
      reject(err);
    });
  });
}

function findAndroidSdk() {
  const home = os.homedir();
  const candidates = [
    process.env.ANDROID_SDK_ROOT,
    process.env.ANDROID_HOME,
    process.platform === "win32" && process.env.LOCALAPPDATA
      ? path.join(process.env.LOCALAPPDATA, "Android", "Sdk")
      : "",
    process.platform === "darwin" ? path.join(home, "Library", "Android", "sdk") : "",
    path.join(home, "Android", "Sdk"),
    "/opt/android",
    "/opt/android-sdk",
    "/opt/sdk",
    "/opt/android-sdk-linux",
  ].filter(Boolean);
  return candidates.find(
    (dir) =>
      fs.existsSync(dir) &&
      (fs.existsSync(path.join(dir, "platform-tools")) ||
        fs.existsSync(path.join(dir, "platforms")) ||
        fs.existsSync(path.join(dir, "cmdline-tools"))),
  );
}

function findSdkManager(sdk) {
  const exe = process.platform === "win32" ? "sdkmanager.bat" : "sdkmanager";
  const dirs = [];
  const cmd = path.join(sdk, "cmdline-tools");
  if (fs.existsSync(cmd)) {
    for (const item of fs.readdirSync(cmd)) {
      dirs.push(path.join(cmd, item, "bin"));
    }
  }
  dirs.push(path.join(sdk, "tools", "bin"));
  for (const dir of dirs) {
    const full = path.join(dir, exe);
    if (fs.existsSync(full)) return full;
  }
  return "";
}

function javaBin(home) {
  return path.join(home, "bin", process.platform === "win32" ? "java.exe" : "java");
}

function javaMajor(home) {
  const bin = javaBin(home);
  if (!fs.existsSync(bin)) return 0;
  const result = spawnSync(bin, ["-version"], { encoding: "utf8" });
  const text = `${result.stderr || ""}${result.stdout || ""}`;
  const m = text.match(/version "(\d+)/);
  return m ? Number(m[1]) : 0;
}

function findJavaHome() {
  const homes = [];
  if (process.env.JAVA_HOME) homes.push(process.env.JAVA_HOME);
  const roots = [];
  if (process.platform === "win32") {
    roots.push("C:\\Program Files\\Java", "C:\\Program Files\\Eclipse Adoptium", "C:\\Program Files\\Microsoft");
    roots.push("C:\\Program Files\\Android\\Android Studio\\jbr");
    if (process.env.LOCALAPPDATA) {
      roots.push(path.join(process.env.LOCALAPPDATA, "Programs", "Android Studio", "jbr"));
    }
  } else if (process.platform === "darwin") {
    roots.push("/Library/Java/JavaVirtualMachines", "/Applications/Android Studio.app/Contents/jbr");
  } else {
    roots.push("/usr/lib/jvm");
  }
  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    if (fs.existsSync(javaBin(root))) homes.push(root);
    else {
      for (const name of fs.readdirSync(root)) homes.push(path.join(root, name));
    }
  }
  const scored = [];
  const seen = new Set();
  for (const home of homes) {
    const resolved = fs.existsSync(home) ? fs.realpathSync(home) : home;
    if (seen.has(resolved)) continue;
    seen.add(resolved);
    const major = javaMajor(home);
    if (major >= 17 && major <= 24) scored.push({ home, major });
  }
  scored.sort((a, b) => b.major - a.major);
  if (!scored.length) {
    throw new Error("Нужен JDK 17–24 (JAVA_HOME). Gradle не собирает APK на Java 25+.");
  }
  console.log("JDK", scored[0].major, scored[0].home);
  return scored[0].home;
}

function listPlatforms(sdk) {
  const dir = path.join(sdk, "platforms");
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    const m = name.match(/^android-(\d+)/);
    if (m) out.push(Number(m[1]));
  }
  return out;
}

function pickCompileSdk(installed) {
  const usable = installed.filter((n) => n >= 34 && n <= 36);
  return usable.length ? Math.max(...usable) : 0;
}

function ensurePlatform(sdk) {
  let level = pickCompileSdk(listPlatforms(sdk));
  if (level) return level;
  const sm = findSdkManager(sdk);
  if (!sm) {
    throw new Error(
      "Нужен Android SDK 34+. Установите Android Studio (SDK Platform) и задайте ANDROID_HOME.",
    );
  }
  console.log("Устанавливаю Android SDK platform 36…");
  const status = run(sm, [`--sdk_root=${sdk}`, "platforms;android-36", "build-tools;36.0.0"], {
    cwd: sdk,
  });
  level = pickCompileSdk(listPlatforms(sdk));
  if (status === 0 && level) return level;
  throw new Error(
    "Не удалось поставить platform 36. Откройте Android Studio → SDK Manager и примите лицензии.",
  );
}

function writeLocalProperties(sdk) {
  const sdkDir = sdk.replace(/\\/g, "/");
  fs.writeFileSync(path.join(androidDir, "local.properties"), `sdk.dir=${sdkDir}\n`);
}

function findKeytool(javaHome) {
  const name = process.platform === "win32" ? "keytool.exe" : "keytool";
  const full = path.join(javaHome, "bin", name);
  if (fs.existsSync(full)) return full;
  return name;
}

function ensureKeystore(javaHome) {
  if (process.env.ANDROID_KEYSTORE && fs.existsSync(process.env.ANDROID_KEYSTORE)) {
    return process.env.ANDROID_KEYSTORE;
  }
  const ks = path.join(androidDir, "rf4spots.keystore");
  if (fs.existsSync(ks)) return ks;
  console.log("Создаю ключ подписи sideload (android/rf4spots.keystore)…");
  const status = run(findKeytool(javaHome), [
    "-genkeypair",
    "-keystore",
    ks,
    "-alias",
    "rf4spots",
    "-keyalg",
    "RSA",
    "-keysize",
    "2048",
    "-validity",
    "10000",
    "-storepass",
    "android",
    "-keypass",
    "android",
    "-dname",
    "CN=RF4 Spots, OU=RF4, O=RF4 Spots, C=RU",
  ]);
  if (status !== 0) {
    throw new Error("keytool не создал ключ. Нужен JDK 17–24 (JAVA_HOME).");
  }
  return ks;
}

function copyDistToAssets() {
  const dist = path.join(clientDir, "dist");
  const assets = path.join(androidDir, "app", "src", "main", "assets");
  if (!fs.existsSync(path.join(dist, "index.html"))) {
    throw new Error("Нет client/dist/index.html — сначала должна пройти vite-сборка.");
  }
  fs.mkdirSync(assets, { recursive: true });
  for (const name of fs.readdirSync(assets)) {
    if (name === ".gitkeep") continue;
    removePath(path.join(assets, name));
  }
  fs.cpSync(dist, assets, { recursive: true });
}

function pruneOldApks(dir, keepVersion) {
  if (!fs.existsSync(dir)) return [];
  const keep = `RF4Spots-${keepVersion}.apk`;
  const removed = [];
  for (const name of fs.readdirSync(dir)) {
    if (!/^RF4Spots-\d+\.\d+\.\d+\.apk$/i.test(name) || name === keep) continue;
    removePath(path.join(dir, name));
    removed.push(name);
  }
  return removed;
}

function readMagic(filePath) {
  const fd = fs.openSync(filePath, "r");
  try {
    const buf = Buffer.alloc(4);
    fs.readSync(fd, buf, 0, 4, 0);
    return buf;
  } finally {
    fs.closeSync(fd);
  }
}

function isGzipFile(filePath) {
  const buf = readMagic(filePath);
  return buf[0] === 0x1f && buf[1] === 0x8b;
}

function isZipFile(filePath) {
  const buf = readMagic(filePath);
  return buf[0] === 0x50 && buf[1] === 0x4b;
}

function chmodGradle(bin) {
  try {
    fs.chmodSync(bin, 0o755);
  } catch {
    /* windows */
  }
}

function jarBin() {
  const name = process.platform === "win32" ? "jar.exe" : "jar";
  if (process.env.JAVA_HOME) {
    const full = path.join(process.env.JAVA_HOME, "bin", name);
    if (fs.existsSync(full)) return full;
  }
  return name;
}

function extractGradle(archive) {
  if (isZipFile(archive) && process.platform === "win32") {
    return spawnSync("tar", ["-xf", archive, "-C", toolsDir], { stdio: "inherit" }).status ?? 1;
  }
  if (isZipFile(archive)) {
    const unzip = spawnSync("unzip", ["-qo", archive, "-d", toolsDir], { stdio: "inherit" });
    if ((unzip.status ?? 1) === 0) return 0;
    const py = spawnSync("python3", ["-m", "zipfile", "-e", archive, toolsDir], { stdio: "inherit" });
    if ((py.status ?? 1) === 0) return 0;
    return spawnSync(jarBin(), ["xf", archive], { cwd: toolsDir, stdio: "inherit" }).status ?? 1;
  }
  if (isGzipFile(archive)) {
    return spawnSync("tar", ["-xzf", archive, "-C", toolsDir], { stdio: "inherit" }).status ?? 1;
  }
  return 1;
}

async function ensureGradle() {
  const gradleHome = path.join(toolsDir, `gradle-${GRADLE_VERSION}`);
  const bin = path.join(gradleHome, "bin", process.platform === "win32" ? "gradle.bat" : "gradle");
  if (fs.existsSync(bin)) {
    chmodGradle(bin);
    return bin;
  }
  const archiveName = `gradle-${GRADLE_VERSION}-bin.zip`;
  const archive = path.join(toolsDir, archiveName);
  const url = `https://services.gradle.org/distributions/${archiveName}`;
  const valid = () => fs.existsSync(archive) && fs.statSync(archive).size > 1_000_000 && isZipFile(archive);
  if (!valid()) {
    if (fs.existsSync(archive)) fs.unlinkSync(archive);
    fs.mkdirSync(toolsDir, { recursive: true });
    console.log("Скачиваю Gradle", GRADLE_VERSION, "…");
    await downloadFile(url, archive);
    if (!valid()) {
      if (fs.existsSync(archive)) fs.unlinkSync(archive);
      throw new Error("Скачанный Gradle повреждён. Повторите сборку.");
    }
  }
  console.log("Распаковываю Gradle…");
  fs.mkdirSync(toolsDir, { recursive: true });
  const status = extractGradle(archive);
  if (status !== 0 || !fs.existsSync(bin)) {
    try {
      fs.unlinkSync(archive);
    } catch {
      /* ignore */
    }
    throw new Error("Не удалось распаковать Gradle.");
  }
  chmodGradle(bin);
  return bin;
}

function publishApk(version) {
  const built = path.join(androidDir, "app", "build", "outputs", "apk", "release", "app-release.apk");
  if (!fs.existsSync(built)) {
    throw new Error("Gradle не собрал app-release.apk");
  }
  const name = `RF4Spots-${version}.apk`;
  fs.mkdirSync(releaseDir, { recursive: true });
  fs.mkdirSync(updatesDir, { recursive: true });
  fs.copyFileSync(built, path.join(releaseDir, name));
  fs.copyFileSync(built, path.join(updatesDir, name));
  console.log("server/updates ←", name);
  const removed = pruneOldApks(updatesDir, version);
  if (removed.length) console.log("удалены старые APK:", removed.join(", "));
  console.log(
    process.env.PACK_ON_SERVER
      ? "APK лежит в server/updates и отдаётся как /updates/apk"
      : "Скопируйте server/updates на Linux-сервер (файлы большие, в git их нет).",
  );
}

async function main() {
  if (!process.env.VITE_SERVER_URL && !process.env.VITE_ALLOWED_SERVERS) {
    console.warn(
      "VITE_SERVER_URL не задан: APK сможет ходить только на localhost. Для продакшена: set VITE_SERVER_URL=https://ваш-домен",
    );
  }

  const sdk = findAndroidSdk();
  if (!sdk) {
    throw new Error(
      "Android SDK не найден. Установите Android Studio, откройте SDK Manager (platform 34+) и задайте ANDROID_HOME.",
    );
  }
  const javaHome = findJavaHome();
  process.env.JAVA_HOME = javaHome;
  const compileSdk = ensurePlatform(sdk);
  writeLocalProperties(sdk);
  ensureKeystore(javaHome);

  const viteStatus = run("npm", ["run", "build"]);
  if (viteStatus !== 0) process.exit(viteStatus);
  copyDistToAssets();

  const pkg = JSON.parse(fs.readFileSync(path.join(clientDir, "package.json"), "utf8"));
  const version = pkg.version;
  const gradle = await ensureGradle();
  const env = {
    ...process.env,
    JAVA_HOME: javaHome,
    ANDROID_HOME: sdk,
    ANDROID_SDK_ROOT: sdk,
  };
  const status = run(
    gradle,
    [
      "assembleRelease",
      `-PappVersion=${version}`,
      `-PappVersionCode=${versionCode(version)}`,
      `-PcompileSdk=${compileSdk}`,
    ],
    { cwd: androidDir, env },
  );
  if (status !== 0) process.exit(status);
  publishApk(version);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
