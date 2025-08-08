import { generation } from './globals'
import { Vector3, v3 } from './types'
import { Mesh } from './types/mesh'

type BoxSpec =
	| [{ radius?: number | Vector3, center?: Vector3 }]
	| [Vector3, Vector3]

function bSpec(spec: BoxSpec): { radius: number | Vector3, center: Vector3 } {
	if (spec.length === 1) {
		const {radius, center} = {
			radius: 1,
			center: v3(0, 0, 0),
			...spec[0]
		}
		return { radius, center }
	}
	const [a, b] = spec
	const min = Vector3.min(a, b)
	const max = Vector3.max(a, b)
	return { radius: Vector3.sub(max, min), center: v3`(${min} + ${max}) / 2` }
}
export function box(...spec: BoxSpec): Mesh {
	const { radius, center } = bSpec(spec)
	const vertices = Vector3.array(
		[-1, -1, -1],
		[1, -1, -1],
		[1, 1, -1],
		[-1, 1, -1],
		[-1, -1, 1],
		[1, -1, 1],
		[1, 1, 1],
		[-1, 1, 1],
	).map((v) => v3`${radius} * ${v} + ${center}`)

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
}: { radius: number | Vector3, subdivisions: number, center: Vector3 }): Mesh {
	function midpoint(a: Vector3, b: Vector3): Vector3 {
		return Vector3.normalize(v3`${a} + ${b}`)
	}

	// Start with icosahedron vertices
	const t = (1 + Math.sqrt(5)) / 2
	const tSize = v3(1, t, 0).size
	const vertices = Vector3.array(
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
	).map((v) => v3`${v} / ${tSize}`)

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
		icosahedron.vectors.map((v) => v3`${radius} * ${v} + ${center}`)
	)
}

export function sphere(...spec: BoxSpec): Mesh {
	const { radius, center } = bSpec(spec)
	const { grain } = generation
	// Calculate required subdivisions based on grain size
	// Initial edge length is approximately 1.051 × radius for icosahedron
	const calcRadius = typeof radius === 'number' ? radius : Math.max(...radius)
	const subdivisions = Math.ceil(Math.log2((1.051 * calcRadius) / grain))
	return geodesicSphere({ radius, subdivisions, center })
}
