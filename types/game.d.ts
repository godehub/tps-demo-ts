import type {
	AnimationPlayer,
	AnimationTree,
	Area3D,
	Camera3D,
	CharacterBody3D,
	ColorRect,
	ConfigFile,
	Control,
	CPUParticles3D,
	Environment,
	Light3D,
	MeshInstance3D,
	MultiplayerSynchronizer,
	Node,
	Node3D,
	PackedScene,
	ProgressBar,
	Resource,
	RigidBody3D,
	SpinBox,
	Timer,
	Vector2,
	Vector3,
	Window,
	WorldEnvironment,
} from "godot";

declare global {
	type VariantValue = import("godot").VariantArgument;
	type AnyGodotObject = Record<string, any>;

	type PackedSceneOf<T extends Node = Node> = PackedScene & {
		instantiate(): T;
	};

	type SettingsSection = "video" | "rendering";
	type VideoSettingKey = "display_mode" | "vsync" | "max_fps" | "resolution_scale" | "scale_filter";
	type RenderingSettingKey =
		| "taa"
		| "msaa"
		| "fxaa"
		| "shadow_mapping"
		| "gi_type"
		| "gi_quality"
		| "ssao_quality"
		| "ssil_quality"
		| "bloom"
		| "volumetric_fog";
	type SettingKey<S extends SettingsSection> = S extends "video" ? VideoSettingKey : RenderingSettingKey;

	type SettingsNode = Node & {
		GIType: typeof import("../menu/settings.js").GIType;
		GIQuality: typeof import("../menu/settings.js").GIQuality;
		config_file: ConfigFile;
		load_settings(): void;
		save_settings(): void;
		value<S extends SettingsSection>(section: S, key: SettingKey<S>): any;
		apply_graphics_settings(window: Window, environment: Environment, scene_root: Node): void;
	};

	type PlayerNode = CharacterBody3D & {
		player_id: number;
		current_animation: number;
		motion: Vector2;
		hit(): void;
		add_camera_shake_trauma(amount: number): void;
	};

	type PlayerInputNode = MultiplayerSynchronizer & {
		aiming: boolean;
		shoot_target: Vector3;
		motion: Vector2;
		shooting: boolean;
		jumping: boolean;
		camera_animation: AnimationPlayer;
		crosshair: Control;
		camera_base: Node3D;
		camera_rot: Node3D;
		camera_camera: Camera3D & { add_trauma(amount: number): void };
		color_rect: ColorRect;
		get_aim_rotation(): number;
		get_camera_base_quaternion(): import("godot").Quaternion;
		get_camera_rotation_basis(): import("godot").Basis;
	};

	type RobotPartNode = RigidBody3D & {
		explode(): Promise<void>;
	};

	type RayHit = {
		position: Vector3;
		collider?: Node & { rpc(method: string, ...args: VariantValue[]): unknown; has_method(method: string): boolean };
	};

	type PhysicsSpaceState = {
		intersect_ray(query: VariantValue): Partial<RayHit>;
	};

	type AnimationTreeNode = AnimationTree & {
		get_root_motion_rotation(): import("godot").Quaternion;
		get_root_motion_position(): Vector3;
	};

	type MeshNode = MeshInstance3D & {
		mesh: AnyGodotObject;
	};

	type LightNode = Light3D & {
		shadow_enabled: boolean;
	};

	type TimerNode = Timer & {
		time_left: number;
	};

	type ParticleNode = CPUParticles3D & {
		restart(): void;
	};

	type WorldEnvironmentNode = WorldEnvironment & {
		environment: Environment;
	};

	type ProgressBarNode = ProgressBar & {
		value: number;
	};

	type SpinBoxNode = SpinBox & {
		value: number;
	};

	type LineEditNode = import("godot").LineEdit & {
		text: string;
	};

	type ButtonNode = import("godot").BaseButton & {
		button_pressed: boolean;
	};

	type GodotNode = Node;
	type GodotNode3D = Node3D;

	type DoorBody = Node & {
		add_camera_shake_trauma?(amount: number): void;
	};

	type DoorArea = Area3D & {
		animation_player: AnimationPlayer;
	};

	interface Array<T> {
		sort(compareFn?: (a: T, b: T) => number): this;
	}
}

export {};
