import godot from "godot";
const { Camera3D, FastNoiseLite, Vector3 } = godot;

const SPEED = 1.0;
const DECAY_RATE = 1.5;
const MAX_YAW = 0.05;
const MAX_PITCH = 0.05;
const MAX_ROLL = 0.1;
const MAX_TRAUMA = 1.2;

class CameraNoiseShakeEffect extends Camera3D {
	start_rotation = new Vector3();
	trauma = 0.0;
	time = 0.0;
	noise = new FastNoiseLite();
	noise_seed = Math.floor(Math.random() * 2147483647);

	_ready() {
		this.noise.seed = this.noise_seed;
		this.noise.fractal_octaves = 1;
		this.noise.fractal_lacunarity = 1.0;
		this.start_rotation = new Vector3(this.rotation);
	}

	_process(delta) {
		if (this.trauma > 0.0) {
			this.decay_trauma(delta);
			this.apply_shake(delta);
		}
	}

	add_trauma(amount) {
		this.trauma = Math.min(this.trauma + amount, MAX_TRAUMA);
	}

	decay_trauma(delta) {
		this.trauma = Math.max(this.trauma - DECAY_RATE * delta, 0.0);
	}

	apply_shake(delta) {
		this.time += delta * SPEED * 5000.0;
		const shake = this.trauma * this.trauma;
		const yaw = MAX_YAW * shake * this.get_noise_value(this.noise_seed, this.time);
		const pitch = MAX_PITCH * shake * this.get_noise_value(this.noise_seed + 1, this.time);
		const roll = MAX_ROLL * shake * this.get_noise_value(this.noise_seed + 2, this.time);
		this.rotation = new Vector3(
			this.start_rotation.x + pitch,
			this.start_rotation.y + yaw,
			this.start_rotation.z + roll,
		);
	}

	get_noise_value(seedValue, pos) {
		this.noise.seed = seedValue;
		return this.noise.get_noise_1d(pos);
	}
}


export default CameraNoiseShakeEffect;
