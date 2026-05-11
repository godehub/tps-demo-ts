import godot from "godot";
const { CharacterBody3D, PhysicsRayQueryParameters3D, Transform3D, Vector2, Vector3 } = godot;
import { transformFromMotion, transformMul, v3Add, v3IsZero, v3Sub, xformInvVector } from "../../scripts/godot_math.js";

const State = {
	APPROACH: 0,
	AIM: 1,
	SHOOTING: 2 };

const PLAYER_AIM_TOLERANCE_DEGREES = 15.0 * Math.PI / 180.0;
const SHOOT_WAIT = 6.0;
const AIM_TIME = 1.0;
const AIM_PREPARE_TIME = 0.5;
const BLEND_AIM_SPEED = 0.05;
const blastScene = globalThis.ResourceLoader.load("res://enemies/red_robot/laser/impact_effect/impact_effect.tscn");
const dedicatedServer = globalThis.OS.has_feature("dedicated_server");

function dictEmpty(value) {
	return !value || Object.keys(value).length === 0;
}

class RedRobot extends CharacterBody3D {
	static exports = {
		test_shoot: { type: "bool" },
		target_position: { type: "Vector3" },
		health: { type: "int" },
		state: { type: "int" },
		dead: { type: "bool" },
		aim_preparing: { type: "float" } };

	static signals = {
		exploded: [],
	};

	static rpc_config = {
		hit: { mode: "authority", call_local: true },
	};

	test_shoot = false;
	target_position = new Vector3();
	health = 5;
	state = State.APPROACH;
	dead = false;
	aim_preparing = AIM_PREPARE_TIME;
	shoot_countdown = SHOOT_WAIT;
	aim_countdown = AIM_TIME;
	player = null;
	orientation = new Transform3D();

	_ready() {
		// Cache hot-path nodes and state once; robot AI runs every physics frame.
		this.animation_tree = this.get_node("AnimationTree");
		this.shoot_animation = this.get_node("ShootAnimation");
		this.model = this.get_node("RedRobotModel");
		this.ray_from = this.model.get_node("Armature/Skeleton3D/RayFrom");
		this.ray_mesh = this.ray_from.get_node("RayMesh");
		this.laser_raycast = this.ray_from.get_node("RayCast");
		this.laser_ember = this.ray_from.get_node("LaserEmber");
		this.collision_shape = this.get_node("CollisionShape3D");
		this.explosion_sound = this.get_node("SoundEffects/Explosion");
		this.hit_sound = this.get_node("SoundEffects/Hit");
		this.death = this.get_node("Death");
		this.death_shield1 = this.death.get_node("PartShield1");
		this.death_shield2 = this.death.get_node("PartShield2");
		this.death_head = this.death.get_node("PartHead");
		this.death_detach_spark1 = this.death.get_node("DetachSpark1");
		this.death_detach_spark2 = this.death.get_node("DetachSpark2");
		this.is_server = this.get_multiplayer().is_server();
		this.space_state = this.get_world_3d().direct_space_state;
		this.ray_exclude = [this];
		this.scene_root = this.get_tree().get_root();

		this.orientation = new Transform3D(this.global_transform);
		this.orientation.origin = new Vector3();
		this.animation_tree.active = true;
		if (this.test_shoot) {
			this.shoot_countdown = 0.0;
		}
		if (this.dead) {
			this.model.visible = false;
			this.collision_shape.disabled = true;
			this.animation_tree.active = false;
		}
		this.animate(0.0);
	}

	resume_approach() {
		this.state = State.APPROACH;
		this.aim_preparing = AIM_PREPARE_TIME;
		this.shoot_countdown = SHOOT_WAIT;
	}

	async hit() {
		// RPC may arrive after the death sequence has already started.
		if (this.dead) {
			return;
		}
		const param = `parameters/hit${Math.floor(Math.random() * 3) + 1}/request`;
		this.animation_tree.set(param, 1);
		this.hit_sound.play();
		this.health -= 1;
		if (this.health === 0) {
			this.dead = true;
			this.animation_tree.active = false;
			this.model.visible = false;
			this.death.visible = true;
			this.collision_shape.disabled = true;

			this.death_detach_spark1.emitting = true;
			this.death_detach_spark2.emitting = true;
			this.death_shield1.explode();
			this.death_shield2.explode();
			this.death_head.explode();
			this.explosion_sound.play();
			this.emit_signal("exploded");

			if (this.is_server) {
				await this.get_tree().create_timer(10.0).to_signal("timeout");
				this.queue_free();
			}
		}
	}

	async shoot() {
		const gt = this.ray_from.global_transform;
		const rayOrigin = gt.origin;
		const rayDir = gt.basis.y;
		let maxDist = 1000.0;
		// Build the ray endpoint manually to keep the laser path allocation-light.
		const rayTo = new Vector3(
			rayOrigin.x + rayDir.x * maxDist,
			rayOrigin.y + rayDir.y * maxDist,
			rayOrigin.z + rayDir.z * maxDist,
		);
		const col = this.space_state.intersect_ray(
			PhysicsRayQueryParameters3D.create(rayOrigin, rayTo, 0xFFFFFFFF, this.ray_exclude),
		);
		if (!dictEmpty(col)) {
			maxDist = rayOrigin.distance_to(col.position);
		}
		this._clip_ray(maxDist);
		const meshOffset = this.ray_mesh.position.z;
		this.laser_ember.position = new Vector3(0.0, 0.0, -maxDist / 2.0 - meshOffset);
		this.laser_ember.emission_box_extents.z = (maxDist - Math.abs(meshOffset)) / 2.0;
		if (!dictEmpty(col)) {
			const blast = blastScene.instantiate();
			this.scene_root.add_child(blast);
			const blastTransform = blast.global_transform;
			blastTransform.origin = col.position;
			blast.global_transform = blastTransform;
			if (col.collider === this.player && this.player?.has_method?.("add_camera_shake_trauma")) {
				await this.get_tree().create_timer(0.1).to_signal("timeout");
				this.player.add_camera_shake_trauma(13.0);
			}
		}
	}

	animate(delta) {
		if (this.state === State.APPROACH) {
			const toPlayerLocal = xformInvVector(this.global_transform, this.target_position);
			const angleToPlayer = Math.atan2(toPlayerLocal.x, toPlayerLocal.z);
			if (angleToPlayer > PLAYER_AIM_TOLERANCE_DEGREES) {
				this.set_state_transition("turn_left");
			} else if (angleToPlayer < -PLAYER_AIM_TOLERANCE_DEGREES) {
				this.set_state_transition("turn_right");
			} else if (v3IsZero(this.target_position)) {
				this.set_state_transition("idle");
			} else {
				this.set_state_transition("walk");
			}
		} else {
			this.set_state_transition("idle");
		}

		if (!v3IsZero(this.target_position)) {
			this.animation_tree.set("parameters/aiming/blend_amount", Math.max(0, Math.min(this.aim_preparing / AIM_PREPARE_TIME, 1)));
			const toCannonLocal = xformInvVector(this.ray_mesh.global_transform, v3Add(this.target_position, Vector3.UP));
			const hAngle = Math.atan2(toCannonLocal.x, -toCannonLocal.z) * 180.0 / Math.PI;
			const vAngle = Math.atan2(toCannonLocal.y, -toCannonLocal.z) * 180.0 / Math.PI;
			const blendPos = this.animation_tree.get("parameters/aim/blend_position") ?? new Vector2();
			blendPos.x = Math.max(-1.0, Math.min(blendPos.x + BLEND_AIM_SPEED * delta * -hAngle, 1.0));
			blendPos.y = Math.max(-1.0, Math.min(blendPos.y + BLEND_AIM_SPEED * delta * vAngle, 1.0));
			this.animation_tree.set("parameters/aim/blend_position", blendPos);
		}
	}

	set_state_transition(transition) {
		// Avoid writing the same AnimationTree transition every frame while the state is stable.
		if (this.state_transition === transition) {
			return;
		}
		this.state_transition = transition;
		this.animation_tree.set("parameters/state/transition_request", transition);
	}

	_physics_process(delta) {
		// AI and collision authority live on the server; clients only update visual aiming.
		if (this.dead) {
			return;
		}
		if (!this.is_server) {
			this.animate(delta);
			return;
		}
		if (this.test_shoot) {
			this.shoot();
			this.test_shoot = false;
		}
		if (!this.player) {
			this.target_position = new Vector3();
			this.animate(delta);
			const gravity = this.get_gravity();
			this.set_velocity(new Vector3(gravity.x * delta, gravity.y * delta, gravity.z * delta));
			this.set_up_direction(Vector3.UP);
			this.move_and_slide();
			return;
		}

		this.target_position = this.player.global_transform.origin;
		if (this.state === State.APPROACH) {
			if (this.aim_preparing > 0) {
				this.aim_preparing = Math.max(this.aim_preparing - delta, 0);
			}
			const toPlayerLocal = xformInvVector(this.global_transform, this.target_position);
			const angleToPlayer = Math.atan2(toPlayerLocal.x, toPlayerLocal.z);
			if (angleToPlayer > -PLAYER_AIM_TOLERANCE_DEGREES && angleToPlayer < PLAYER_AIM_TOLERANCE_DEGREES) {
				this.shoot_countdown -= delta;
				if (this.shoot_countdown < 0.0) {
					const rayOrigin = this.ray_from.global_transform.origin;
					const rayTo = v3Add(this.player.global_transform.origin, Vector3.UP);
					const col = this.space_state.intersect_ray(
						PhysicsRayQueryParameters3D.create(rayOrigin, rayTo, 0xFFFFFFFF, this.ray_exclude),
					);
					if (!dictEmpty(col) && col.collider === this.player) {
						this.state = State.AIM;
						this.aim_countdown = AIM_TIME;
						this.aim_preparing = 0.0;
					} else {
						this.shoot_countdown = SHOOT_WAIT;
					}
				}
			}
		} else if (this.state === State.AIM || this.state === State.SHOOTING) {
			let maxDist = 1000.0;
			if (this.laser_raycast.is_colliding()) {
				maxDist = v3Sub(this.ray_from.global_transform.origin, this.laser_raycast.get_collision_point()).length();
			}
			this._clip_ray(maxDist);
			this.aim_preparing = Math.min(this.aim_preparing + delta, AIM_PREPARE_TIME);
			this.aim_countdown -= delta;
			if (this.aim_countdown < 0.0 && this.state === State.AIM) {
				const rayOrigin = this.ray_from.global_transform.origin;
				const rayTo = v3Add(this.target_position, Vector3.UP);
				const col = this.space_state.intersect_ray(
					PhysicsRayQueryParameters3D.create(rayOrigin, rayTo, 0xFFFFFFFF, this.ray_exclude),
				);
				if (!dictEmpty(col) && col.collider === this.player) {
					this.state = State.SHOOTING;
					this.shoot_countdown = SHOOT_WAIT;
					this.play_shoot();
				} else {
					this.resume_approach();
				}
			}
		}

		this.animate(delta);
		this.orientation = transformMul(this.orientation, transformFromMotion(this.animation_tree.get_root_motion_rotation(), this.animation_tree.get_root_motion_position()));
		// Root motion drives horizontal movement, with Godot gravity layered on top.
		const hVelocity = this.orientation.origin;
		let velocity = new Vector3(this.velocity);
		velocity.x = hVelocity.x / delta;
		velocity.z = hVelocity.z / delta;
		const gravity = this.get_gravity();
		velocity.x += gravity.x * delta;
		velocity.y += gravity.y * delta;
		velocity.z += gravity.z * delta;
		this.velocity = velocity;
		this.set_velocity(velocity);
		this.set_up_direction(Vector3.UP);
		this.move_and_slide();
		this.orientation.origin = new Vector3();
		this.orientation = this.orientation.orthonormalized();
		const gt = this.global_transform;
		gt.basis = this.orientation.basis;
		this.global_transform = gt;
	}

	play_shoot() {
		this.shoot_animation.play("shoot");
	}

	shoot_check() {
		this.test_shoot = true;
	}

	_clip_ray(length) {
		const meshOffset = this.ray_mesh.position.z;
		if (!dedicatedServer) {
			this.ray_mesh.get_surface_override_material(0).set_shader_parameter("clip", length + meshOffset);
		}
	}

	_on_area_body_entered(body) {
		if (body?.has_method?.("add_camera_shake_trauma") || body?.name === "Target") {
			this.player = body;
		}
	}

	_on_area_body_exited(body) {
		if (body?.has_method?.("add_camera_shake_trauma")) {
			this.player = null;
		}
	}
}


export default RedRobot;
