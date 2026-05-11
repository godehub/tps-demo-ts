import godot from "godot";
const { CharacterBody3D, Vector3 } = godot;

const BULLET_VELOCITY = 20.0;

class Bullet extends CharacterBody3D {
	time_alive = 5.0;
	hit = false;

	_ready() {
		// Only the server simulates bullet collisions; clients display replicated effects.
		this.animation_player = this.get_node("AnimationPlayer");
		this.collision_shape = this.get_node("CollisionShape3D");
		this.omni_light = this.get_node("OmniLight3D");
		this.settings = this.get_node("/root/Settings");
		this.is_server = this.get_multiplayer().is_server();
		if (!this.is_server) {
			this.set_physics_process(false);
			this.collision_shape.disabled = true;
		}
	}

	_physics_process(delta) {
		if (this.hit) {
			return;
		}
		this.time_alive -= delta;
		if (this.time_alive < 0.0) {
			this.hit = true;
			this.explode();
		}
		// Compute displacement directly instead of routing through helper math in this hot path.
		const forward = this.transform.basis.z;
		const speed = -delta * BULLET_VELOCITY;
		const displacement = new Vector3(forward.x * speed, forward.y * speed, forward.z * speed);
		const col = this.move_and_collide(displacement);
		if (col) {
			const collider = col.get_collider();
			if (collider && collider.has_method("hit")) {
				collider.rpc("hit");
			}
			this.collision_shape.disabled = true;
			this.explode();
			this.hit = true;
		}
	}

	explode() {
		this.animation_player.play("explode");
		if (this.settings.value("rendering", "shadow_mapping")) {
			this.omni_light.shadow_enabled = true;
		}
	}

	destroy() {
		if (!this.is_server) {
			return;
		}
		this.queue_free();
	}
}


export default Bullet;
