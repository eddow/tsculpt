declare module 'ts-csg-wasm' {
	export interface MeshResult {
		vertices: Float32Array
		faces: Uint32Array
	}

	export default function init(input?: {
		locateFile?: (path: string) => string
	}): Promise<void>

	/// CSG Union: A ∪ B
	export function csg_union(
		a_vertices: Float32Array,
		a_faces: Uint32Array,
		b_vertices: Float32Array,
		b_faces: Uint32Array
	): MeshResult

	/// CSG Intersection: A ∩ B
	export function csg_intersect(
		a_vertices: Float32Array,
		a_faces: Uint32Array,
		b_vertices: Float32Array,
		b_faces: Uint32Array
	): MeshResult

	/// CSG Subtraction: A \ B
	export function csg_subtract(
		a_vertices: Float32Array,
		a_faces: Uint32Array,
		b_vertices: Float32Array,
		b_faces: Uint32Array
	): MeshResult

	/// Convex Hull of a single mesh
	export function csg_hull(
		vertices: Float32Array,
		faces: Uint32Array
	): MeshResult
}
