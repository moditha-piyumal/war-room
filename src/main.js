const { app, BrowserWindow, ipcMain } = require("electron");

const path = require("path");
const { readData, writeData } = require("./storage/jsonStore");

let mainWindow;

function createWindow() {
	mainWindow = new BrowserWindow({
		width: 1100,
		height: 1000,
		title: "WAR ROOM",

		// ✅ IMPORTANT: this sets the runtime app icon (taskbar, Alt+Tab, etc.)
		icon: path.join(__dirname, "warroomicon.ico"),

		webPreferences: {
			preload: path.join(__dirname, "preload.js"),
		},
	});

	mainWindow.loadFile(path.join(__dirname, "renderer", "index.html"));

	// Dev tools ON for development
	// mainWindow.webContents.openDevTools();
}
ipcMain.handle("get-data", () => {
	return readData();
});

ipcMain.handle("save-data", (_event, data) => {
	writeData(data);
	return true;
});

// =================================================
// X-02 App Version IPC
// =================================================
ipcMain.handle("get-app-version", () => {
	return app.getVersion();
});

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		app.quit();
	}
});
