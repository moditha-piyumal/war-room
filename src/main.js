const { app, BrowserWindow, ipcMain, shell } = require("electron");

const path = require("path");
const fs = require("fs");
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

ipcMain.handle("create-backup", async () => {
	try {
		const userDataPath = app.getPath("userData");
		const dataFilePath = path.join(userDataPath, "data.json");
		const backupsDir = path.join(userDataPath, "backups");

		console.log("[Backup] userData path:", userDataPath);

		// Ensure backups directory exists
		if (!fs.existsSync(backupsDir)) {
			fs.mkdirSync(backupsDir, { recursive: true });
			console.log("[Backup] Created backups directory");
		}

		// Timestamp for filename
		const now = new Date();
		const timestamp = now
			.toISOString()
			.replace(/T/, "-")
			.replace(/:/g, "-")
			.split(".")[0];

		const backupFileName = `backup-${timestamp}.json`;
		const backupFilePath = path.join(backupsDir, backupFileName);

		// Copy data.json → backup file
		fs.copyFileSync(dataFilePath, backupFilePath);

		console.log("[Backup] Backup created:", backupFilePath);

		return { success: true, file: backupFileName };
	} catch (err) {
		console.error("[Backup] Failed to create backup:", err);
		return { success: false, error: err.message };
	}
});

// =================================================
// X-02 App Version IPC
// =================================================
ipcMain.handle("get-app-version", () => {
	return app.getVersion();
});

app.whenReady().then(createWindow);

ipcMain.handle("open-user-data-folder", async () => {
	const userDataPath = app.getPath("userData");
	console.log("[Main] Opening userData folder:", userDataPath);
	await shell.openPath(userDataPath);
});

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		app.quit();
	}
});
