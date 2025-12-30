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

// =================================================
// X-01 Undo Delete State
// =================================================
let lastDeleted = null;

/****************************************************
 * SECTION 1.5 — VISIBILITY MODE (Step H)
 ****************************************************/

let visibilityMode = "overview";
// "focus" | "overview" | "accomplishment"

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
		option.textContent = `Mission: ${truncateLabel(mission.title, 15)}`;

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

	const deleteBtn = createDeleteButton(() => {
		openConfirmModal("Delete this task?", [
			{
				label: "Delete",
				className: "danger",
				onClick: () => deleteTask(task.id),
			},
			{ label: "Cancel", className: "secondary", onClick: () => {} },
		]);
	});

	// pill.appendChild(deleteBtn);

	// Toggle completion when clicking the pill
	pill.addEventListener("click", () => {
		console.log("[Task Toggle] Pill clicked:", task.title);
		toggleTask(task.id);
	});

	// Visual state for completed task (no strike-through)
	// Visual state for completed task (no strike-through)
	if (task.isDone) {
		pill.classList.add("completed");
	}

	/****************************************************
	 * Task completion checkmark (NEW)
	 * - This is just a visual indicator.
	 * - Clicking the pill still toggles completion (your existing behavior).
	 ****************************************************/
	const taskCheckmark = document.createElement("span");
	taskCheckmark.classList.add("task-checkmark");
	taskCheckmark.textContent = "✓";

	// State
	if (task.isDone) {
		taskCheckmark.classList.add("completed");
	} else {
		taskCheckmark.classList.add("inactive");
	}

	/****************************************************
	 * Right side container
	 * - margin-left:auto pushes it to the right edge
	 * - keeps mission pills unchanged (this is only tasks)
	 ****************************************************/
	const rightControls = document.createElement("div");
	rightControls.classList.add("task-right-controls");

	// Keep dropdown interactions from toggling completion (you already stopPropagation)
	rightControls.appendChild(dropdown);

	// Delete next to checkmark (order doesn't matter, but checkmark last keeps “right edge”)
	rightControls.appendChild(deleteBtn);
	rightControls.appendChild(taskCheckmark);

	// Final structure
	pill.appendChild(span);
	pill.appendChild(rightControls);

	return pill;
}

function isMissionEligible(missionId) {
	const tasks = appData.tasks.filter((task) => task.missionId === missionId);

	if (tasks.length === 0) return false;

	return tasks.every((task) => task.isDone);
}

/****************************************************
 * SECTION 5.5 — VISIBILITY RULES (Step H)
 ****************************************************/

function shouldRenderMission(mission) {
	if (visibilityMode === "overview") return true;
	if (visibilityMode === "focus") return !mission.isManuallyCompleted;
	if (visibilityMode === "accomplishment") return mission.isManuallyCompleted;
	return true;
}

function shouldRenderTask(task, parentMission = null) {
	if (visibilityMode === "overview") return true;

	if (visibilityMode === "focus") {
		if (parentMission) return !parentMission.isManuallyCompleted;
		return !task.isDone;
	}

	if (visibilityMode === "accomplishment") {
		if (parentMission) return task.isDone;
		return task.isDone;
	}

	return true;
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

	const deleteBtn = createDeleteButton(() => {
		openConfirmModal("Delete this mission. What should happen to its tasks?", [
			{
				label: "Delete Mission Only",
				className: "secondary",
				onClick: () => deleteMissionOnly(mission.id),
			},
			{
				label: "Delete Mission + Tasks",
				className: "danger",
				onClick: () => deleteMissionAndTasks(mission.id),
			},
			{
				label: "Cancel",
				className: "secondary",
				onClick: () => {},
			},
		]);
	});

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
		checkmark.textContent = "✓"; // ✅ correct variable
		// checkmark.title = "Completed"; // optional
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
	missionPill.appendChild(deleteBtn);

	missionLi.appendChild(missionPill);
	list.appendChild(missionLi);

	const missionTasks = appData.tasks.filter(
		(task) => task.missionId === mission.id
	);

	console.log(
		`[renderTasks] Mission "${mission.title}" has ${missionTasks.length} tasks`
	);

	missionTasks.forEach((task) => {
		if (!shouldRenderTask(task, mission)) return;

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
		if (!shouldRenderTask(task, null)) return;

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
		if (!shouldRenderMission(mission)) return;
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

	/****************************************************
	 * VISIBILITY MODE CONTROLS (Step H)
	 ****************************************************/

	document.querySelectorAll(".visibility-toggle button").forEach((btn) => {
		btn.addEventListener("click", () => {
			visibilityMode = btn.dataset.mode;

			document
				.querySelectorAll(".visibility-toggle button")
				.forEach((b) => b.classList.remove("active"));

			btn.classList.add("active");

			console.log("[Visibility Mode] Changed to:", visibilityMode);
			renderTasks();
		});
	});

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

// Helper Function
function truncateLabel(text, maxLength = 15) {
	if (text.length <= maxLength) return text;
	return text.slice(0, maxLength - 1) + "…";
}

function createDeleteButton(onClick) {
	const btn = document.createElement("span");
	btn.textContent = "✕";
	btn.className = "delete-btn";
	btn.title = "Delete";

	btn.addEventListener("click", (e) => {
		e.stopPropagation(); // prevent pill click
		onClick();
	});

	return btn;
}

function openConfirmModal(text, buttons) {
	const modal = document.getElementById("confirm-modal");
	const textEl = document.getElementById("confirm-text");
	const actions = document.getElementById("confirm-actions");

	textEl.textContent = text;
	actions.innerHTML = "";

	buttons.forEach(({ label, className, onClick }) => {
		const btn = document.createElement("button");
		btn.textContent = label;
		btn.className = className;

		btn.onclick = () => {
			onClick();
			closeConfirmModal();
		};

		actions.appendChild(btn);
	});

	modal.classList.remove("hidden");
}

function closeConfirmModal() {
	document.getElementById("confirm-modal").classList.add("hidden");
}

function deleteTask(taskId) {
	const taskIndex = appData.tasks.findIndex((t) => t.id === taskId);
	if (taskIndex === -1) return;

	const deletedTask = appData.tasks[taskIndex];

	// Store undo info
	lastDeleted = {
		type: "task",
		data: deletedTask,
		index: taskIndex,
	};

	console.log("[UNDO] Stored deleted task:", deletedTask.title);

	// Remove task
	appData.tasks.splice(taskIndex, 1);

	// Recalculate mission eligibility
	appData.missions.forEach((mission) => {
		const missionTasks = appData.tasks.filter(
			(t) => t.missionId === mission.id
		);
		if (missionTasks.some((t) => !t.isDone)) {
			mission.isManuallyCompleted = false;
		}
	});

	persist();
	renderTasks();
	showUndoToast();
}

function deleteMissionOnly(missionId) {
	const missionIndex = appData.missions.findIndex((m) => m.id === missionId);
	if (missionIndex === -1) return;

	const deletedMission = appData.missions[missionIndex];

	const affectedTasks = appData.tasks
		.filter((t) => t.missionId === missionId)
		.map((t) => ({ ...t }));

	lastDeleted = {
		type: "mission-only",
		mission: deletedMission,
		tasks: affectedTasks,
		index: missionIndex,
	};

	console.log("[UNDO] Stored deleted mission (tasks preserved)");

	// Remove mission
	appData.missions.splice(missionIndex, 1);

	// Detach tasks
	appData.tasks.forEach((task) => {
		if (task.missionId === missionId) {
			task.missionId = null;
		}
	});

	persist();
	renderTasks();
	showUndoToast();
}

function deleteMissionAndTasks(missionId) {
	const missionIndex = appData.missions.findIndex((m) => m.id === missionId);
	if (missionIndex === -1) return;

	const deletedMission = appData.missions[missionIndex];
	const deletedTasks = appData.tasks.filter((t) => t.missionId === missionId);

	lastDeleted = {
		type: "mission-and-tasks",
		mission: deletedMission,
		tasks: deletedTasks,
		index: missionIndex,
	};

	console.log("[UNDO] Stored deleted mission + tasks");

	// Remove mission
	appData.missions.splice(missionIndex, 1);

	// Remove tasks
	appData.tasks = appData.tasks.filter((t) => t.missionId !== missionId);

	persist();
	renderTasks();
	showUndoToast();
}

function undoLastDelete() {
	if (!lastDeleted) return;

	console.log("[UNDO] Restoring:", lastDeleted.type);

	if (lastDeleted.type === "task") {
		appData.tasks.splice(lastDeleted.index, 0, lastDeleted.data);
	}

	if (lastDeleted.type === "mission-only") {
		appData.missions.splice(lastDeleted.index, 0, lastDeleted.mission);

		lastDeleted.tasks.forEach((task) => {
			const t = appData.tasks.find((x) => x.id === task.id);
			if (t) t.missionId = lastDeleted.mission.id;
		});
	}

	if (lastDeleted.type === "mission-and-tasks") {
		appData.missions.splice(lastDeleted.index, 0, lastDeleted.mission);
		appData.tasks.push(...lastDeleted.tasks);
	}

	lastDeleted = null;
	persist();
	renderTasks();
}

let undoTimeout = null;

function showUndoToast() {
	const toast = document.getElementById("undo-toast");
	toast.classList.remove("hidden");

	clearTimeout(undoTimeout);

	undoTimeout = setTimeout(() => {
		lastDeleted = null;
		toast.classList.add("hidden");
	}, 6000);
}

document.getElementById("undo-btn").onclick = () => {
	undoLastDelete();
	document.getElementById("undo-toast").classList.add("hidden");
};

/****************************************************
 * SECTION 7 — APPLICATION BOOTSTRAP
 ****************************************************/

loadData();
