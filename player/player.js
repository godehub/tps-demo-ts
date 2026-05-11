import godot from "godot";
const { Basis, CharacterBody3D, Transform3D, Vector2, Vector3 } = godot;
import { transformFromMotion, transformMul, v3Add, v3Sub } from "../scripts/godot_math.js";

export const Animations = {
	JUMP_UP: 0,
	JUMP_DOWN: 1,
	STRAFE: 2,
	WALK: 3 };

const MOTION_INTERPOLATE_SPEED = 10.0;
const ROTATION_INTERPOLATE_SPEED = 10.0;
const MIN_AIRBORNE_TIME = 0.1;
const JUMP_SPEED = 5.0;
const BulletScene = globalThis.ResourceLoader.load("res://player/bullet/bullet.tscn");

class Player extends CharacterBody3D {
	static exports = {
		player_id: { type: "int" },
		current_animation: { type: "int" } };

	static rpc_config = {
		hit: { mode: "authority", call_local: true },
	};

	airborne_time = 100.0;
	orientation = new Transform3D();
	root_motion = new Transform3D();
	motion = new Vector2();
	player_id = 1;
	current_animation = Animations.WALK;

	_ready() {
		this.initial_position = new Vector3(this.transform.origin);
		// Cache nodes used by the physics loop to avoid repeated Godot boundary calls.
		this.player_input = this.get_node("InputSynchronizer");
		this.animation_tree = this.get_node("AnimationTree");
		this.player_model = this.get_node("PlayerModel");
		this.shoot_from = this.player_model.get_node("Robot_Skeleton/Skeleton3D/GunBone/ShootFrom");
		this.shoot_particle = this.shoot_from.get_node("ShootParticle");
		this.muzzle_particle = this.shoot_from.get_node("MuzzleFlash");
		this.crosshair = this.get_node("Crosshair");
		this.fire_cooldown = this.get_node("FireCooldown");
		this.parent_node = this.get_parent();
		this.sound_effects = this.get_node("SoundEffects");
		this.sound_effect_jump = this.sound_effects.get_node("Jump");
		this.sound_effect_land = this.sound_effects.get_node("Land");
		this.sound_effect_shoot = this.sound_effects.get_node("Shoot");

		this.player_input.set_multiplayer_authority(this.player_id);
		this.orientation = new Transform3D(this.player_model.global_transform);
		this.orientation.origin = new Vector3();
		this.is_server = this.get_multiplayer().is_server();
		if (!this.is_server) {
			this.set_process(false);
		}
	}

	_physics_process(delta) {
		// The server owns gameplay state; clients only replay replicated animation state.
		if (this.is_server) {
			this.apply_input(delta);
		} else {
			this.animate(this.current_animation, delta);
		}
	}

	animate(anim, _delta) {
		this.current_animation = anim;
		if (anim === Animations.JUMP_UP) {
			this.set_state_transition("jump_up");
		} else if (anim === Animations.JUMP_DOWN) {
			this.set_state_transition("jump_down");
		} else if (anim === Animations.STRAFE) {
			this.set_state_transition("strafe");
			this.animation_tree.set("parameters/aim/add_amount", this.player_input.get_aim_rotation());
			this.animation_tree.set("parameters/strafe/blend_position", new Vector2(this.motion.x, -this.motion.y));
		} else if (anim === Animations.WALK) {
			this.animation_tree.set("parameters/aim/add_amount", 0);
			this.set_state_transition("walk");
			this.animation_tree.set("parameters/walk/blend_position", new Vector2(this.motion.length(), 0));
		}
	}

	set_state_transition(transition) {
		// AnimationTree writes cross the Godot boundary, so avoid resending the same transition every frame.
		if (this.state_transition === transition) {
			return;
		}
		this.state_transition = transition;
		this.animation_tree.set("parameters/state/transition_request", transition);
	}

	apply_input(delta) {
		this.motion = this.motion.lerp(this.player_input.motion, MOTION_INTERPOLATE_SPEED * delta);

		const cameraBasis = this.player_input.get_camera_rotation_basis();
		let cameraZ = new Vector3(cameraBasis.z);
		let cameraX = new Vector3(cameraBasis.x);
		cameraZ.y = 0;
		cameraZ = cameraZ.normalized();
		cameraX.y = 0;
		cameraX = cameraX.normalized();

		this.airborne_time += delta;
		if (this.is_on_floor()) {
			if (this.airborne_time > 0.5) {
				this.land();
			}
			this.airborne_time = 0;
		}

		let onAir = this.airborne_time > MIN_AIRBORNE_TIME;
		let velocity = new Vector3(this.velocity);
		if (!onAir && this.player_input.jumping) {
			velocity.y = JUMP_SPEED;
			onAir = true;
			this.airborne_time = MIN_AIRBORNE_TIME;
			this.jump();
		}
		this.player_input.jumping = false;

		if (onAir) {
			this.animate(velocity.y > 0 ? Animations.JUMP_UP : Animations.JUMP_DOWN, delta);
		} else if (this.player_input.aiming) {
			const qFrom = this.orientation.basis.get_rotation_quaternion();
			const qTo = this.player_input.get_camera_base_quaternion();
			this.orientation.basis = new Basis(qFrom.slerp(qTo, delta * ROTATION_INTERPOLATE_SPEED));
			this.animate(Animations.STRAFE, delta);
			this.root_motion = transformFromMotion(this.animation_tree.get_root_motion_rotation(), this.animation_tree.get_root_motion_position());

			if (this.player_input.shooting && this.fire_cooldown.time_left === 0) {
				const shootOrigin = this.shoot_from.global_transform.origin;
				const shootDir = v3Sub(this.player_input.shoot_target, shootOrigin).normalized();
				const bullet = BulletScene.instantiate();
				this.parent_node.add_child(bullet, true);
				const bulletTransform = bullet.global_transform;
				bulletTransform.origin = shootOrigin;
				bullet.global_transform = bulletTransform;
				bullet.look_at(v3Add(shootOrigin, shootDir));
				bullet.add_collision_exception_with(this);
				this.shoot();
			}
		} else {
			const target = new Vector3(
				cameraX.x * this.motion.x + cameraZ.x * this.motion.y,
				cameraX.y * this.motion.x + cameraZ.y * this.motion.y,
				cameraX.z * this.motion.x + cameraZ.z * this.motion.y,
			);
			if (target.length() > 0.001) {
				const qFrom = this.orientation.basis.get_rotation_quaternion();
				const qTo = Basis.looking_at(target).get_rotation_quaternion();
				this.orientation.basis = new Basis(qFrom.slerp(qTo, delta * ROTATION_INTERPOLATE_SPEED));
			}
			this.animate(Animations.WALK, delta);
			this.root_motion = transformFromMotion(this.animation_tree.get_root_motion_rotation(), this.animation_tree.get_root_motion_position());
		}

		// Convert animation root motion into CharacterBody velocity while keeping gravity from Godot.
		this.orientation = transformMul(this.orientation, this.root_motion);
		const hVelocity = this.orientation.origin;
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
		const modelTransform = this.player_model.global_transform;
		modelTransform.basis = this.orientation.basis;
		this.player_model.global_transform = modelTransform;

		if (this.transform.origin.y < -40.0) {
			const transform = this.transform;
			transform.origin = this.initial_position;
			this.transform = transform;
		}
	}

	jump() {
		this.animate(Animations.JUMP_UP, 0.0);
		this.sound_effect_jump.play();
	}

	land() {
		this.animate(Animations.JUMP_DOWN, 0.0);
		this.sound_effect_land.play();
	}

	shoot() {
		this.shoot_particle.restart();
		this.shoot_particle.emitting = true;
		this.muzzle_particle.restart();
		this.muzzle_particle.emitting = true;
		this.fire_cooldown.start();
		this.sound_effect_shoot.play();
		this.add_camera_shake_trauma(0.35);
	}

	hit() {
		this.add_camera_shake_trauma(0.75);
	}

	add_camera_shake_trauma(amount) {
		this.player_input.camera_camera.add_trauma(amount);
	}
}


export default Player;
