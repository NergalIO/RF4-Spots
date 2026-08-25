const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("splash", {
  onStatus: (cb) => {
    ipcRenderer.on("updater:status", (_e, data) => cb(data));
  },
});
