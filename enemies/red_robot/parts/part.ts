import godot from "godot";
const { RigidBody3D, Vector3 } = godot;
import type { CollisionShape3D, MultiplayerSynchronizer, Node3D, StandardMaterial3D } from "godot";
import { v3Mul, v3Sub } from "../../../scripts/godot_math.js";

const puffEffect = globalThis.ResourceLoader.load("res://enemies/red_robot/parts/part_disappear_effect/part_disappear.tscn") as PackedSceneOf<Node3D>;
const dedicatedServer = globalThis.OS.has_feature("dedicated_server");

export default class RobotPart extends RigidBody3D {
	static exports = {
		lifetime: { type: "float" },
		lifetime_random: { type: "float" },
		disappearing_time: { type: "float" },
		fade_value: { type: "float" } };

	lifetime = 3.0;
	lifetime_random = 3.0;
	disappearing_time = 0.5;
	fade_value = 0.0;
	_disappearing_counter = 0.0;
	_mat: AnyGodotObject | null = null;
	declare synchronizer: MultiplayerSynchronizer;
	declare col1: CollisionShape3D;
	declare col2: CollisionShape3D;
	declare is_server: boolean;

	_ready(): void {
		this.set_process(false);
		// Cache replicated nodes because explosion can run on several detached parts at once.
		this.synchronizer = this.get_node("MultiplayerSynchronizer") as MultiplayerSynchronizer;
		this.col1 = this.get_node("Col1") as CollisionShape3D;
		this.col2 = this.get_node("Col2") as CollisionShape3D;
		this.is_server = this.get_multiplayer().is_server();
		if (!dedicatedServer) {
			const mesh = this.get_node("Model").get_child(0) as MeshNode;
			this._mat = mesh.mesh.surface_get_material(0).duplicate() as StandardMaterial3D & { next_pass: AnyGodotObject };
			mesh.mesh.surface_set_material(0, this._mat as any);
			this._mat.next_pass = this._mat.next_pass.duplicate() as AnyGodotObject;
		}
	}

	setFadeValue(value: number): void {
		this.fade_value = value;
		if (this._mat) {
			this._mat.next_pass.set_shader_parameter("emission_cutout", this.fade_value);
		}
	}

	async explode(): Promise<void> {
		this.synchronizer.public_visibility = true;
		this.freeze = false;
		// Physics for detached parts is server authoritative; clients receive the replicated transform.
		if (!this.is_server) {
			return;
		}
		this.col1.disabled = false;
		this.col2.disabled = false;
		this.linear_velocity = v3Mul(Vector3.UP, 3.0);
		this.angular_velocity = v3Mul(v3Sub(v3Mul(new Vector3(Math.random(), Math.random(), Math.random()).normalized(), 2.0), Vector3.ONE), 10.0);
		await this.get_tree().create_timer(this.lifetime + this.lifetime_random * Math.random()).to_signal("timeout");
		try {
			this.set_process(true);
		} catch (_err) {
			// The part may be gone if the level is reset while the lifetime timer is pending.
		}
	}

	_process(delta: number): void {
		this.setFadeValue(Math.pow(this._disappearing_counter / this.disappearing_time, 2.0));
		this._disappearing_counter += delta;
		if (this._disappearing_counter >= this.disappearing_time - 0.2) {
			this.destroy();
			this.set_process(false);
		}
	}

	async destroy(): Promise<void> {
		try {
			const puff = puffEffect.instantiate() as Node3D;
			this.get_parent().add_child(puff);
			const puffTransform = puff.global_transform;
			puffTransform.origin = this.global_transform.origin;
			puff.global_transform = puffTransform;
			await this.get_tree().create_timer(0.2).to_signal("timeout");
			this.queue_free();
		} catch (_err) {
			// The part may already be gone when the awaited cleanup resumes.
		}
	}
}
