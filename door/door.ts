import godot from "godot";
const { Area3D } = godot;
import type { AnimationPlayer } from "godot";

export default class Door extends Area3D {
	open = false;
	declare animation_player: AnimationPlayer;

	_ready(): void {
		this.animation_player = this.get_node("DoorModel/AnimationPlayer") as AnimationPlayer;
	}

	_on_door_body_entered(body: DoorBody): void {
		if (!this.open && body?.has_method?.("add_camera_shake_trauma")) {
			this.animation_player.play("doorsimple_opening");
			this.open = true;
		}
	}
}
