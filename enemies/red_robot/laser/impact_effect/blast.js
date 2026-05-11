import godot from "godot";
const { Node3D } = godot;

class Blast extends Node3D {
	async _ready() {
		this.light_rays = this.get_node("LightRays");
		this.camera = this.get_tree().get_root().get_camera_3d();
		await this.get_node("AnimationPlayer").to_signal("animation_finished");
		try {
			this.queue_free();
		} catch (_err) {
			// The effect may already be gone when the awaited animation resumes during scene teardown.
		}
	}

	_process(_delta) {
		if (this.camera && this.camera.is_instance_valid?.() !== false) {
			this.light_rays.look_at(this.camera.global_transform.origin);
		}
	}
}


export default Blast;
