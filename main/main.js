import godot from "godot";
const { Node, OfflineMultiplayerPeer } = godot;

class Main extends Node {
	_ready() {
		const multiplayer = this.get_multiplayer();
		if (multiplayer) {
			multiplayer.server_relay = false;
		}
		const settings = this.get_node("/root/Settings");
		settings.load_settings();
		if (globalThis.DisplayServer.get_name() === "headless") {
			globalThis.Engine.max_fps = 60;
		} else {
			this.get_window().mode = settings.config_file.get_value("video", "display_mode", 4);
		}
		this.go_to_main_menu();
	}

	go_to_main_menu() {
		const menu = globalThis.ResourceLoader.load("res://menu/menu.tscn");
		const multiplayer = this.get_multiplayer();
		if (multiplayer?.multiplayer_peer) {
			multiplayer.multiplayer_peer.close();
			multiplayer.multiplayer_peer = new OfflineMultiplayerPeer();
		}
		this.change_scene_to_packed(menu);
	}

	replace_main_scene(resource) {
		this.call_deferred("change_scene_to_packed", resource);
	}

	change_scene_to_packed(resource) {
		const node = resource.instantiate();
		for (const child of this.get_children()) {
			this.remove_child(child);
			child.queue_free();
		}
		this.add_child(node);
		if (node.has_signal("quit")) {
			node.connect("quit", () => this.go_to_main_menu());
		}
		if (node.has_signal("replace_main_scene")) {
			node.connect("replace_main_scene", resource => this.replace_main_scene(resource));
		}
	}
}


export default Main;
