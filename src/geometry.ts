import { generation } from './globals'
import { Mesh } from './mesh'
import { v3, type Vector3 } from './types'
import { normalize, scale, translate } from './cpu/vectors'

export function box({ size = 1, center = [0, 0, 0] as Vector3 } = {}): Mesh {
	return new Mesh(
		translate(
			scale(
				[
					[-1, -1, -1],
					[1, -1, -1],
					[1, 1, -1],
					[-1, 1, -1],
					[-1, -1, 1],
					[1, -1, 1],
					[1, 1, 1],
					[-1, 1, 1],
				],
				size
			),
			center
		),
		[
			// Front face (CCW from outside)
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
	)
}

export function geodesicSphere({
	radius = 1,
	subdivisions = 1,
	center = [0, 0, 0] as Vector3,
} = {}): Mesh {
	// =5 = question, >5 = gpu better, <5 = cpu better
	function midpoint(a: Vector3, b: Vector3): Vector3 {
		return normalize([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2])
	}

	// Start with icosahedron vertices
	const t = (1 + Math.sqrt(5)) / 2
	let vertices: Vector3[] = [
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
	].map((v) => normalize(v3(v)))

	// Initial icosahedron faces
	let faces: [number, number, number][] = [
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

	// Subdivide faces
	for (let i = 0; i < subdivisions; i++) {
		const newFaces: [number, number, number][] = []
		const vertexMap = new Map<string, number>()

		function getMiddlePoint(a: number, b: number): number {
			// Ensure consistent vertex order for edge
			const [v1, v2] = a < b ? [a, b] : [b, a]
			const key = `${v1}-${v2}`

			if (vertexMap.has(key)) {
				return vertexMap.get(key)!
			}

			const point = midpoint(vertices[v1], vertices[v2])
			const index = vertices.length
			vertices.push(point)
			vertexMap.set(key, index)
			return index
		}

		for (const face of faces) {
			const a = face[0]
			const b = face[1]
			const c = face[2]
			const ab = getMiddlePoint(a, b)
			const bc = getMiddlePoint(b, c)
			const ca = getMiddlePoint(c, a)

			newFaces.push(
				[a, ab, ca] as [number, number, number],
				[ab, b, bc] as [number, number, number],
				[ca, bc, c] as [number, number, number],
				[ab, bc, ca] as [number, number, number]
			)
		}

		faces = newFaces
	}

	// Scale vertices to desired radius
	vertices = vertices.map((v) => [v[0] * radius, v[1] * radius, v[2] * radius] as Vector3)

	return new Mesh(translate(vertices, center), faces)
}

export function sphere({ radius = 1, center = [0, 0, 0] as Vector3 } = {}): Mesh {
	const { grain } = generation
	// Calculate required subdivisions based on grain size
	// Initial edge length is approximately 1.051 × radius for icosahedron
	const subdivisions = Math.ceil(Math.log2((1.051 * radius) / grain))
	return geodesicSphere({ radius, subdivisions, center })
}
