import godot from "godot";
const { InputEventMouseMotion, MultiplayerSynchronizer, PhysicsRayQueryParameters3D, Vector2, Vector3 } = godot;

const Input = globalThis.Input;

const CAMERA_CONTROLLER_ROTATION_SPEED = 3.0;
const CAMERA_MOUSE_ROTATION_SPEED = 0.001;
const CAMERA_X_ROT_MIN = -89.9 * Math.PI / 180.0;
const CAMERA_X_ROT_MAX = 70.0 * Math.PI / 180.0;
const AIM_HOLD_THRESHOLD = 0.4;

class PlayerInputSynchronizer extends MultiplayerSynchronizer {
	static exports = {
		aiming: { type: "bool" },
		shoot_target: { type: "Vector3" },
		motion: { type: "Vector2" },
		shooting: { type: "bool" },
		jumping: { type: "bool" },
		camera_animation: { type: "Object" },
		crosshair: { type: "Object" },
		camera_base: { type: "Object" },
		camera_rot: { type: "Object" },
		camera_camera: { type: "Object" },
		color_rect: { type: "Object" } };

	toggled_aim = false;
	aiming_timer = 0.0;
	aiming = false;
	shoot_target = new Vector3();
	motion = new Vector2();
	shooting = false;
	jumping = false;

	_ready() {
		// This synchronizer samples local input, then replicates the exported fields to the player owner.
		this.player = this.get_parent();
		this.space_state = this.player.get_world_3d().direct_space_state;
		this.ray_exclude = [this];
		if (this.get_multiplayer_authority() === this.get_multiplayer().get_unique_id()) {
			this.camera_camera.make_current();
			Input.set_mouse_mode(Input.MOUSE_MODE_CAPTURED);
		} else {
			this.set_process(false);
			this.set_process_input(false);
			this.color_rect.hide();
		}
	}

	_process(delta) {
		this.motion = new Vector2(
			Input.get_action_strength("move_right") - Input.get_action_strength("move_left"),
			Input.get_action_strength("move_back") - Input.get_action_strength("move_forward"),
		);
		let cameraSpeedThisFrame = delta * CAMERA_CONTROLLER_ROTATION_SPEED;
		if (this.aiming) {
			cameraSpeedThisFrame *= 0.5;
		}
		this.rotate_camera(new Vector2(
			(Input.get_action_strength("view_right") - Input.get_action_strength("view_left")) * cameraSpeedThisFrame,
			(Input.get_action_strength("view_up") - Input.get_action_strength("view_down")) * cameraSpeedThisFrame,
		));
		let currentAim = false;

		if (Input.is_action_just_released("aim") && this.aiming_timer <= AIM_HOLD_THRESHOLD) {
			currentAim = true;
			this.toggled_aim = true;
		} else {
			currentAim = this.toggled_aim || Input.is_action_pressed("aim");
			if (Input.is_action_just_pressed("aim")) {
				this.toggled_aim = false;
			}
		}

		this.aiming_timer = currentAim ? this.aiming_timer + delta : 0.0;
		if (this.aiming !== currentAim) {
			this.aiming = currentAim;
			this.camera_animation.play(this.aiming ? "shoot" : "far");
		}

		if (Input.is_action_just_pressed("jump")) {
			this.jump();
		}

		this.shooting = Input.is_action_pressed("shoot");
		if (this.shooting) {
			// Aim at the world point under the crosshair so the server can fire from the weapon muzzle.
			const crosshairPosition = this.crosshair.position;
			const crosshairSize = this.crosshair.size;
			const chPos = new Vector2(
				crosshairPosition.x + crosshairSize.x * 0.5,
				crosshairPosition.y + crosshairSize.y * 0.5,
			);
			const rayFrom = this.camera_camera.project_ray_origin(chPos);
			const rayDir = this.camera_camera.project_ray_normal(chPos);
			const rayTo = new Vector3(
				rayFrom.x + rayDir.x * 1000.0,
				rayFrom.y + rayDir.y * 1000.0,
				rayFrom.z + rayDir.z * 1000.0,
			);
			const query = PhysicsRayQueryParameters3D.create(rayFrom, rayTo, 0b11, this.ray_exclude);
			const col = this.space_state.intersect_ray(query);
			this.shoot_target = Object.keys(col).length === 0 ? rayTo : col.position;
		}

		const playerTransform = this.player.global_transform;
		const modulate = this.color_rect.modulate;
		if (playerTransform.origin.y < -17.0) {
			modulate.a = Math.min((-17.0 - playerTransform.origin.y) / 15.0, 1.0);
		} else {
			modulate.a *= 1.0 - delta * 4.0;
		}
		this.color_rect.modulate = modulate;
	}

	_input(input_event) {
		if (input_event instanceof InputEventMouseMotion) {
			let cameraSpeedThisFrame = CAMERA_MOUSE_ROTATION_SPEED;
			if (this.aiming) {
				cameraSpeedThisFrame *= 0.75;
			}
			this.rotate_camera(new Vector2(
				input_event.screen_relative.x * cameraSpeedThisFrame,
				input_event.screen_relative.y * cameraSpeedThisFrame,
			));
		}
	}

	rotate_camera(move) {
		this.camera_base.rotate_y(-move.x);
		this.camera_base.orthonormalize();
		const rotation = this.camera_rot.rotation;
		rotation.x = Math.max(CAMERA_X_ROT_MIN, Math.min(rotation.x + move.y, CAMERA_X_ROT_MAX));
		this.camera_rot.rotation = rotation;
	}

	get_aim_rotation() {
		const cameraXRot = Math.max(CAMERA_X_ROT_MIN, Math.min(this.camera_rot.rotation.x, CAMERA_X_ROT_MAX));
		return cameraXRot >= 0.0 ? -cameraXRot / CAMERA_X_ROT_MAX : cameraXRot / CAMERA_X_ROT_MIN;
	}

	get_camera_base_quaternion() {
		return this.camera_base.global_transform.basis.get_rotation_quaternion();
	}

	get_camera_rotation_basis() {
		return this.camera_rot.global_transform.basis;
	}

	jump() {
		this.jumping = true;
	}
}


export default PlayerInputSynchronizer;
