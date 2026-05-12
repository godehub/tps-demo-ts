import godot from "godot";
const { Node3D } = godot;
import type { AnimationPlayer, Camera3D, Node3D as Node3DType, Viewport } from "godot";

export default class Blast extends Node3D {
	declare light_rays: Node3DType;
	declare camera: Camera3D | null;

	async _ready(): Promise<void> {
		this.light_rays = this.get_node("LightRays") as Node3DType;
		this.camera = (this.get_tree().get_root() as Viewport).get_camera_3d();
		await (this.get_node("AnimationPlayer") as AnimationPlayer).to_signal("animation_finished");
		try {
			this.queue_free();
		} catch (_err) {
			// The effect may already be gone when the awaited animation resumes during scene teardown.
		}
	}

	_process(_delta: number): void {
		if (this.camera && !this.camera.is_queued_for_deletion()) {
			this.light_rays.look_at(this.camera.global_transform.origin);
		}
	}
}
