import godot from "godot";
const { Vector3, Transform3D } = godot;

// Small math helpers keep call sites readable where JavaScript cannot use Godot's operator overloads.
export function v3Add(a, b) {
	return new Vector3(a.x + b.x, a.y + b.y, a.z + b.z);
}

export function v3Sub(a, b) {
	return new Vector3(a.x - b.x, a.y - b.y, a.z - b.z);
}

export function v3Mul(a, scalar) {
	return new Vector3(a.x * scalar, a.y * scalar, a.z * scalar);
}

export function v3IsZero(a) {
	return a.x === 0 && a.y === 0 && a.z === 0;
}

export function xformInvVector(transform, vector) {
	const local = v3Sub(vector, transform.origin);
	const basis = transform.basis;
	return new Vector3(local.dot(basis.x), local.dot(basis.y), local.dot(basis.z));
}

export function transformMul(a, b) {
	return a.multiply(b);
}

export function transformFromMotion(rotation, position) {
	return new Transform3D(rotation, position);
}
