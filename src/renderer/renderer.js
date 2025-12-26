/****************************************************
 * WAR ROOM — Renderer Process
 * ----------------------------------
 * Responsibilities:
 * - Own in-memory application state
 * - Handle user interactions
 * - Render Tasks and Missions
 *
 * Design Philosophy:
 * - Tasks are primary
 * - Missions are contextual items inside the task list
 ****************************************************/

console.log("WAR ROOM renderer ready");

/****************************************************
 * SECTION 1 — APPLICATION STATE (Renderer-owned)
 ****************************************************/

let appData = {
	tasks: [],
	missions: [],
	settings: {},
};

/****************************************************
 * SECTION 2 — DATA LOADING & PERSISTENCE (IPC)
 ****************************************************/

async function loadData() {
	console.log("[loadData] Requesting data from main process...");
	appData = await window.warRoomAPI.getData();

	console.log("[loadData] Data received:", appData);
	renderTasks();
}

async function persist() {
	console.log("[persist] Saving appData to disk...", appData);
	const result = await window.warRoomAPI.saveData(appData);
	console.log("[persist] Save completed. Result:", result);
}

/****************************************************
 * SECTION 3 — MISSION MUTATION LOGIC
 ****************************************************/

function addMission(title) {
	console.log("[addMission] Creating mission:", title);

	const newMission = {
		id: crypto.randomUUID(),
		title,
		isManuallyCompleted: false, // Step G
		createdAt: Date.now(),
		updatedAt: Date.now(),
	};

	appData.missions.push(newMission);

	console.log(
		"[addMission] Mission added. Total missions:",
		appData.missions.length
	);

	persist();
	renderTasks();
}

/****************************************************
 * SECTION 4 — TASK MUTATION LOGIC
 ****************************************************/

function addTask(title) {
	console.log("[addTask] Creating task:", title);

	const newTask = {
		id: crypto.randomUUID(),
		title,
		isDone: false,
		missionId: null, // Step F.2
		createdAt: Date.now(),
		updatedAt: Date.now(),
	};

	appData.tasks.push(newTask);

	console.log("[addTask] Task added. Total tasks:", appData.tasks.length);

	persist();
	renderTasks();
}

function toggleTask(id) {
	console.log("[toggleTask] Toggling task id:", id);

	const task = appData.tasks.find((t) => t.id === id);
	if (!task) {
		console.warn("[toggleTask] Task not found:", id);
		return;
	}

	task.isDone = !task.isDone;
	task.updatedAt = Date.now();

	console.log("[toggleTask] Updated task:", task);

	persist();
	renderTasks();
}

/****************************************************
 * SECTION 5 — RENDERING LOGIC (Tasks + Missions)
 ****************************************************/

function renderTasks() {
	console.log("[renderTasks] Rendering task list (with missions)...");

	const list = document.getElementById("task-list");
	if (!list) {
		console.warn("[renderTasks] task-list element not found!");
		return;
	}

	list.innerHTML = "";

	// 1️⃣ Render Missions (as contextual task-like items)
	appData.missions.forEach((mission) => {
		const li = document.createElement("li");

		li.textContent = `Mission: ${mission.title}`;

		// Temporary visual distinction (pill styling comes later)
		li.style.fontWeight = "bold";
		li.style.opacity = "0.85";

		list.appendChild(li);
	});

	// 2️⃣ Render standalone tasks (not assigned to a mission)
	const standaloneTasks = appData.tasks.filter(
		(task) => task.missionId === null
	);

	standaloneTasks.forEach((task) => {
		const li = document.createElement("li");

		const checkbox = document.createElement("input");
		checkbox.type = "checkbox";
		checkbox.checked = task.isDone;
		checkbox.onchange = () => toggleTask(task.id);

		const span = document.createElement("span");
		span.textContent = task.title;

		if (task.isDone) {
			span.style.textDecoration = "line-through";
		}

		li.appendChild(checkbox);
		li.appendChild(span);
		list.appendChild(li);
	});

	console.log(
		"[renderTasks] Render complete.",
		"Missions:",
		appData.missions.length,
		"Standalone tasks:",
		standaloneTasks.length
	);
}

/****************************************************
 * SECTION 6 — EVENT BINDINGS (User Input)
 ****************************************************/

document.addEventListener("DOMContentLoaded", () => {
	console.log("[DOM] DOMContentLoaded — wiring UI events");

	// Task controls
	const taskInput = document.getElementById("task-input");
	const taskBtn = document.getElementById("add-btn");

	taskBtn.onclick = () => {
		const value = taskInput.value.trim();
		console.log("[UI] Add Task clicked:", value);

		if (!value) return;

		addTask(value);
		taskInput.value = "";
	};

	// Mission controls
	const missionInput = document.getElementById("mission-input");
	const missionBtn = document.getElementById("add-mission-btn");

	missionBtn.onclick = () => {
		const value = missionInput.value.trim();
		console.log("[UI] Add Mission clicked:", value);

		if (!value) return;

		addMission(value);
		missionInput.value = "";
	};
});

/****************************************************
 * SECTION 7 — APPLICATION BOOTSTRAP
 ****************************************************/

loadData();
