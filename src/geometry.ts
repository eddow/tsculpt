import { generation } from './globals'
import { Mesh } from './types/mesh'
import { v3, type Vector3 } from './types/vectors'
import { normalize, scale, translate } from './cpu/vectors'

export function box({ size = 1, center = [0, 0, 0] as Vector3 } = {}): Mesh {
	const vertices = translate(
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
			].map(v => v3(v)),
			size
		),
		center
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
	subdivisions = 1,
	center = [0, 0, 0] as Vector3,
} = {}): Mesh {
	// =5 = question, >5 = gpu better, <5 = cpu better
	function midpoint(a: Vector3, b: Vector3): Vector3 {
		return normalize(v3((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2))
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
	let faceIndices: [number, number, number][] = [
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

			newFaces.push(
				[a, ab, ca],
				[ab, b, bc],
				[ca, bc, c],
				[ab, bc, ca]
			)
		}

		icosahedron = new Mesh(newFaces)
	}

	return new Mesh(
		icosahedron.faces,
		Array.from(icosahedron.vectors).map(v => translate([scale([v], radius)[0]], center)[0]) as Vector3[]
	)
}

export function sphere({ radius = 1, center = [0, 0, 0] as Vector3 } = {}): Mesh {
	const { grain } = generation
	// Calculate required subdivisions based on grain size
	// Initial edge length is approximately 1.051 × radius for icosahedron
	const subdivisions = Math.ceil(Math.log2((1.051 * radius) / grain))
	return geodesicSphere({ radius, subdivisions, center })
}
