const { DEFAULT_SERVER_URL, isDev, readStore, resolveServerUrl, updatesUrl } = require("./session-store.cjs");
const state = require("./state.cjs");

function sendSplash(payload) {
  if (state.splash && !state.splash.isDestroyed()) state.splash.webContents.send("updater:status", payload);
}

function sendMain(channel, payload) {
  if (state.mainWindow && !state.mainWindow.isDestroyed()) state.mainWindow.webContents.send(channel, payload);
}

function clearSplashTimer() {
  if (state.splashTimer) {
    clearTimeout(state.splashTimer);
    state.splashTimer = null;
  }
}

function setupAutoUpdater(openMain) {
  if (isDev) return null;
  if (state.autoUpdaterRef) return state.autoUpdaterRef;
  let autoUpdater;
  try {
    autoUpdater = require("electron-updater").autoUpdater;
  } catch (err) {
    console.error("auto-update:", err);
    return null;
  }
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowDowngrade = false;
  autoUpdater.verifyUpdateCodeSignature = false;
  autoUpdater.setFeedURL({
    provider: "generic",
    url: updatesUrl(resolveServerUrl(readStore().serverUrl || DEFAULT_SERVER_URL)),
  });
  autoUpdater.on("checking-for-update", () => {
    if (!state.mainOpened) sendSplash({ phase: "check", message: "Проверка обновлений…" });
  });
  autoUpdater.on("update-available", (info) => {
    state.downloading = true;
    if (state.mainOpened) return;
    clearSplashTimer();
    const version = info && info.version ? info.version : "";
    sendSplash({
      phase: "available",
      percent: 0,
      message: version ? `Загрузка версии ${version}…` : "Загрузка обновления…",
    });
  });
  autoUpdater.on("update-not-available", () => {
    state.downloading = false;
    if (!state.mainOpened) {
      sendSplash({ phase: "none", message: "Обновлений нет" });
      openMain();
    }
  });
  autoUpdater.on("download-progress", (prog) => {
    if (state.mainOpened) return;
    const percent = prog && typeof prog.percent === "number" ? prog.percent : 0;
    sendSplash({
      phase: "download",
      percent,
      message: "Загрузка обновления…",
    });
  });
  autoUpdater.on("update-downloaded", (info) => {
    state.downloading = false;
    state.updateReady = true;
    state.readyVersion = info && info.version ? String(info.version) : "";
    const version = state.readyVersion;
    if (!state.mainOpened) {
      state.installing = true;
      clearSplashTimer();
      sendSplash({ phase: "install", percent: 100, message: "Установка обновления…" });
      setTimeout(() => {
        try {
          autoUpdater.quitAndInstall(true, true);
        } catch (err) {
          console.error("auto-update install:", err);
          state.installing = false;
          openMain();
        }
      }, 400);
      return;
    }
    sendMain("updater:ready", { version });
  });
  autoUpdater.on("error", (err) => {
    console.error("auto-update:", err == null ? "unknown" : err.message || err);
    state.downloading = false;
    if (!state.mainOpened) {
      sendSplash({ phase: "error", message: "Сервер обновлений недоступен" });
      setTimeout(() => openMain(), 700);
    }
  });
  state.autoUpdaterRef = autoUpdater;
  return autoUpdater;
}

function refreshFeedUrl(updater) {
  updater.setFeedURL({
    provider: "generic",
    url: updatesUrl(resolveServerUrl(readStore().serverUrl || DEFAULT_SERVER_URL)),
  });
}

function startPeriodicUpdateChecks(openMain) {
  if (isDev || state.periodicTimer) return;
  state.periodicTimer = setInterval(() => {
    if (state.installing || state.downloading || state.updateReady) return;
    const updater = setupAutoUpdater(openMain);
    if (!updater) return;
    refreshFeedUrl(updater);
    void updater.checkForUpdates().catch((err) => {
      console.error("auto-update:", err);
    });
  }, 5 * 60 * 1000);
}

function installDownloadedUpdate(openMain) {
  if (!state.updateReady) return false;
  const updater = setupAutoUpdater(openMain);
  if (!updater) return false;
  state.installing = true;
  try {
    updater.quitAndInstall(true, true);
    return true;
  } catch (err) {
    console.error("auto-update install:", err);
    state.installing = false;
    return false;
  }
}

function startUpdateCheck(openMain) {
  sendSplash({ phase: "check", message: "Проверка обновлений…" });
  state.splashTimer = setTimeout(() => openMain(), 20000);
  const updater = setupAutoUpdater(openMain);
  if (!updater) {
    openMain();
    return;
  }
  void updater.checkForUpdates().catch((err) => {
    console.error("auto-update:", err);
    openMain();
  });
}

module.exports = {
  sendSplash,
  sendMain,
  clearSplashTimer,
  setupAutoUpdater,
  startPeriodicUpdateChecks,
  installDownloadedUpdate,
  startUpdateCheck,
};
