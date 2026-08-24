const { app, BrowserWindow, ipcMain, safeStorage, session, dialog } = require("electron");
const path = require("path");
const fs = require("fs");

const DEFAULT_SERVER_URL = "http://2.26.113.22:3780";
const isDev = !app.isPackaged;

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
    return raw;
  } catch {
    return { serverUrl: DEFAULT_SERVER_URL };
  }
}

function writeStore(data) {
  const out = { serverUrl: data.serverUrl || DEFAULT_SERVER_URL };
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

let updaterReady = false;
let installPrompted = false;

function configureUpdater(serverUrl) {
  if (isDev) return;
  const { autoUpdater } = require("electron-updater");
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowDowngrade = false;
  autoUpdater.verifyUpdateCodeSignature = false;
  autoUpdater.setFeedURL({
    provider: "generic",
    url: updatesUrl(serverUrl),
  });
  if (updaterReady) return;
  updaterReady = true;
  autoUpdater.on("error", (err) => {
    console.error("auto-update:", err == null ? "unknown" : err.message || err);
  });
  autoUpdater.on("update-downloaded", (info) => {
    if (installPrompted) return;
    installPrompted = true;
    const version = info && info.version ? info.version : "";
    dialog
      .showMessageBox({
        type: "info",
        title: "RF4 Spots",
        message: version ? `Загружена версия ${version}` : "Загружено обновление",
        detail: "Перезапустить приложение и установить сейчас? Иначе обновление встанет при следующем выходе.",
        buttons: ["Перезапустить", "Позже"],
        defaultId: 0,
        cancelId: 1,
        noLink: true,
      })
      .then(({ response }) => {
        if (response === 0) autoUpdater.quitAndInstall(false, true);
      })
      .catch(() => {});
  });
}

function checkForUpdates() {
  if (isDev) return;
  try {
    const { autoUpdater } = require("electron-updater");
    configureUpdater(readStore().serverUrl || DEFAULT_SERVER_URL);
    void autoUpdater.checkForUpdates();
  } catch (err) {
    console.error("auto-update:", err);
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: "#07131c",
    title: "RF4 Spots",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.setMenuBarVisibility(false);
  if (isDev) {
    win.loadURL("http://127.0.0.1:5173");
  } else {
    win.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }
}

app.setAppUserModelId("com.rf4spots.app");

app.whenReady().then(async () => {
  ipcMain.handle("store:get", () => readStore());
  ipcMain.handle("store:set", (_e, data) => {
    writeStore(data);
    configureUpdater(data.serverUrl || DEFAULT_SERVER_URL);
    return true;
  });
  await session.defaultSession.clearCache();
  createWindow();
  checkForUpdates();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
