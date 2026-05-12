import godot from "godot";
const { ConfigFile, Node, Viewport, Window } = godot;
import type { Environment, InputEvent, Node as NodeType, Window as WindowType } from "godot";

export const GIType = {
	SDFGI: 0,
	VOXEL_GI: 1,
	LIGHTMAP_GI: 2 };

export const GIQuality = {
	DISABLED: 0,
	LOW: 1,
	HIGH: 2 };

const CONFIG_FILE_PATH = "user://settings.ini";

type VideoSettings = {
	display_mode: number;
	vsync: number;
	max_fps: number;
	resolution_scale: number;
	scale_filter: number;
};

type RenderingSettings = {
	taa: boolean;
	msaa: number;
	fxaa: boolean;
	shadow_mapping: boolean;
	gi_type: number;
	gi_quality: number;
	ssao_quality: number;
	ssil_quality: number;
	bloom: boolean;
	volumetric_fog: boolean;
};

type SettingsDefaults = {
	video: VideoSettings;
	rendering: RenderingSettings;
};

export default class Settings extends Node {
	GIType = GIType;
	GIQuality = GIQuality;
	metalfx_supported = globalThis.RenderingServer.get_current_rendering_driver_name() === "metal";
	config_file = new ConfigFile();
	DEFAULTS: SettingsDefaults = {
		video: {
			display_mode: Window.MODE_EXCLUSIVE_FULLSCREEN,
			vsync: globalThis.DisplayServer.VSYNC_ENABLED ?? 1,
			max_fps: 0,
			resolution_scale: 1.0,
			scale_filter: this.metalfx_supported ? Viewport.SCALING_3D_MODE_METALFX_TEMPORAL : Viewport.SCALING_3D_MODE_FSR2 },
		rendering: {
			taa: false,
			msaa: Viewport.MSAA_DISABLED,
			fxaa: false,
			shadow_mapping: true,
			gi_type: GIType.VOXEL_GI,
			gi_quality: GIQuality.LOW,
			ssao_quality: globalThis.RenderingServer.ENV_SSAO_QUALITY_MEDIUM ?? 2,
			ssil_quality: -1,
			bloom: true,
			volumetric_fog: true } };

	_ready(): void {
		this.load_settings();
	}

	_input(input_event: InputEvent): void {
		if (input_event.is_action_pressed("toggle_fullscreen")) {
			const window = this.get_window();
			const fullscreen = window.mode === Window.MODE_EXCLUSIVE_FULLSCREEN || window.mode === Window.MODE_FULLSCREEN;
			window.mode = fullscreen ? Window.MODE_WINDOWED : Window.MODE_EXCLUSIVE_FULLSCREEN;
			this.get_viewport().set_input_as_handled();
		}
	}

	load_settings(): void {
		this.config_file.load(CONFIG_FILE_PATH);
		for (const section of Object.keys(this.DEFAULTS) as SettingsSection[]) {
			for (const key of Object.keys(this.DEFAULTS[section]) as Array<keyof SettingsDefaults[typeof section]>) {
				if (!this.config_file.has_section_key(section, key)) {
					this.config_file.set_value(section, key, this.DEFAULTS[section][key] as VariantValue);
				}
			}
		}
	}

	save_settings(): void {
		this.config_file.save(CONFIG_FILE_PATH);
	}

	value<S extends SettingsSection>(section: S, key: SettingKey<S>): any {
		return this.config_file.get_value(section, key, (this.DEFAULTS[section] as AnyGodotObject)[key]);
	}

	apply_graphics_settings(window: WindowType, environment: Environment, scene_root: NodeType): void {
		this.get_window().mode = this.value("video", "display_mode");
		globalThis.DisplayServer.window_set_vsync_mode(this.value("video", "vsync"));
		globalThis.Engine.max_fps = this.value("video", "max_fps");
		window.scaling_3d_scale = this.value("video", "resolution_scale");
		window.scaling_3d_mode = this.value("video", "scale_filter");

		window.use_taa = Boolean(this.value("rendering", "taa"));
		window.msaa_3d = Number(this.value("rendering", "msaa"));
		window.screen_space_aa = this.value("rendering", "fxaa") ? Viewport.SCREEN_SPACE_AA_FXAA : Viewport.SCREEN_SPACE_AA_DISABLED;

		if (!this.value("rendering", "shadow_mapping")) {
			scene_root.propagate_call("set", ["shadow_enabled", false]);
		}

		const ssaoQuality = this.value("rendering", "ssao_quality");
		if (ssaoQuality === -1) {
			environment.ssao_enabled = false;
		} else if (ssaoQuality === globalThis.RenderingServer.ENV_SSAO_QUALITY_MEDIUM) {
			environment.ssao_enabled = true;
			globalThis.RenderingServer.environment_set_ssao_quality(globalThis.RenderingServer.ENV_SSAO_QUALITY_HIGH, false, 0.5, 2, 50, 300);
		} else {
			environment.ssao_enabled = true;
			globalThis.RenderingServer.environment_set_ssao_quality(globalThis.RenderingServer.ENV_SSAO_QUALITY_MEDIUM, true, 0.5, 2, 50, 300);
		}

		const ssilQuality = this.value("rendering", "ssil_quality");
		if (ssilQuality === -1) {
			environment.ssil_enabled = false;
		} else if (ssilQuality === globalThis.RenderingServer.ENV_SSIL_QUALITY_MEDIUM) {
			environment.ssil_enabled = true;
			globalThis.RenderingServer.environment_set_ssil_quality(globalThis.RenderingServer.ENV_SSIL_QUALITY_MEDIUM, false, 0.5, 2, 50, 300);
		} else {
			environment.ssil_enabled = true;
			globalThis.RenderingServer.environment_set_ssil_quality(globalThis.RenderingServer.ENV_SSIL_QUALITY_HIGH, true, 0.5, 2, 50, 300);
		}

		environment.glow_enabled = Boolean(this.value("rendering", "bloom"));
		environment.volumetric_fog_enabled = Boolean(this.value("rendering", "volumetric_fog"));
	}
}
