import godot from "godot";
const { LightmapGI, Node3D, Vector3 } = godot;
import type { InputEvent, LightmapGI as LightmapGIType, Node, Node3D as Node3DType, PackedScene, Resource, Vector3 as Vector3Type } from "godot";

const RedRobot = globalThis.ResourceLoader.load("res://enemies/red_robot/red_robot.tscn") as PackedSceneOf<Node3DType>;
const PlayerScene = globalThis.ResourceLoader.load("res://player/player.tscn") as PackedSceneOf<PlayerNode>;

type SpawnPoint = Node3DType;
type SpawnedPlayer = PlayerNode & { player_id: number; transform: import("godot").Transform3D };
type LightmapResource = Resource & { name: string };

export default class Level extends Node3D {
	static signals = {
		quit: [],
	};

	lightmap_gi: LightmapGIType | null = null;
	declare settings: SettingsNode;
	declare world_environment: WorldEnvironmentNode;
	declare robot_spawn_points: Node;
	declare player_spawn_points: Node;
	declare spawned_nodes: Node;

	_ready(): void {
		this.settings = this.get_node("/root/Settings") as SettingsNode;
		this.world_environment = this.get_node("WorldEnvironment") as WorldEnvironmentNode;
		this.robot_spawn_points = this.get_node("RobotSpawnpoints");
		this.player_spawn_points = this.get_node("PlayerSpawnpoints");
		this.spawned_nodes = this.get_node("SpawnedNodes");

		this.settings.apply_graphics_settings(this.get_window(), this.world_environment.environment, this);

		const giType = this.settings.value("rendering", "gi_type");
		if (giType === this.settings.GIType.SDFGI) {
			this.setup_sdfgi();
		} else if (giType === this.settings.GIType.VOXEL_GI) {
			this.setup_voxelgi();
		} else {
			this.setup_lightmapgi();
		}

		if (this.get_multiplayer().is_server()) {
			// Spawn all gameplay actors from the authority so MultiplayerSynchronizer can replicate them.
			for (const child of this.robot_spawn_points.get_children()) {
				this.spawn_robot(child as SpawnPoint);
			}

			const spawnPoints = this.player_spawn_points.get_children();
			spawnPoints.sort(() => Math.random() - 0.5);
			this.add_player(1, spawnPoints.shift() as SpawnPoint | undefined);
			for (const id of Array.from(this.get_multiplayer().get_peers() as unknown as number[])) {
				this.add_player(id, spawnPoints.shift() as SpawnPoint | undefined);
			}

			this.get_multiplayer().connect("peer_connected", id => this.add_player(id as number));
			this.get_multiplayer().connect("peer_disconnected", id => this.del_player(id as number));
		}
	}

	setup_sdfgi(): void {
		this.world_environment.environment.sdfgi_enabled = true;
		(this.get_node("VoxelGI") as Node3DType).hide();
		(this.get_node("ReflectionProbes") as Node3DType).hide();
		if (this.lightmap_gi !== null) {
			this.lightmap_gi.queue_free();
		}

		const quality = this.settings.value("rendering", "gi_quality");
		if (quality === this.settings.GIQuality.HIGH) {
			globalThis.RenderingServer.environment_set_sdfgi_ray_count(globalThis.RenderingServer.ENV_SDFGI_RAY_COUNT_96);
		} else if (quality === this.settings.GIQuality.LOW) {
			globalThis.RenderingServer.environment_set_sdfgi_ray_count(globalThis.RenderingServer.ENV_SDFGI_RAY_COUNT_32);
		} else {
			this.world_environment.environment.sdfgi_enabled = false;
		}
	}

	setup_voxelgi(): void {
		this.world_environment.environment.sdfgi_enabled = false;
		(this.get_node("VoxelGI") as Node3DType).show();
		(this.get_node("ReflectionProbes") as Node3DType).hide();
		if (this.lightmap_gi !== null) {
			this.lightmap_gi.queue_free();
		}

		const quality = this.settings.value("rendering", "gi_quality");
		if (quality === this.settings.GIQuality.HIGH) {
			globalThis.RenderingServer.voxel_gi_set_quality(globalThis.RenderingServer.VOXEL_GI_QUALITY_HIGH);
		} else if (quality === this.settings.GIQuality.LOW) {
			globalThis.RenderingServer.voxel_gi_set_quality(globalThis.RenderingServer.VOXEL_GI_QUALITY_LOW);
		} else {
			(this.get_node("VoxelGI") as Node3DType).hide();
		}
	}

	setup_lightmapgi(): void {
		this.world_environment.environment.sdfgi_enabled = false;
		(this.get_node("VoxelGI") as Node3DType).hide();
		(this.get_node("ReflectionProbes") as Node3DType).show();
		if (this.lightmap_gi === null) {
			const newGi = new LightmapGI();
			newGi.light_data = globalThis.ResourceLoader.load("res://level/level.lmbake") as any;
			newGi.name = "LightmapGI";
			this.lightmap_gi = newGi;
			this.add_child(newGi);
		}

		if (this.settings.value("rendering", "gi_quality") === this.settings.GIQuality.DISABLED) {
			this.lightmap_gi.hide();
			(this.get_node("ReflectionProbes") as Node3DType).hide();
		}
	}

	spawn_robot(spawnPoint: SpawnPoint): void {
		const robot = RedRobot.instantiate() as Node3DType;
		robot.transform = spawnPoint.transform;
		this.spawned_nodes.add_child(robot, true);
		robot.connect("exploded", () => this._respawn_robot(spawnPoint));
	}

	async _respawn_robot(spawnPoint: SpawnPoint): Promise<void> {
		// Keep the spawn point object instead of a copied transform so respawns follow editor placement.
		await this.get_tree().create_timer(15.0).to_signal("timeout");
		this.spawn_robot(spawnPoint);
	}

	del_player(id: number): void {
		if (!this.spawned_nodes.has_node(String(id))) {
			return;
		}
		this.spawned_nodes.get_node(String(id)).queue_free();
	}

	add_player(id: number, spawnPoint: SpawnPoint | null | undefined = null): void {
		if (spawnPoint === null || spawnPoint === undefined) {
			spawnPoint = this.player_spawn_points.get_child(Math.floor(Math.random() * this.player_spawn_points.get_child_count())) as SpawnPoint;
		}
		const player = PlayerScene.instantiate() as SpawnedPlayer;
		player.name = String(id);
		player.player_id = id;
		player.transform = spawnPoint.transform;
		this.spawned_nodes.add_child(player);
	}

	_input(input_event: InputEvent): void {
		if (input_event.is_action_pressed("quit")) {
			globalThis.Input.set_mouse_mode(globalThis.Input.MOUSE_MODE_VISIBLE);
			this.emit_signal("quit");
		}
	}
}
