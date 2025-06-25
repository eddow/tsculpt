import { mapped, normalize } from './cpu/vector'
import { generation } from './globals'
import { type Vector3, v3 } from './types'
import { Mesh } from './types/mesh'

export function box({ size = 1, center = v3(0, 0, 0) } = {}): Mesh {
	const vertices = mapped<Vector3>(
		(v) => v3`${size} * ${v} + ${center}`,
		[
			[-1, -1, -1],
			[1, -1, -1],
			[1, 1, -1],
			[-1, 1, -1],
			[-1, -1, 1],
			[1, -1, 1],
			[1, 1, 1],
			[-1, 1, 1],
		]
	)

	const faceIndices: [number, number, number][] = [
		// Front face (CCW from outside)F
		[0, 2, 1],
		[0, 3, 2],
		// Back face
		[5, 6, 4],
		[6, 7, 4],
		// Right face
		[1, 2, 6],
		[1, 6, 5],
		// Left face
		[4, 7, 3],
		[4, 3, 0],
		// Top face
		[3, 7, 6],
		[3, 6, 2],
		// Bottom face
		[1, 5, 4],
		[1, 4, 0],
	]

	return new Mesh(faceIndices, vertices)
}

export function geodesicSphere({
	radius = 1,
	// =5 = question, >5 = gpu better, <5 = cpu better
	subdivisions = 1,
	center = v3(0, 0, 0),
} = {}): Mesh {
	function midpoint(a: Vector3, b: Vector3): Vector3 {
		return normalize(v3`${a} + ${b}`)
	}

	// Start with icosahedron vertices
	const t = (1 + Math.sqrt(5)) / 2
	const vertices = mapped<Vector3>(
		(v) => normalize(v),
		[
			[-1, t, 0],
			[1, t, 0],
			[-1, -t, 0],
			[1, -t, 0],
			[0, -1, t],
			[0, 1, t],
			[0, -1, -t],
			[0, 1, -t],
			[t, 0, -1],
			[t, 0, 1],
			[-t, 0, -1],
			[-t, 0, 1],
		]
	)

	// Initial icosahedron faces
	const faceIndices: [number, number, number][] = [
		[0, 11, 5],
		[0, 5, 1],
		[0, 1, 7],
		[0, 7, 10],
		[0, 10, 11],
		[1, 5, 9],
		[5, 11, 4],
		[11, 10, 2],
		[10, 7, 6],
		[7, 1, 8],
		[3, 9, 4],
		[3, 4, 2],
		[3, 2, 6],
		[3, 6, 8],
		[3, 8, 9],
		[4, 9, 5],
		[2, 4, 11],
		[6, 2, 10],
		[8, 6, 7],
		[9, 8, 1],
	]

	let icosahedron = new Mesh(faceIndices, vertices)

	// Subdivide faces
	for (let i = 0; i < subdivisions; i++) {
		const newFaces: [Vector3, Vector3, Vector3][] = []

		for (const face of icosahedron.verticed) {
			const a = face[0]
			const b = face[1]
			const c = face[2]
			const ab = midpoint(a, b)
			const bc = midpoint(b, c)
			const ca = midpoint(c, a)

			newFaces.push([a, ab, ca], [ab, b, bc], [ca, bc, c], [ab, bc, ca])
		}

		icosahedron = new Mesh(newFaces)
	}

	return new Mesh(
		icosahedron.faces,
		mapped<Vector3>((v) => v3`${radius} * ${v} + ${center}`, icosahedron.vectors)
	)
}

export function sphere({ radius = 1, center = v3(0, 0, 0) } = {}): Mesh {
	const { grain } = generation
	// Calculate required subdivisions based on grain size
	// Initial edge length is approximately 1.051 × radius for icosahedron
	const subdivisions = Math.ceil(Math.log2((1.051 * radius) / grain))
	return geodesicSphere({ radius, subdivisions, center })
}
