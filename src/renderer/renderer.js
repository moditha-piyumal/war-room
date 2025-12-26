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
// Creates a dropdown to assign a task to a mission
function createMissionDropdown(task) {
	console.log(
		"[createMissionDropdown] Building dropdown for task:",
		task.title
	);

	const select = document.createElement("select");

	// Option: No mission
	const noneOption = document.createElement("option");
	noneOption.value = "";
	noneOption.textContent = "No mission";
	select.appendChild(noneOption);

	// Mission options
	appData.missions.forEach((mission) => {
		const option = document.createElement("option");
		option.value = mission.id;
		option.textContent = `Mission: ${mission.title}`;
		select.appendChild(option);
	});

	// Set current value
	select.value = task.missionId || "";

	// Handle assignment change
	select.onchange = () => {
		const newMissionId = select.value || null;

		console.log(
			"[Mission Assignment] Task:",
			task.title,
			"→ Mission ID:",
			newMissionId
		);

		task.missionId = newMissionId;
		task.updatedAt = Date.now();

		persist();
		renderTasks();
	};

	return select;
}
// Renders the task list with missions as contextual items
function renderTasks() {
	console.log(
		"[renderTasks] Rendering tasks with mission grouping (Option B)..."
	);

	const list = document.getElementById("task-list");
	if (!list) {
		console.warn("[renderTasks] task-list element not found!");
		return;
	}

	list.innerHTML = "";

	// 1️⃣ Render each mission, then its tasks
	appData.missions.forEach((mission) => {
		// Mission row
		const missionLi = document.createElement("li");
		missionLi.classList.add("mission-item");

		const missionPill = document.createElement("div");
		missionPill.classList.add("pill", "mission-pill");
		missionPill.textContent = `Mission: ${mission.title}`;

		missionLi.appendChild(missionPill);
		list.appendChild(missionLi);

		// Tasks belonging to this mission
		const missionTasks = appData.tasks.filter(
			(task) => task.missionId === mission.id
		);

		console.log(
			`[renderTasks] Mission "${mission.title}" has ${missionTasks.length} tasks`
		);

		missionTasks.forEach((task) => {
			const li = document.createElement("li");
			li.classList.add("task-item", "task-under-mission");

			const checkbox = document.createElement("input");
			checkbox.type = "checkbox";
			checkbox.checked = task.isDone;
			checkbox.onchange = () => toggleTask(task.id);

			const span = document.createElement("span");
			span.textContent = task.title;

			if (task.isDone) {
				span.style.textDecoration = "line-through";
			}

			const dropdown = createMissionDropdown(task);

			const pill = document.createElement("div");
			pill.classList.add("pill", "task-pill");

			if (task.isDone) {
				pill.classList.add("completed");
			}

			pill.appendChild(checkbox);
			pill.appendChild(span);
			pill.appendChild(dropdown);

			li.appendChild(pill);

			list.appendChild(li);
		});
	});

	// 2️⃣ Render standalone tasks (no mission)
	const standaloneTasks = appData.tasks.filter(
		(task) => task.missionId === null
	);

	console.log(
		"[renderTasks] Rendering standalone tasks:",
		standaloneTasks.length
	);

	standaloneTasks.forEach((task) => {
		const li = document.createElement("li");
		li.classList.add("task-item");

		const checkbox = document.createElement("input");
		checkbox.type = "checkbox";
		checkbox.checked = task.isDone;
		checkbox.onchange = () => toggleTask(task.id);

		const span = document.createElement("span");
		span.textContent = task.title;

		if (task.isDone) {
			span.style.textDecoration = "line-through";
		}

		const dropdown = createMissionDropdown(task);

		const pill = document.createElement("div");
		pill.classList.add("pill", "task-pill");

		if (task.isDone) {
			pill.classList.add("completed");
		}

		pill.appendChild(checkbox);
		pill.appendChild(span);
		pill.appendChild(dropdown);

		li.appendChild(pill);

		list.appendChild(li);
	});

	console.log(
		"[renderTasks] Render complete.",
		"Missions:",
		appData.missions.length,
		"Total tasks:",
		appData.tasks.length
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
