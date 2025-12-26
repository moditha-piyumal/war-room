/****************************************************
 * WAR ROOM — Renderer Process
 * ----------------------------------
 * This file controls:
 * - UI state (tasks, missions, settings)
 * - User interactions
 * - Rendering logic
 *
 * IMPORTANT:
 * - Renderer owns in-memory state
 * - Main process owns persistence only
 ****************************************************/

console.log("WAR ROOM renderer ready");

/****************************************************
 * SECTION 1 — APPLICATION STATE (Renderer-owned)
 * ----------------------------------
 * This is the single source of truth for UI state.
 * It is loaded once from disk and mutated in memory.
 ****************************************************/

let appData = {
	tasks: [],
	missions: [],
	settings: {},
};

/****************************************************
 * SECTION 2 — DATA LOADING & PERSISTENCE (IPC)
 * ----------------------------------
 * These functions communicate with the main process
 * to load and save data safely.
 ****************************************************/

// Load initial data from main process (JSON storage)
async function loadData() {
	appData = await window.warRoomAPI.getData();
	renderTasks();
}

// Persist current in-memory state to disk
async function persist() {
	await window.warRoomAPI.saveData(appData);
}

/****************************************************
 * SECTION 3 — TASK MUTATION LOGIC
 * ----------------------------------
 * Functions here MODIFY appData.
 * They never touch the DOM directly.
 ****************************************************/

// Create and add a new standalone task
function addTask(title) {
	const newTask = {
		id: crypto.randomUUID(),
		title,
		isDone: false,
		missionId: null, // Missions come later
		createdAt: Date.now(),
		updatedAt: Date.now(),
	};

	appData.tasks.push(newTask);
	persist();
	renderTasks();
}

// Toggle completion state of a task
function toggleTask(id) {
	const task = appData.tasks.find((t) => t.id === id);
	if (!task) return;

	task.isDone = !task.isDone;
	task.updatedAt = Date.now();

	persist();
	renderTasks();
}

/****************************************************
 * SECTION 4 — RENDERING LOGIC (DOM Updates)
 * ----------------------------------
 * These functions READ from appData
 * and update the UI accordingly.
 ****************************************************/

function renderTasks() {
	const list = document.getElementById("task-list");
	list.innerHTML = "";

	appData.tasks.forEach((task) => {
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
}

/****************************************************
 * SECTION 5 — EVENT BINDINGS (User Input)
 * ----------------------------------
 * This section connects UI controls
 * to mutation functions.
 ****************************************************/

document.addEventListener("DOMContentLoaded", () => {
	const input = document.getElementById("task-input");
	const btn = document.getElementById("add-btn");

	btn.onclick = () => {
		if (!input.value.trim()) return;

		addTask(input.value.trim());
		input.value = "";
	};
});

/****************************************************
 * SECTION 6 — APPLICATION BOOTSTRAP
 * ----------------------------------
 * Entry point for the renderer process.
 ****************************************************/

loadData();
