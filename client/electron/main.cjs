const { app, BrowserWindow, ipcMain, safeStorage, session } = require("electron");
const path = require("path");
const fs = require("fs");

const DEFAULT_SERVER_URL = "http://127.0.0.1:3780";
const isDev = !app.isPackaged;

function readPinned() {
  try {
    return JSON.parse(fs.readFileSync(path.join(__dirname, "..", "dist", "pinned-server.json"), "utf8"));
  } catch {
    return { url: "", allowed: "" };
  }
}

function isLoopbackHost(host) {
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}

function resolveServerUrl(candidate) {
  const pin = readPinned();
  const pinned = String(pin.url || "").replace(/\/$/, "");
  if (!isDev && pinned) return pinned;
  const allowed = String(pin.allowed || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const url = String(candidate || DEFAULT_SERVER_URL).replace(/\/$/, "");
  try {
    const parsed = new URL(url);
    if (parsed.username || parsed.password) return DEFAULT_SERVER_URL;
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return DEFAULT_SERVER_URL;
    if (!isDev && allowed.length) {
      const origin = parsed.origin.replace(/\/$/, "").toLowerCase();
      const ok = allowed.some((entry) => {
        try {
          if (entry.includes("://")) return new URL(entry).origin.replace(/\/$/, "").toLowerCase() === origin;
          return entry.toLowerCase() === parsed.host.toLowerCase() || entry.toLowerCase() === parsed.hostname.toLowerCase();
        } catch {
          return false;
        }
      });
      return ok ? url : DEFAULT_SERVER_URL;
    }
    if (!isDev && !isLoopbackHost(parsed.hostname)) return DEFAULT_SERVER_URL;
    return url;
  } catch {
    return DEFAULT_SERVER_URL;
  }
}

function configPath() {
  return path.join(app.getPath("userData"), "session.json");
}

function readStore() {
  try {
    const raw = JSON.parse(fs.readFileSync(configPath(), "utf8"));
    if (raw.tokenEnc && safeStorage.isEncryptionAvailable()) {
      try {
        raw.token = safeStorage.decryptString(Buffer.from(raw.tokenEnc, "base64"));
      } catch {
        raw.token = "";
      }
    }
    delete raw.tokenEnc;
    raw.serverUrl = resolveServerUrl(raw.serverUrl);
    return raw;
  } catch {
    return { serverUrl: resolveServerUrl(DEFAULT_SERVER_URL) };
  }
}

function writeStore(data) {
  const out = { serverUrl: resolveServerUrl(data.serverUrl || DEFAULT_SERVER_URL) };
  if (data.token && safeStorage.isEncryptionAvailable()) {
    out.tokenEnc = safeStorage.encryptString(data.token).toString("base64");
  } else {
    out.token = data.token || "";
  }
  fs.mkdirSync(path.dirname(configPath()), { recursive: true });
  fs.writeFileSync(configPath(), JSON.stringify(out, null, 2));
}

function updatesUrl(serverUrl) {
  return `${(serverUrl || DEFAULT_SERVER_URL).replace(/\/$/, "")}/updates`;
}

let splash = null;
let mainWindow = null;
let mainOpened = false;
let installing = false;
let downloading = false;
let splashTimer = null;

function sendSplash(payload) {
  if (splash && !splash.isDestroyed()) splash.webContents.send("updater:status", payload);
}

function clearSplashTimer() {
  if (splashTimer) {
    clearTimeout(splashTimer);
    splashTimer = null;
  }
}

function closeSplash() {
  if (splash && !splash.isDestroyed()) splash.close();
  splash = null;
}

function openMain() {
  if (mainOpened || installing) return;
  mainOpened = true;
  clearSplashTimer();
  sendSplash({ phase: "launch", message: "Запуск…" });
  createWindow();
}

function createSplash() {
  splash = new BrowserWindow({
    width: 420,
    height: 240,
    resizable: false,
    maximizable: false,
    minimizable: false,
    fullscreenable: false,
    center: true,
    frame: false,
    show: true,
    backgroundColor: "#07131c",
    title: "RF4 Spots",
    webPreferences: {
      preload: path.join(__dirname, "splash-preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  splash.setMenuBarVisibility(false);
  splash.loadFile(path.join(__dirname, "splash.html"));
  splash.on("close", (e) => {
    if (downloading || installing) e.preventDefault();
  });
  splash.on("closed", () => {
    splash = null;
    if (!mainOpened && !installing) openMain();
  });
}

function startUpdateCheck() {
  sendSplash({ phase: "check", message: "Проверка обновлений…" });
  splashTimer = setTimeout(() => openMain(), 20000);
  try {
    const { autoUpdater } = require("electron-updater");
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = false;
    autoUpdater.allowDowngrade = false;
    // Enable when the Windows installer is Authenticode-signed.
    autoUpdater.verifyUpdateCodeSignature = false;
    autoUpdater.setFeedURL({
      provider: "generic",
      url: updatesUrl(resolveServerUrl(readStore().serverUrl || DEFAULT_SERVER_URL)),
    });
    autoUpdater.on("checking-for-update", () => {
      sendSplash({ phase: "check", message: "Проверка обновлений…" });
    });
    autoUpdater.on("update-available", (info) => {
      clearSplashTimer();
      downloading = true;
      const version = info && info.version ? info.version : "";
      sendSplash({
        phase: "available",
        percent: 0,
        message: version ? `Загрузка версии ${version}…` : "Загрузка обновления…",
      });
    });
    autoUpdater.on("update-not-available", () => {
      sendSplash({ phase: "none", message: "Обновлений нет" });
      openMain();
    });
    autoUpdater.on("download-progress", (prog) => {
      const percent = prog && typeof prog.percent === "number" ? prog.percent : 0;
      sendSplash({
        phase: "download",
        percent,
        message: "Загрузка обновления…",
      });
    });
    autoUpdater.on("update-downloaded", () => {
      installing = true;
      clearSplashTimer();
      sendSplash({ phase: "install", percent: 100, message: "Установка и запуск…" });
      setTimeout(() => {
        try {
          autoUpdater.quitAndInstall(true, true);
        } catch (err) {
          console.error("auto-update install:", err);
          installing = false;
          openMain();
        }
      }, 400);
    });
    autoUpdater.on("error", (err) => {
      console.error("auto-update:", err == null ? "unknown" : err.message || err);
      downloading = false;
      sendSplash({ phase: "error", message: "Сервер обновлений недоступен" });
      setTimeout(() => openMain(), 700);
    });
    void autoUpdater.checkForUpdates();
  } catch (err) {
    console.error("auto-update:", err);
    openMain();
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    show: false,
    backgroundColor: "#07131c",
    title: "RF4 Spots",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
    },
  });
  mainWindow.setMenuBarVisibility(false);
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
  if (isDev) {
    mainWindow.loadURL("http://127.0.0.1:5173");
    mainWindow.show();
    return;
  }
  mainWindow.once("ready-to-show", () => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.show();
    closeSplash();
  });
  setTimeout(() => {
    if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible()) mainWindow.show();
    closeSplash();
  }, 4000);
  mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));
}

app.setAppUserModelId("com.rf4spots.app");

app.on("web-contents-created", (_event, contents) => {
  if (contents.getType() !== "webview") return;
  contents.setWindowOpenHandler(({ url }) => {
    if (url) void contents.loadURL(url);
    return { action: "deny" };
  });
});

app.whenReady().then(async () => {
  ipcMain.handle("store:get", () => readStore());
  ipcMain.handle("store:set", (_e, data) => {
    writeStore(data);
    return true;
  });
  await session.defaultSession.clearCache();
  if (isDev) {
    createWindow();
  } else {
    createSplash();
    startUpdateCheck();
  }
});

app.on("window-all-closed", () => {
  if (installing) return;
  if (process.platform !== "darwin") app.quit();
});
