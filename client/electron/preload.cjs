const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("rf4", {
  storeGet: () => ipcRenderer.invoke("store:get"),
  storeSet: (data) => ipcRenderer.invoke("store:set", data),
  updateStatus: () => ipcRenderer.invoke("updater:status"),
  installUpdate: () => ipcRenderer.invoke("updater:install"),
  onUpdateReady: (cb) => {
    const listener = (_event, payload) => cb(payload || { version: "" });
    ipcRenderer.on("updater:ready", listener);
    return () => ipcRenderer.removeListener("updater:ready", listener);
  },
});
