const { BrowserWindow } = require("electron");
const path = require("path");
const { isDev } = require("./session-store.cjs");
const state = require("./state.cjs");
const { clearSplashTimer, sendMain, sendSplash, startPeriodicUpdateChecks } = require("./updater.cjs");

function closeSplash() {
  if (state.splash && !state.splash.isDestroyed()) state.splash.close();
  state.splash = null;
}

function createSplash(openMain) {
  state.splash = new BrowserWindow({
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
  state.splash.setMenuBarVisibility(false);
  state.splash.loadFile(path.join(__dirname, "splash.html"));
  state.splash.on("close", (e) => {
    if (state.downloading || state.installing) e.preventDefault();
  });
  state.splash.on("closed", () => {
    state.splash = null;
    if (!state.mainOpened && !state.installing) openMain();
  });
}

function createWindow(openMain) {
  state.mainWindow = new BrowserWindow({
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
  state.mainWindow.setMenuBarVisibility(false);
  state.mainWindow.on("closed", () => {
    state.mainWindow = null;
  });
  state.mainWindow.webContents.on("did-finish-load", () => {
    if (state.updateReady) sendMain("updater:ready", { version: state.readyVersion });
  });
  startPeriodicUpdateChecks(openMain);
  if (isDev) {
    state.mainWindow.loadURL("http://127.0.0.1:5173");
    state.mainWindow.show();
    return;
  }
  state.mainWindow.once("ready-to-show", () => {
    if (state.mainWindow && !state.mainWindow.isDestroyed()) state.mainWindow.show();
    closeSplash();
  });
  setTimeout(() => {
    if (state.mainWindow && !state.mainWindow.isDestroyed() && !state.mainWindow.isVisible()) state.mainWindow.show();
    closeSplash();
  }, 4000);
  state.mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));
}

function openMain() {
  if (state.mainOpened || state.installing) return;
  state.mainOpened = true;
  clearSplashTimer();
  sendSplash({ phase: "launch", message: "Запуск…" });
  createWindow(openMain);
}

module.exports = { createSplash, createWindow, openMain, closeSplash };
