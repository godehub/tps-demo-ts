import godot from "godot";
const { Label, OfflineMultiplayerPeer } = godot;
const DisplayServer = globalThis.DisplayServer;
const Engine = globalThis.Engine;
const Input = globalThis.Input;
const OS = globalThis.OS;

class DebugLabel extends Label {
	_ready() {
		this.multiplayer_api = this.get_multiplayer();
	}

	_process(_delta) {
		if (Input.is_action_just_pressed("toggle_debug")) {
			this.visible = !this.visible;
		}

		this.text = `FPS: ${Engine.get_frames_per_second()}`;
		this.text += `\nVSync: ${DisplayServer.window_get_vsync_mode() ? "Enabled" : "Disabled"}`;
		this.text += `\nMemory: ${(OS.get_static_memory_usage() / 1048576.0).toFixed(2)} MiB`;

		const online = !(this.multiplayer_api.multiplayer_peer instanceof OfflineMultiplayerPeer);
		this.text += `\nOnline: ${online ? "Yes" : "No"}`;
		if (online) {
			this.text += `\nMultiplayer ID: ${this.multiplayer_api.get_unique_id()}`;
		}
	}
}


export default DebugLabel;
