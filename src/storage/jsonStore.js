// jsonStore.js
// Responsible for ALL local data storage for WAR ROOM

const { app } = require("electron");
const fs = require("fs");
const path = require("path");

// Absolute path to the JSON file inside Electron's userData directory
function getDataFilePath() {
	return path.join(app.getPath("userData"), "data.json");
}

// Default structure of our data file
function getDefaultData() {
	return {
		tasks: [],
		missions: [],
		settings: {
			showCompletedTasks: true,
			showCompletedMissions: true,
			theme: "dark",
		},
	};
}

// Ensure the data file exists; if not, create it
function ensureDataFile() {
	const filePath = getDataFilePath();

	if (!fs.existsSync(filePath)) {
		const defaultData = getDefaultData();
		fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2), "utf-8");
	}
}

// Read data safely from disk
function readData() {
	ensureDataFile();

	const filePath = getDataFilePath();
	const raw = fs.readFileSync(filePath, "utf-8");

	try {
		return JSON.parse(raw);
	} catch (err) {
		console.error("WAR ROOM: data.json is corrupted. Resetting.");

		const defaultData = getDefaultData();
		fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2), "utf-8");

		return defaultData;
	}
}

// Write data safely to disk
function writeData(data) {
	const filePath = getDataFilePath();

	fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

module.exports = {
	readData,
	writeData,
};
