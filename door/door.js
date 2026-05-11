import godot from "godot";
const { Area3D } = godot;

class Door extends Area3D {
	open = false;

	_ready() {
		this.animation_player = this.get_node("DoorModel/AnimationPlayer");
	}

	_on_door_body_entered(body) {
		if (!this.open && body?.has_method?.("add_camera_shake_trauma")) {
			this.animation_player.play("doorsimple_opening");
			this.open = true;
		}
	}
}


export default Door;
