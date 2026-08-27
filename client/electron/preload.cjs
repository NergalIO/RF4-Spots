const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("rf4", {
  storeGet: () => ipcRenderer.invoke("store:get"),
  storeSet: (data) => ipcRenderer.invoke("store:set", data),
  ocrCapture: () => ipcRenderer.invoke("ocr:capture"),
  tessLangPath: () => ipcRenderer.invoke("ocr:tessPath"),
});
