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
	console.log("[addTask] FINAL title received:", title);
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

function createTaskPill(task) {
	const span = document.createElement("span");
	span.textContent = task.title;

	// Mission assignment dropdown
	const dropdown = createMissionDropdown(task);

	// IMPORTANT:
	// Prevent dropdown interaction from toggling task completion
	dropdown.addEventListener("click", (e) => {
		e.stopPropagation();
	});

	const pill = document.createElement("div");
	pill.classList.add("pill", "task-pill");

	// Toggle completion when clicking the pill
	pill.addEventListener("click", () => {
		console.log("[Task Toggle] Pill clicked:", task.title);
		toggleTask(task.id);
	});

	// Visual state for completed task (no strike-through)
	if (task.isDone) {
		pill.classList.add("completed");
	}

	pill.appendChild(span);
	pill.appendChild(dropdown);

	return pill;
}

function isMissionEligible(missionId) {
	const tasks = appData.tasks.filter((task) => task.missionId === missionId);

	if (tasks.length === 0) return false;

	return tasks.every((task) => task.isDone);
}

function renderMission(mission, list) {
	const missionLi = document.createElement("li");
	missionLi.classList.add("mission-item");

	const missionPill = document.createElement("div");
	missionPill.classList.add("pill", "mission-pill");

	// Mission title
	const titleSpan = document.createElement("span");
	titleSpan.textContent = `Mission: ${mission.title}`;

	// Mission completion indicator
	const checkmark = document.createElement("span");
	checkmark.classList.add("mission-checkmark");

	const eligible = isMissionEligible(mission.id);

	// 🔒 Step G fix:
	// If mission was manually completed but is no longer eligible,
	// automatically revert it to incomplete.
	if (mission.isManuallyCompleted && !eligible) {
		console.log(
			"[Mission] Eligibility lost, reverting completion:",
			mission.title
		);

		mission.isManuallyCompleted = false;
		mission.updatedAt = Date.now();
		persist();
	}

	if (mission.isManuallyCompleted) {
		checkmark.classList.add("completed");
		checkmark.textContent = "✓ Completed";
	} else if (eligible) {
		checkmark.classList.add("eligible");
		checkmark.textContent = "✓";
	} else {
		checkmark.classList.add("inactive");
		checkmark.textContent = "✓";
	}

	// Click handler (manual completion only)
	checkmark.addEventListener("click", (e) => {
		e.stopPropagation();

		if (!eligible || mission.isManuallyCompleted) return;

		console.log("[Mission] Manually completed:", mission.title);

		mission.isManuallyCompleted = true;
		mission.updatedAt = Date.now();

		persist();
		renderTasks();
	});

	missionPill.appendChild(titleSpan);
	missionPill.appendChild(checkmark);

	missionLi.appendChild(missionPill);
	list.appendChild(missionLi);

	const missionTasks = appData.tasks.filter(
		(task) => task.missionId === mission.id
	);

	console.log(
		`[renderTasks] Mission "${mission.title}" has ${missionTasks.length} tasks`
	);

	missionTasks.forEach((task) => {
		const li = document.createElement("li");
		li.classList.add("task-item", "task-under-mission");

		const pill = createTaskPill(task);
		li.appendChild(pill);

		list.appendChild(li);
	});
}
function renderStandaloneTasks(list) {
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

		const pill = createTaskPill(task);
		li.appendChild(pill);

		list.appendChild(li);
	});
}

// Renders the task list with missions as contextual items
function renderTasks() {
	console.log(
		"[renderTasks] Rendering tasks with mission grouping (refactored)..."
	);

	const list = document.getElementById("task-list");
	if (!list) {
		console.warn("[renderTasks] task-list element not found!");
		return;
	}

	list.innerHTML = "";

	// Render missions and their tasks
	appData.missions.forEach((mission) => {
		renderMission(mission, list);
	});

	// Render standalone tasks
	renderStandaloneTasks(list);

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
		const MAX_TASK_LENGTH = 40;

		const rawValue = taskInput.value.trim();
		console.log("[UI] Add Task clicked (raw):", rawValue);

		if (!rawValue) return;

		const trimmedValue = rawValue.slice(0, MAX_TASK_LENGTH);
		console.log("[UI] Add Task (trimmed to max length):", trimmedValue);

		addTask(trimmedValue);
		taskInput.value = "";
	};

	// Mission controls
	const missionInput = document.getElementById("mission-input");
	const missionBtn = document.getElementById("add-mission-btn");

	missionBtn.onclick = () => {
		const MAX_MISSION_LENGTH = 40;

		const rawValue = missionInput.value.trim();
		console.log("[UI] Add Mission clicked (raw):", rawValue);

		if (!rawValue) return;

		const trimmedValue = rawValue.slice(0, MAX_MISSION_LENGTH);
		console.log("[UI] Add Mission (trimmed to max length):", trimmedValue);

		addMission(trimmedValue);
		missionInput.value = "";
	};
});

/****************************************************
 * SECTION 7 — APPLICATION BOOTSTRAP
 ****************************************************/

loadData();
