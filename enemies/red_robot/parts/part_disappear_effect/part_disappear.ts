import godot from "godot";
const { CPUParticles3D } = godot;
import type { CPUParticles3D as CPUParticles3DType } from "godot";

export default class PartDisappear extends CPUParticles3D {
	async _ready(): Promise<void> {
		try {
			(this.get_node("MiniBlasts") as CPUParticles3DType).emitting = true;
			await this.get_tree().create_timer(0.2).to_signal("timeout");
			this.emitting = true;
			await this.get_tree().create_timer(this.lifetime * 2.0).to_signal("timeout");
			this.queue_free();
		} catch (_err) {
			// The effect can be freed while awaited timers are still pending during combat cleanup.
		}
	}
}
