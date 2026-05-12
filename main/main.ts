import godot from "godot";
const { Node, OfflineMultiplayerPeer } = godot;
import type { PackedScene, Resource, SceneMultiplayer } from "godot";

export default class Main extends Node {
	_ready(): void {
		const multiplayer = this.get_multiplayer();
		if (multiplayer) {
			(multiplayer as SceneMultiplayer).server_relay = false;
		}
		const settings = this.get_node("/root/Settings") as SettingsNode;
		settings.load_settings();
		if (globalThis.DisplayServer.get_name() === "headless") {
			globalThis.Engine.max_fps = 60;
		} else {
			this.get_window().mode = Number(settings.config_file.get_value("video", "display_mode", 4));
		}
		this.go_to_main_menu();
	}

	go_to_main_menu(): void {
		const menu = globalThis.ResourceLoader.load("res://menu/menu.tscn") as PackedScene;
		const multiplayer = this.get_multiplayer();
		if (multiplayer?.multiplayer_peer) {
			multiplayer.multiplayer_peer.close();
			multiplayer.multiplayer_peer = new OfflineMultiplayerPeer();
		}
		this.change_scene_to_packed(menu);
	}

	replace_main_scene(resource: PackedScene): void {
		this.call_deferred("change_scene_to_packed", resource);
	}

	change_scene_to_packed(resource: PackedScene | Resource): void {
		if (!("instantiate" in resource)) {
			return;
		}
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
			node.connect("replace_main_scene", resource => this.replace_main_scene(resource as PackedScene));
		}
	}
}
