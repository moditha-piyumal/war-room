// preload.js
// Secure bridge between renderer and main process

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("warRoomAPI", {
	getData: () => ipcRenderer.invoke("get-data"),
	saveData: (data) => ipcRenderer.invoke("save-data", data),
	getAppVersion: () => ipcRenderer.invoke("get-app-version"),
});
