import godot from "godot";
const { Node3D } = godot;

class FlyingForklift extends Node3D {
	_ready() {
		this.spot_light = this.get_node("SpotLight3D");
		const settings = this.get_node("/root/Settings");
		if (!settings.value("rendering", "shadow_mapping")) {
			this.spot_light.shadow_enabled = false;
		}

		const children = this.get_child(0).get_children();
		const childCount = children.length;
		const whichEnabled = Math.floor(Math.random() * childCount);
		for (let i = 0; i < childCount; i++) {
			children[i].visible = i === whichEnabled;
		}
	}
}


export default FlyingForklift;
