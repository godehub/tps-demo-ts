import godot from "godot";
const { CPUParticles3D } = godot;

class PartDisappear extends CPUParticles3D {
	async _ready() {
		this.get_node("MiniBlasts").emitting = true;
		await this.get_tree().create_timer(0.2).to_signal("timeout");
		this.emitting = true;
		await this.get_tree().create_timer(this.lifetime * 2.0).to_signal("timeout");
		this.queue_free();
	}
}


export default PartDisappear;
