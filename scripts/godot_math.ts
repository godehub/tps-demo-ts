import godot from "godot";
const { Vector3, Transform3D } = godot;
import type { Basis, Quaternion, Transform3D as Transform3DType, Vector3 as Vector3Type } from "godot";

// Small math helpers keep call sites readable where JavaScript cannot use Godot's operator overloads.
export function v3Add(a: Vector3Type, b: Vector3Type): Vector3Type {
	return new Vector3(a.x + b.x, a.y + b.y, a.z + b.z);
}

export function v3Sub(a: Vector3Type, b: Vector3Type): Vector3Type {
	return new Vector3(a.x - b.x, a.y - b.y, a.z - b.z);
}

export function v3Mul(a: Vector3Type, scalar: number): Vector3Type {
	return new Vector3(a.x * scalar, a.y * scalar, a.z * scalar);
}

export function v3IsZero(a: Vector3Type): boolean {
	return a.x === 0 && a.y === 0 && a.z === 0;
}

export function xformInvVector(transform: Transform3DType, vector: Vector3Type): Vector3Type {
	const local = v3Sub(vector, transform.origin);
	const basis = transform.basis;
	return new Vector3(local.dot(basis.x), local.dot(basis.y), local.dot(basis.z));
}

export function transformMul(a: Transform3DType, b: Transform3DType): Transform3DType {
	return (a as AnyGodotObject).multiply(b) as Transform3DType;
}

export function transformFromMotion(rotation: Basis | Quaternion, position: Vector3Type): Transform3DType {
	return new Transform3D(rotation as Basis, position);
}
