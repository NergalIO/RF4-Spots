const { app, ipcMain, session } = require("electron");
const { isDev, readStore, writeStore } = require("./session-store.cjs");
const state = require("./state.cjs");
const { installDownloadedUpdate, startUpdateCheck } = require("./updater.cjs");
const { createSplash, openMain } = require("./windows.cjs");

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
  ipcMain.handle("updater:status", () => ({ ready: state.updateReady, version: state.readyVersion }));
  ipcMain.handle("updater:install", () => installDownloadedUpdate(openMain));
  await session.defaultSession.clearCache();
  if (isDev) {
    openMain();
  } else {
    createSplash(openMain);
    startUpdateCheck(openMain);
  }
});

app.on("window-all-closed", () => {
  if (state.installing) return;
  if (process.platform !== "darwin") app.quit();
});
