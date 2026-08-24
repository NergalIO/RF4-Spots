const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("rf4", {
  storeGet: () => ipcRenderer.invoke("store:get"),
  storeSet: (data) => ipcRenderer.invoke("store:set", data),
  checkUpdates: () => ipcRenderer.invoke("updates:check"),
});
