import { generation } from './globals'
import { Vector3, v3 } from './types'
import { Mesh } from './types/mesh'

type BoxSpec = [{ radius?: number | Vector3; center?: Vector3 }] | [Vector3, Vector3]

function bSpec(spec: BoxSpec): { radius: number | Vector3; center: Vector3 } {
	if (spec.length === 1) {
		const { radius, center } = {
			radius: 1,
			center: v3(0, 0, 0),
			...spec[0],
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
		[-1, 1, 1]
	).map((v) => {
		const scaled = Vector3.dot(v, radius)
		return Vector3.add(scaled, center)
	})

	const faceIndices: [number, number, number][] = [
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

	return new Mesh(faceIndices, vertices)
}

export function geodesicSphere({
	radius = 1,
	// =5 = question, >5 = gpu better, <5 = cpu better
	subdivisions = 1,
	center = v3(0, 0, 0),
}: { radius: number | Vector3; subdivisions: number; center: Vector3 }): Mesh {
	function midpoint(a: Vector3, b: Vector3): Vector3 {
		return v3`${a} + ${b}`.normalized() as Vector3
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
		[-t, 0, 1]
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

type CylinderSpec = [
	{
		radius?: number | Vector3
		height?: number
		center?: Vector3
		segments?: number
	},
]

function cylinderSpec(spec: CylinderSpec): {
	radius: number
	height: number
	center: Vector3
	segments: number
} {
	const { radius = 1, height = 2, center = v3(0, 0, 0), segments } = spec[0]
	const { grain } = generation

	// Calculate segments based on grain size if not provided
	const calcRadius = typeof radius === 'number' ? radius : Math.max(...radius)
	const circumference = 2 * Math.PI * calcRadius
	const calculatedSegments = segments ?? Math.max(8, Math.ceil(circumference / grain))

	return {
		radius: typeof radius === 'number' ? radius : radius[0],
		height,
		center,
		segments: calculatedSegments,
	}
}

export function cylinder(...spec: CylinderSpec): Mesh {
	const { radius, height, center, segments } = cylinderSpec(spec)

	// Create vertices for top and bottom circles
	const vertices: Vector3[] = []

	// Bottom circle vertices
	for (let i = 0; i < segments; i++) {
		const angle = (2 * Math.PI * i) / segments
		const x = radius * Math.cos(angle)
		const y = radius * Math.sin(angle)
		vertices.push(v3(x, y, -height / 2))
	}

	// Top circle vertices
	for (let i = 0; i < segments; i++) {
		const angle = (2 * Math.PI * i) / segments
		const x = radius * Math.cos(angle)
		const y = radius * Math.sin(angle)
		vertices.push(v3(x, y, height / 2))
	}

	// Add center vertices for top and bottom faces
	const bottomCenter = segments
	const topCenter = segments + 1
	vertices.push(v3(0, 0, -height / 2), v3(0, 0, height / 2))

	// Create faces
	const faces: [Vector3, Vector3, Vector3][] = []

	// Bottom face (triangulated)
	for (let i = 0; i < segments; i++) {
		const next = (i + 1) % segments
		faces.push([vertices[bottomCenter], vertices[next], vertices[i]])
	}

	// Top face (triangulated)
	for (let i = 0; i < segments; i++) {
		const next = (i + 1) % segments
		faces.push([vertices[topCenter], vertices[i + segments], vertices[next + segments]])
	}

	// Side faces (quads triangulated)
	for (let i = 0; i < segments; i++) {
		const next = (i + 1) % segments
		const bottom1 = vertices[i]
		const bottom2 = vertices[next]
		const top1 = vertices[i + segments]
		const top2 = vertices[next + segments]

		// Triangulate the quad
		faces.push([bottom1, bottom2, top1])
		faces.push([bottom2, top2, top1])
	}

	// Apply center offset
	const mesh = new Mesh(faces)
	return new Mesh(
		mesh.faces,
		mesh.vectors.map((v) => v3`${v} + ${center}`)
	)
}

type ConeSpec = [
	{
		radius?: number
		height?: number
		center?: Vector3
		segments?: number
	},
]

function coneSpec(spec: ConeSpec): {
	radius: number
	height: number
	center: Vector3
	segments: number
} {
	const { radius = 1, height = 2, center = v3(0, 0, 0), segments } = spec[0]
	const { grain } = generation

	// Calculate segments based on grain size if not provided
	const circumference = 2 * Math.PI * radius
	const calculatedSegments = segments ?? Math.max(8, Math.ceil(circumference / grain))

	return { radius, height, center, segments: calculatedSegments }
}

export function cone(...spec: ConeSpec): Mesh {
	const { radius, height, center, segments } = coneSpec(spec)

	// Create vertices
	const vertices: Vector3[] = []

	// Bottom circle vertices
	for (let i = 0; i < segments; i++) {
		const angle = (2 * Math.PI * i) / segments
		const x = radius * Math.cos(angle)
		const y = radius * Math.sin(angle)
		vertices.push(v3(x, y, -height / 2))
	}

	// Apex vertex
	vertices.push(v3(0, 0, height / 2))

	// Add center vertex for bottom face
	const bottomCenter = segments
	const apex = segments + 1
	vertices.push(v3(0, 0, -height / 2))

	// Create faces
	const faces: [Vector3, Vector3, Vector3][] = []

	// Bottom face (triangulated)
	for (let i = 0; i < segments; i++) {
		const next = (i + 1) % segments
		faces.push([vertices[bottomCenter], vertices[next], vertices[i]])
	}

	// Side faces (triangles)
	for (let i = 0; i < segments; i++) {
		const next = (i + 1) % segments
		faces.push([vertices[apex], vertices[i], vertices[next]])
	}

	// Apply center offset
	const mesh = new Mesh(faces)
	return new Mesh(
		mesh.faces,
		mesh.vectors.map((v) => v3`${v} + ${center}`)
	)
}

type TorusSpec = [
	{
		radius?: number
		thickness?: number
		center?: Vector3
		segments?: number
		ringSegments?: number
	},
]

function torusSpec(spec: TorusSpec): {
	radius: number
	thickness: number
	center: Vector3
	segments: number
	ringSegments: number
} {
	const { radius = 2, thickness = 0.5, center = v3(0, 0, 0), segments, ringSegments } = spec[0]
	const { grain } = generation

	// Calculate segments based on grain size if not provided
	const outerCircumference = 2 * Math.PI * radius
	const innerCircumference = 2 * Math.PI * thickness
	const calculatedSegments = segments ?? Math.max(8, Math.ceil(outerCircumference / grain))
	const calculatedRingSegments = ringSegments ?? Math.max(6, Math.ceil(innerCircumference / grain))

	return {
		radius,
		thickness,
		center,
		segments: calculatedSegments,
		ringSegments: calculatedRingSegments,
	}
}

export function torus(...spec: TorusSpec): Mesh {
	const { radius, thickness, center, segments, ringSegments } = torusSpec(spec)

	// Create vertices
	const vertices: Vector3[] = []

	for (let i = 0; i < segments; i++) {
		const segmentAngle = (2 * Math.PI * i) / segments
		const cosSegment = Math.cos(segmentAngle)
		const sinSegment = Math.sin(segmentAngle)

		for (let j = 0; j < ringSegments; j++) {
			const ringAngle = (2 * Math.PI * j) / ringSegments
			const cosRing = Math.cos(ringAngle)
			const sinRing = Math.sin(ringAngle)

			const x = (radius + thickness * cosRing) * cosSegment
			const y = (radius + thickness * cosRing) * sinSegment
			const z = thickness * sinRing

			vertices.push(v3(x, y, z))
		}
	}

	// Create faces
	const faces: [Vector3, Vector3, Vector3][] = []

	for (let i = 0; i < segments; i++) {
		const nextI = (i + 1) % segments

		for (let j = 0; j < ringSegments; j++) {
			const nextJ = (j + 1) % ringSegments

			const v1 = vertices[i * ringSegments + j]
			const v2 = vertices[nextI * ringSegments + j]
			const v3 = vertices[nextI * ringSegments + nextJ]
			const v4 = vertices[i * ringSegments + nextJ]

			// Triangulate the quad
			faces.push([v1, v2, v3])
			faces.push([v1, v3, v4])
		}
	}

	// Apply center offset
	const mesh = new Mesh(faces)
	return new Mesh(
		mesh.faces,
		mesh.vectors.map((v) => v3`${v} + ${center}`)
	)
}
