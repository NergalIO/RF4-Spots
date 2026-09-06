const { app, ipcMain, session, Notification } = require("electron");
const { isDev, readStore, writeStore } = require("./session-store.cjs");
const state = require("./state.cjs");
const { installDownloadedUpdate, startUpdateCheck } = require("./updater.cjs");
const { createSplash, openMain } = require("./windows.cjs");

app.setAppUserModelId("com.rf4spots.app");

const liveNotifications = new Set();

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
  ipcMain.handle("notify:show", (_e, payload) => {
    if (!Notification.isSupported()) return false;
    const title = typeof payload?.title === "string" ? payload.title : "RF4 Spots";
    const body = typeof payload?.body === "string" ? payload.body : "";
    const postId = typeof payload?.postId === "string" ? payload.postId : "";
    const n = new Notification({ title, body, silent: true });
    liveNotifications.add(n);
    const forget = () => liveNotifications.delete(n);
    n.on("click", () => {
      forget();
      const win = state.mainWindow;
      if (!win || win.isDestroyed()) return;
      if (win.isMinimized()) win.restore();
      win.show();
      win.focus();
      win.webContents.send("notify:click", { postId });
    });
    n.on("close", forget);
    n.on("failed", forget);
    n.show();
    return true;
  });
  ipcMain.handle("notify:focus", () => {
    const win = state.mainWindow;
    if (!win || win.isDestroyed()) return false;
    if (win.isMinimized()) win.restore();
    win.show();
    win.focus();
    return true;
  });
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
