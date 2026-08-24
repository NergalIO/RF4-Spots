const { app, BrowserWindow, ipcMain, safeStorage, session, dialog, net } = require("electron");
const path = require("path");
const fs = require("fs");

const DEFAULT_SERVER_URL = "http://127.0.0.1:3780";
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

function isRf4StatUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === "https:" && u.hostname === "rf4-stat.ru";
  } catch {
    return false;
  }
}

async function fetchRf4StatPage(req) {
  try {
    const url = typeof req?.url === "string" ? req.url : "";
    if (!isRf4StatUrl(url)) {
      return { ok: false, status: 0, url: "", html: "", error: "Некорректный адрес" };
    }
    const method = req.method === "POST" ? "POST" : "GET";
    const headers = {
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "ru,en;q=0.8",
    };
    if (req.referer && isRf4StatUrl(req.referer)) headers.Referer = req.referer;
    if (method === "POST") {
      headers["Content-Type"] = "application/x-www-form-urlencoded; charset=UTF-8";
      headers["X-Requested-With"] = "XMLHttpRequest";
    }
    const ses = session.fromPartition("persist:rf4stat");
    const init = {
      method,
      headers,
      body: method === "POST" && req.body ? String(req.body) : undefined,
    };
    const res = typeof ses.fetch === "function" ? await ses.fetch(url, init) : await net.fetch(url, { ...init, session: ses });
    const finalUrl = res.url || url;
    if (!isRf4StatUrl(finalUrl)) {
      return { ok: false, status: res.status, url: "", html: "", error: "Некорректный редирект" };
    }
    const html = await res.text();
    return { ok: res.ok, status: res.status, url: finalUrl, html };
  } catch (err) {
    return { ok: false, status: 0, url: "", html: "", error: err && err.message ? err.message : "Сеть недоступна" };
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
  ipcMain.handle("rf4stat:fetch", (_e, req) => fetchRf4StatPage(req));
  await session.defaultSession.clearCache();
  createWindow();
  checkForUpdates();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
