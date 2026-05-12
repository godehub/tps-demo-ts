import godot from "godot";
const { Node3D } = godot;
import type { Light3D, Node3D as Node3DType } from "godot";

export default class FlyingForklift extends Node3D {
	declare spot_light: Light3D;

	_ready(): void {
		this.spot_light = this.get_node("SpotLight3D") as Light3D;
		const settings = this.get_node("/root/Settings") as SettingsNode;
		if (!settings.value("rendering", "shadow_mapping")) {
			this.spot_light.shadow_enabled = false;
		}

		const children = this.get_child(0).get_children() as Node3DType[];
		const childCount = children.length;
		const whichEnabled = Math.floor(Math.random() * childCount);
		for (let i = 0; i < childCount; i++) {
			children[i].visible = i === whichEnabled;
		}
	}
}
