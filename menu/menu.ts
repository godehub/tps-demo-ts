import godot from "godot";
const { BaseButton, ButtonGroup, ENetMultiplayerPeer, Node, OfflineMultiplayerPeer, Viewport, Window } = godot;
import type { Control, ENetMultiplayerPeer as ENetMultiplayerPeerType, MultiplayerPeer, Node as NodeType, OfflineMultiplayerPeer as OfflineMultiplayerPeerType, Timer } from "godot";

const LEVEL_PATH = "res://level/level.tscn";
type SelectPair = [ButtonNode, number | number[]];

export default class Menu extends Node {
	static signals = {
		replace_main_scene: [{ name: "resource", type: "Object" }],
	};

	peer: OfflineMultiplayerPeerType | ENetMultiplayerPeerType = new OfflineMultiplayerPeer();
	metalfx_supported = globalThis.RenderingServer.get_current_rendering_driver_name() === "metal";
	declare settings: SettingsNode;
	declare world_environment: WorldEnvironmentNode;
	declare ui: NodeType;
	declare main: Control;
	declare play_button: ButtonNode;
	declare settings_button: ButtonNode;
	declare quit_button: ButtonNode;
	declare online: Control;
	declare online_port: SpinBoxNode;
	declare online_address: LineEditNode;
	declare settings_menu: Control;
	declare settings_actions: NodeType;
	declare settings_action_apply: ButtonNode;
	declare settings_action_cancel: ButtonNode;
	declare loading: Control;
	declare loading_progress: ProgressBarNode;
	declare loading_done_timer: Timer;
	declare display_mode_menu: NodeType;
	declare display_mode_windowed: ButtonNode;
	declare display_mode_fullscreen: ButtonNode;
	declare display_mode_exclusive_fullscreen: ButtonNode;
	declare vsync_menu: NodeType;
	declare vsync_disabled: ButtonNode;
	declare vsync_enabled: ButtonNode;
	declare vsync_adaptive: ButtonNode;
	declare vsync_mailbox: ButtonNode;
	declare max_fps_menu: NodeType;
	declare max_fps_30: ButtonNode;
	declare max_fps_40: ButtonNode;
	declare max_fps_60: ButtonNode;
	declare max_fps_72: ButtonNode;
	declare max_fps_90: ButtonNode;
	declare max_fps_120: ButtonNode;
	declare max_fps_144: ButtonNode;
	declare max_fps_unlimited: ButtonNode;
	declare resolution_scale_menu: NodeType;
	declare resolution_scale_ultra_performance: ButtonNode;
	declare resolution_scale_performance: ButtonNode;
	declare resolution_scale_balanced: ButtonNode;
	declare resolution_scale_quality: ButtonNode;
	declare resolution_scale_ultra_quality: ButtonNode;
	declare resolution_scale_native: ButtonNode;
	declare scale_filter_menu: NodeType;
	declare scale_filter_bilinear: ButtonNode;
	declare scale_filter_fsr1: ButtonNode;
	declare scale_filter_fsr2: ButtonNode;
	declare scale_filter_metalfx_spatial: ButtonNode;
	declare scale_filter_metalfx_temporal: ButtonNode;
	declare taa_menu: NodeType;
	declare taa_disabled: ButtonNode;
	declare taa_enabled: ButtonNode;
	declare msaa_menu: NodeType;
	declare msaa_disabled: ButtonNode;
	declare msaa_2x: ButtonNode;
	declare msaa_4x: ButtonNode;
	declare msaa_8x: ButtonNode;
	declare fxaa_menu: NodeType;
	declare fxaa_disabled: ButtonNode;
	declare fxaa_enabled: ButtonNode;
	declare shadow_mapping_menu: NodeType;
	declare shadow_mapping_disabled: ButtonNode;
	declare shadow_mapping_enabled: ButtonNode;
	declare gi_type_menu: NodeType;
	declare gi_lightmapgi: ButtonNode;
	declare gi_voxelgi: ButtonNode;
	declare gi_sdfgi: ButtonNode;
	declare gi_quality_menu: NodeType;
	declare gi_disabled: ButtonNode;
	declare gi_low: ButtonNode;
	declare gi_high: ButtonNode;
	declare ssao_menu: NodeType;
	declare ssao_disabled: ButtonNode;
	declare ssao_medium: ButtonNode;
	declare ssao_high: ButtonNode;
	declare ssil_menu: NodeType;
	declare ssil_disabled: ButtonNode;
	declare ssil_medium: ButtonNode;
	declare ssil_high: ButtonNode;
	declare bloom_menu: NodeType;
	declare bloom_disabled: ButtonNode;
	declare bloom_enabled: ButtonNode;
	declare volumetric_fog_menu: NodeType;
	declare volumetric_fog_disabled: ButtonNode;
	declare volumetric_fog_enabled: ButtonNode;

	_ready(): void {
		this.settings = this.get_node("/root/Settings") as SettingsNode;
		this.world_environment = this.get_node("WorldEnvironment") as WorldEnvironmentNode;
		this.ui = this.get_node("UI");
		this.main = this.ui.get_node("Main") as Control;
		this.play_button = this.main.get_node("Play") as ButtonNode;
		this.settings_button = this.main.get_node("Settings") as ButtonNode;
		this.quit_button = this.main.get_node("Quit") as ButtonNode;
		this.online = this.ui.get_node("Online") as Control;
		this.online_port = this.online.get_node("Port") as SpinBoxNode;
		this.online_address = this.online.get_node("Address") as LineEditNode;
		this.settings_menu = this.ui.get_node("Settings") as Control;
		this.settings_actions = this.settings_menu.get_node("Actions");
		this.settings_action_apply = this.settings_actions.get_node("Apply") as ButtonNode;
		this.settings_action_cancel = this.settings_actions.get_node("Cancel") as ButtonNode;
		this.loading = this.ui.get_node("Loading") as Control;
		this.loading_progress = this.loading.get_node("Progress") as ProgressBarNode;
		this.loading_done_timer = this.loading.get_node("DoneTimer") as Timer;

		this.bindOptionNodes();
		this.settings.apply_graphics_settings(this.get_window(), this.world_environment.environment, this);
		this.play_button.grab_focus();
		if (!this.metalfx_supported) {
			this.scale_filter_metalfx_spatial.hide();
			this.scale_filter_metalfx_temporal.hide();
		}
		for (const menu of [
			this.display_mode_menu, this.vsync_menu, this.max_fps_menu, this.resolution_scale_menu, this.scale_filter_menu,
			this.taa_menu, this.msaa_menu, this.fxaa_menu, this.shadow_mapping_menu, this.gi_type_menu, this.gi_quality_menu,
			this.ssao_menu, this.ssil_menu, this.bloom_menu, this.volumetric_fog_menu,
		]) {
			this._make_button_group(menu);
		}
	}

	bindOptionNodes(): void {
		// Keep the long settings form declarative while still caching every control node once.
		const bind = (field: string, path: string) => { (this as AnyGodotObject)[field] = this.settings_menu.get_node(path); };
		bind("display_mode_menu", "DisplayMode");
		bind("display_mode_windowed", "DisplayMode/Windowed");
		bind("display_mode_fullscreen", "DisplayMode/Fullscreen");
		bind("display_mode_exclusive_fullscreen", "DisplayMode/ExclusiveFullscreen");
		bind("vsync_menu", "VSync");
		bind("vsync_disabled", "VSync/Disabled");
		bind("vsync_enabled", "VSync/Enabled");
		bind("vsync_adaptive", "VSync/Adaptive");
		bind("vsync_mailbox", "VSync/Mailbox");
		bind("max_fps_menu", "MaxFPS");
		for (const fps of ["30", "40", "60", "72", "90", "120", "144", "Unlimited"]) bind(`max_fps_${fps.toLowerCase()}`, `MaxFPS/${fps}`);
		bind("resolution_scale_menu", "ResolutionScale");
		for (const name of ["UltraPerformance", "Performance", "Balanced", "Quality", "UltraQuality", "Native"]) bind(`resolution_scale_${name.replace(/[A-Z]/g, m => `_${m.toLowerCase()}`).replace(/^_/, "")}`, `ResolutionScale/${name}`);
		bind("scale_filter_menu", "ScaleFilter");
		bind("scale_filter_bilinear", "ScaleFilter/Bilinear");
		bind("scale_filter_fsr1", "ScaleFilter/FSR1");
		bind("scale_filter_metalfx_spatial", "ScaleFilter/MetalFXSpatial");
		bind("scale_filter_fsr2", "ScaleFilter/FSR2");
		bind("scale_filter_metalfx_temporal", "ScaleFilter/MetalFXTemporal");
		for (const [section, key] of [
			["TAA", "taa"],
			["FXAA", "fxaa"],
			["ShadowMapping", "shadow_mapping"],
			["Bloom", "bloom"],
			["VolumetricFog", "volumetric_fog"],
		]) {
			bind(`${key}_menu`, section);
			bind(`${key}_disabled`, `${section}/Disabled`);
			bind(`${key}_enabled`, `${section}/Enabled`);
		}
		bind("msaa_menu", "MSAA");
		bind("msaa_disabled", "MSAA/Disabled");
		bind("msaa_2x", "MSAA/2X");
		bind("msaa_4x", "MSAA/4X");
		bind("msaa_8x", "MSAA/8X");
		bind("gi_type_menu", "GIType");
		bind("gi_lightmapgi", "GIType/LightmapGI");
		bind("gi_voxelgi", "GIType/VoxelGI");
		bind("gi_sdfgi", "GIType/SDFGI");
		bind("gi_quality_menu", "GIQuality");
		bind("gi_disabled", "GIQuality/Disabled");
		bind("gi_low", "GIQuality/Low");
		bind("gi_high", "GIQuality/High");
		for (const section of ["SSAO", "SSIL"]) {
			const key = section.toLowerCase();
			bind(`${key}_menu`, section);
			bind(`${key}_disabled`, `${section}/Disabled`);
			bind(`${key}_medium`, `${section}/Medium`);
			bind(`${key}_high`, `${section}/High`);
		}
	}

	_process(_delta: number): void {
		if (this.loading.visible) {
			// Poll threaded loading from the menu so the UI stays responsive during scene preparation.
			const progress: number[] = [];
			const status = globalThis.ResourceLoader.load_threaded_get_status(LEVEL_PATH, progress);
			if (status === globalThis.ResourceLoader.THREAD_LOAD_IN_PROGRESS) {
				this.loading_progress.value = progress[0] * 100.0;
			} else if (status === globalThis.ResourceLoader.THREAD_LOAD_LOADED) {
				this.loading_progress.value = 100.0;
				this.set_process(false);
				this.loading_done_timer.start();
			} else {
				console.log(`Error while loading level: ${status}`);
				this.main.show();
				this.loading.hide();
			}
		}
	}

	_make_button_group(common_parent: NodeType): void {
		const group = new ButtonGroup();
		for (const btn of common_parent.get_children()) {
			if (btn instanceof BaseButton) {
				btn.button_group = group;
			}
		}
	}

	_on_loading_done_timer_timeout(): void {
		this.get_multiplayer().multiplayer_peer = this.peer as unknown as MultiplayerPeer;
		this.emit_signal("replace_main_scene", globalThis.ResourceLoader.load_threaded_get(LEVEL_PATH));
	}

	_on_play_pressed(): void {
		this.main.hide();
		this.loading.show();
		globalThis.ResourceLoader.load_threaded_request(LEVEL_PATH, "", true);
	}

	_on_settings_pressed(): void {
		this.main.hide();
		this.settings_menu.show();
		this.settings_action_cancel.grab_focus();
		const cfg = this.settings.config_file;
		this.selectValue([
			[this.display_mode_windowed, [Window.MODE_WINDOWED, Window.MODE_MAXIMIZED]],
			[this.display_mode_fullscreen, [Window.MODE_FULLSCREEN]],
			[this.display_mode_exclusive_fullscreen, [Window.MODE_EXCLUSIVE_FULLSCREEN]],
		], cfg.get_value("video", "display_mode"));
		this.selectValue([
			[this.vsync_disabled, globalThis.DisplayServer.VSYNC_DISABLED],
			[this.vsync_enabled, globalThis.DisplayServer.VSYNC_ENABLED],
			[this.vsync_adaptive, globalThis.DisplayServer.VSYNC_ADAPTIVE],
			[this.vsync_mailbox, globalThis.DisplayServer.VSYNC_MAILBOX],
		], cfg.get_value("video", "vsync"));
		this.selectValue([
			[this.max_fps_30, 30], [this.max_fps_40, 40], [this.max_fps_60, 60], [this.max_fps_72, 72],
			[this.max_fps_90, 90], [this.max_fps_120, 120], [this.max_fps_144, 144], [this.max_fps_unlimited, 0],
		], cfg.get_value("video", "max_fps"));
		this.selectApprox([
			[this.resolution_scale_ultra_performance, 1.0 / 3.0], [this.resolution_scale_performance, 1.0 / 2.0],
			[this.resolution_scale_balanced, 1.0 / 1.7], [this.resolution_scale_quality, 1.0 / 1.5],
			[this.resolution_scale_ultra_quality, 1.0 / 1.3], [this.resolution_scale_native, 1.0],
			], Number(cfg.get_value("video", "resolution_scale")));
		this.selectValue([
			[this.scale_filter_bilinear, Viewport.SCALING_3D_MODE_BILINEAR],
			[this.scale_filter_fsr1, Viewport.SCALING_3D_MODE_FSR],
			[this.scale_filter_fsr2, Viewport.SCALING_3D_MODE_FSR2],
			[this.scale_filter_metalfx_spatial, Viewport.SCALING_3D_MODE_METALFX_SPATIAL],
			[this.scale_filter_metalfx_temporal, Viewport.SCALING_3D_MODE_METALFX_TEMPORAL],
		], cfg.get_value("video", "scale_filter"));
		this.selectValue([[this.gi_lightmapgi, this.settings.GIType.LIGHTMAP_GI], [this.gi_voxelgi, this.settings.GIType.VOXEL_GI], [this.gi_sdfgi, this.settings.GIType.SDFGI]], cfg.get_value("rendering", "gi_type"));
		this.selectValue([[this.gi_disabled, this.settings.GIQuality.DISABLED], [this.gi_low, this.settings.GIQuality.LOW], [this.gi_high, this.settings.GIQuality.HIGH]], cfg.get_value("rendering", "gi_quality"));
		this.taa_disabled.button_pressed = !cfg.get_value("rendering", "taa");
		this.taa_enabled.button_pressed = Boolean(cfg.get_value("rendering", "taa"));
		this.selectValue([[this.msaa_disabled, Viewport.MSAA_DISABLED], [this.msaa_2x, Viewport.MSAA_2X], [this.msaa_4x, Viewport.MSAA_4X], [this.msaa_8x, Viewport.MSAA_8X]], cfg.get_value("rendering", "msaa"));
		this.fxaa_disabled.button_pressed = !cfg.get_value("rendering", "fxaa");
		this.fxaa_enabled.button_pressed = Boolean(cfg.get_value("rendering", "fxaa"));
		this.shadow_mapping_disabled.button_pressed = !cfg.get_value("rendering", "shadow_mapping");
		this.shadow_mapping_enabled.button_pressed = Boolean(cfg.get_value("rendering", "shadow_mapping"));
		this.selectValue([[this.ssao_disabled, -1], [this.ssao_medium, globalThis.RenderingServer.ENV_SSAO_QUALITY_MEDIUM], [this.ssao_high, globalThis.RenderingServer.ENV_SSAO_QUALITY_HIGH]], cfg.get_value("rendering", "ssao_quality"));
		this.selectValue([[this.ssil_disabled, -1], [this.ssil_medium, globalThis.RenderingServer.ENV_SSIL_QUALITY_MEDIUM], [this.ssil_high, globalThis.RenderingServer.ENV_SSIL_QUALITY_HIGH]], cfg.get_value("rendering", "ssil_quality"));
		this.bloom_disabled.button_pressed = !cfg.get_value("rendering", "bloom");
		this.bloom_enabled.button_pressed = Boolean(cfg.get_value("rendering", "bloom"));
		this.volumetric_fog_disabled.button_pressed = !cfg.get_value("rendering", "volumetric_fog");
		this.volumetric_fog_enabled.button_pressed = Boolean(cfg.get_value("rendering", "volumetric_fog"));
	}

	selectValue(pairs: SelectPair[], value: VariantValue): void {
		for (const [button, expected] of pairs) {
			button.button_pressed = Array.isArray(expected) ? expected.includes(value) : expected === value;
		}
	}

	selectApprox(pairs: Array<[ButtonNode, number]>, value: number): void {
		for (const [button, expected] of pairs) {
			button.button_pressed = Math.abs(value - expected) < 0.00001;
		}
	}

	_on_quit_pressed(): void {
		this.get_tree().quit();
	}

	_on_apply_pressed(): void {
		const cfg = this.settings.config_file;
		this.main.show();
		this.play_button.grab_focus();
		this.settings_menu.hide();
		this.storeSelected("video", "display_mode", [[this.display_mode_windowed, Window.MODE_WINDOWED], [this.display_mode_fullscreen, Window.MODE_FULLSCREEN], [this.display_mode_exclusive_fullscreen, Window.MODE_EXCLUSIVE_FULLSCREEN]]);
		this.storeSelected("video", "vsync", [[this.vsync_disabled, globalThis.DisplayServer.VSYNC_DISABLED], [this.vsync_enabled, globalThis.DisplayServer.VSYNC_ENABLED], [this.vsync_adaptive, globalThis.DisplayServer.VSYNC_ADAPTIVE], [this.vsync_mailbox, globalThis.DisplayServer.VSYNC_MAILBOX]]);
		this.storeSelected("video", "max_fps", [[this.max_fps_30, 30], [this.max_fps_40, 40], [this.max_fps_60, 60], [this.max_fps_72, 72], [this.max_fps_90, 90], [this.max_fps_120, 120], [this.max_fps_144, 144], [this.max_fps_unlimited, 0]]);
		this.storeSelected("video", "resolution_scale", [[this.resolution_scale_ultra_performance, 1.0 / 3.0], [this.resolution_scale_performance, 1.0 / 2.0], [this.resolution_scale_balanced, 1.0 / 1.7], [this.resolution_scale_quality, 1.0 / 1.5], [this.resolution_scale_ultra_quality, 1.0 / 1.3], [this.resolution_scale_native, 1.0]]);
		this.storeSelected("video", "scale_filter", [[this.scale_filter_bilinear, Viewport.SCALING_3D_MODE_BILINEAR], [this.scale_filter_fsr1, Viewport.SCALING_3D_MODE_FSR], [this.scale_filter_fsr2, Viewport.SCALING_3D_MODE_FSR2], [this.scale_filter_metalfx_spatial, Viewport.SCALING_3D_MODE_METALFX_SPATIAL], [this.scale_filter_metalfx_temporal, Viewport.SCALING_3D_MODE_METALFX_TEMPORAL]]);
		this.storeSelected("rendering", "gi_type", [[this.gi_lightmapgi, this.settings.GIType.LIGHTMAP_GI], [this.gi_voxelgi, this.settings.GIType.VOXEL_GI], [this.gi_sdfgi, this.settings.GIType.SDFGI]]);
		this.storeSelected("rendering", "gi_quality", [[this.gi_low, this.settings.GIQuality.LOW], [this.gi_high, this.settings.GIQuality.HIGH], [this.gi_disabled, this.settings.GIQuality.DISABLED]]);
		cfg.set_value("rendering", "taa", this.taa_enabled.button_pressed);
		this.storeSelected("rendering", "msaa", [[this.msaa_disabled, Viewport.MSAA_DISABLED], [this.msaa_2x, Viewport.MSAA_2X], [this.msaa_4x, Viewport.MSAA_4X], [this.msaa_8x, Viewport.MSAA_8X]]);
		cfg.set_value("rendering", "shadow_mapping", this.shadow_mapping_enabled.button_pressed);
		cfg.set_value("rendering", "fxaa", this.fxaa_enabled.button_pressed);
		this.storeSelected("rendering", "ssao_quality", [[this.ssao_disabled, -1], [this.ssao_medium, globalThis.RenderingServer.ENV_SSAO_QUALITY_MEDIUM], [this.ssao_high, globalThis.RenderingServer.ENV_SSAO_QUALITY_HIGH]]);
		this.storeSelected("rendering", "ssil_quality", [[this.ssil_disabled, -1], [this.ssil_medium, globalThis.RenderingServer.ENV_SSIL_QUALITY_MEDIUM], [this.ssil_high, globalThis.RenderingServer.ENV_SSIL_QUALITY_HIGH]]);
		cfg.set_value("rendering", "bloom", this.bloom_enabled.button_pressed);
		cfg.set_value("rendering", "volumetric_fog", this.volumetric_fog_enabled.button_pressed);
		this.settings.apply_graphics_settings(this.get_window(), this.world_environment.environment, this);
		this.settings.save_settings();
	}

	storeSelected(section: SettingsSection, key: string, pairs: SelectPair[]): void {
		for (const [button, value] of pairs) {
			if (button.button_pressed) {
				this.settings.config_file.set_value(section, key, value);
				return;
			}
		}
	}

	_on_cancel_pressed(): void {
		this.main.show();
		this.play_button.grab_focus();
		this.settings_menu.hide();
		this.online.hide();
	}

	_on_play_online_pressed(): void {
		this.online.show();
		this.main.hide();
	}

	_on_host_pressed(): void {
		const peer = new ENetMultiplayerPeer();
		peer.create_server(Number(this.online_port.value));
		this.peer = peer;
		this._on_play_pressed();
		this.online.hide();
	}

	_on_connect_pressed(): void {
		const peer = new ENetMultiplayerPeer();
		peer.create_client(this.online_address.text, Number(this.online_port.value));
		this.peer = peer;
		this._on_play_pressed();
		this.online.hide();
	}
}
