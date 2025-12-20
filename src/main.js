const { app, BrowserWindow, ipcMain } = require("electron");

const path = require("path");
const { readData } = require("./storage/jsonStore");

let mainWindow;

function createWindow() {
	mainWindow = new BrowserWindow({
		width: 1100,
		height: 1000,
		title: "WAR ROOM",
		webPreferences: {
			preload: path.join(__dirname, "preload.js"),
		},
	});

	mainWindow.loadFile(path.join(__dirname, "renderer", "index.html"));

	// Dev tools ON for development
	mainWindow.webContents.openDevTools();
}
ipcMain.handle("get-data", () => {
	return readData();
});

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		app.quit();
	}
});
