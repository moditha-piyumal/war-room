console.log("WAR ROOM renderer ready");

// Ask the main process for stored data
window.warRoomAPI.getData().then((data) => {
	console.log("Loaded data from storage:", data);
});
console.log("warRoomAPI exists:", window.warRoomAPI);
