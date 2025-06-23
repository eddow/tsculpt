import type { Vector3, VectorD } from '../types/vectors'
export function equals<Vector extends VectorD>(a: Vector, b: Vector): boolean {
	return a.length === b.length && a.every((value, index) => value === b[index])
}

export function normalize<Vector extends VectorD>(v: Vector): Vector {
	const length = Math.sqrt(v.reduce((sum, x) => sum + x * x, 0))
	return v.map((x) => x / length) as unknown as Vector
}

export function rotate3(vertices: Vector3[], angle: number, axis: Vector3): Vector3[] {
	if (angle === 0 || axis.every((v) => v === 0)) return vertices
	const [x, y, z] = axis
	const cos = Math.cos(angle)
	const sin = Math.sin(angle)
	const ux = x * x
	const uy = y * y
	const uz = z * z
	// Rotation matrix components
	const uxy = x * y * (1 - cos)
	const uxz = x * z * (1 - cos)
	const uyz = y * z * (1 - cos)
	const xs = x * sin
	const ys = y * sin
	const zs = z * sin

	// Apply rotation matrix to each vertex
	return vertices.map((vertex) => {
		const [vx, vy, vz] = vertex
		return [
			vx * (cos + ux * (1 - cos)) + vy * (uxy - zs) + vz * (uxz + ys),
			vx * (uxy + zs) + vy * (cos + uy * (1 - cos)) + vz * (uyz - xs),
			vx * (uxz - ys) + vy * (uyz + xs) + vz * (cos + uz * (1 - cos)),
		] as Vector3
	})
}
