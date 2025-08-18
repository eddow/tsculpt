import { generation } from './globals'
import { Vector3, v3 } from './types'
import { Mesh } from './types/mesh'

type BoxSpec = { radius?: number | Vector3; center?: Vector3 } | [Vector3, Vector3]

function bSpec(spec: BoxSpec): { radius: number | Vector3; center: Vector3 } {
	if (Array.isArray(spec) && spec.length === 2) {
		const [a, b] = spec
		const min = Vector3.min(a, b)
		const max = Vector3.max(a, b)
		return { radius: Vector3.sub(max, min), center: v3`(${min} + ${max}) / 2` }
	}
	const { radius = 1, center = v3(0, 0, 0) } = spec as {
		radius?: number | Vector3
		center?: Vector3
	}
	return { radius, center }
}

export function box(spec: BoxSpec = {}): Mesh {
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
		const scaled = Vector3.scale(v, radius)
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
		return v3`${a} + ${b}`.normalized as Vector3
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

export function sphere(spec: BoxSpec = {}): Mesh {
	const { radius, center } = bSpec(spec)
	const { grain } = generation
	// Calculate required subdivisions based on grain size
	// Initial edge length is approximately 1.051 × radius for icosahedron
	const calcRadius = typeof radius === 'number' ? radius : Math.max(...radius)
	const subdivisions = Math.ceil(Math.log2((1.051 * calcRadius) / grain))
	return geodesicSphere({ radius, subdivisions, center })
}

type CylinderSpec = {
	radius?: number | Vector3
	height?: number
	center?: Vector3
	segments?: number
}

function cylinderSpec(spec: CylinderSpec): {
	radius: number
	height: number
	center: Vector3
	segments: number
} {
	const { radius = 1, height = 2, center = v3(0, 0, 0), segments } = spec
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

export function cylinder(spec: CylinderSpec = {}): Mesh {
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

type ConeSpec = {
	radius?: number
	height?: number
	center?: Vector3
	segments?: number
}

function coneSpec(spec: ConeSpec): {
	radius: number
	height: number
	center: Vector3
	segments: number
} {
	const { radius = 1, height = 2, center = v3(0, 0, 0), segments } = spec
	const { grain } = generation

	// Calculate segments based on grain size if not provided
	const circumference = 2 * Math.PI * radius
	const calculatedSegments = segments ?? Math.max(8, Math.ceil(circumference / grain))

	return { radius, height, center, segments: calculatedSegments }
}

export function cone(spec: ConeSpec = {}): Mesh {
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

type TorusSpec = {
	radius?: number
	thickness?: number
	center?: Vector3
	segments?: number
	ringSegments?: number
}

function torusSpec(spec: TorusSpec): {
	radius: number
	thickness: number
	center: Vector3
	segments: number
	ringSegments: number
} {
	const { radius = 2, thickness = 0.5, center = v3(0, 0, 0), segments, ringSegments } = spec
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

export function torus(spec: TorusSpec = {}): Mesh {
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

			const x1 = vertices[i * ringSegments + j]
			const x2 = vertices[nextI * ringSegments + j]
			const x3 = vertices[nextI * ringSegments + nextJ]
			const x4 = vertices[i * ringSegments + nextJ]

			// Triangulate the quad
			faces.push([x1, x2, x3])
			faces.push([x1, x3, x4])
		}
	}

	// Apply center offset
	const mesh = new Mesh(faces)
	return new Mesh(
		mesh.faces,
		mesh.vectors.map((v) => v3`${v} + ${center}`)
	)
}

// New primitives

type FrustumSpec = {
	bottomRadius?: number
	topRadius?: number
	height?: number
	center?: Vector3
	segments?: number
}
export function frustum(spec: FrustumSpec = {}): Mesh {
	const { bottomRadius = 1, topRadius = 0.5, height = 2, center = v3(0, 0, 0), segments } = spec
	const { grain } = generation
	const circumference = 2 * Math.PI * Math.max(bottomRadius, topRadius)
	const segs = segments ?? Math.max(8, Math.ceil(circumference / grain))
	const bottom: Vector3[] = []
	const top: Vector3[] = []
	for (let i = 0; i < segs; i++) {
		const a = (2 * Math.PI * i) / segs
		bottom.push(v3(bottomRadius * Math.cos(a), bottomRadius * Math.sin(a), -height / 2))
		top.push(v3(topRadius * Math.cos(a), topRadius * Math.sin(a), height / 2))
	}
	const bottomCenter = v3(0, 0, -height / 2)
	const topCenter = v3(0, 0, height / 2)
	const faces: [Vector3, Vector3, Vector3][] = []
	// bottom cap if radius > 0
	if (bottomRadius > 0) {
		for (let i = 0; i < segs; i++) {
			const next = (i + 1) % segs
			faces.push([bottomCenter, bottom[next], bottom[i]])
		}
	}
	// top cap if radius > 0
	if (topRadius > 0) {
		for (let i = 0; i < segs; i++) {
			const next = (i + 1) % segs
			faces.push([topCenter, top[i], top[next]])
		}
	}
	// sides
	for (let i = 0; i < segs; i++) {
		const next = (i + 1) % segs
		faces.push([bottom[i], bottom[next], top[i]])
		faces.push([bottom[next], top[next], top[i]])
	}
	const mesh = new Mesh(faces)
	return new Mesh(
		mesh.faces,
		mesh.vectors.map((v) => v3`${v} + ${center}`)
	)
}

type TubeSpec = {
	inner: number
	outer: number
	height?: number
	center?: Vector3
	segments?: number
}
export function tube(spec: TubeSpec): Mesh {
	const { inner, outer, height = 2, center = v3(0, 0, 0), segments } = spec
	if (!(inner > 0 && outer > 0 && inner < outer)) throw new Error('tube requires 0 < inner < outer')
	const { grain } = generation
	const circumference = 2 * Math.PI * outer
	const segs = segments ?? Math.max(8, Math.ceil(circumference / grain))
	const bo: Vector3[] = [] // bottom outer
	const bi: Vector3[] = [] // bottom inner
	const to: Vector3[] = [] // top outer
	const ti: Vector3[] = [] // top inner
	for (let i = 0; i < segs; i++) {
		const a = (2 * Math.PI * i) / segs
		bo.push(v3(outer * Math.cos(a), outer * Math.sin(a), -height / 2))
		bi.push(v3(inner * Math.cos(a), inner * Math.sin(a), -height / 2))
		to.push(v3(outer * Math.cos(a), outer * Math.sin(a), height / 2))
		ti.push(v3(inner * Math.cos(a), inner * Math.sin(a), height / 2))
	}
	const faces: [Vector3, Vector3, Vector3][] = []
	// bottom annulus (viewed from below, keep winding consistent with outside)
	for (let i = 0; i < segs; i++) {
		const next = (i + 1) % segs
		faces.push([bo[i], bo[next], bi[next]])
		faces.push([bo[i], bi[next], bi[i]])
	}
	// top annulus (viewed from above)
	for (let i = 0; i < segs; i++) {
		const next = (i + 1) % segs
		faces.push([to[i], ti[next], to[next]])
		faces.push([to[i], ti[i], ti[next]])
	}
	// outer side
	for (let i = 0; i < segs; i++) {
		const next = (i + 1) % segs
		faces.push([bo[i], bo[next], to[i]])
		faces.push([bo[next], to[next], to[i]])
	}
	// inner side (reverse winding so normals face inward)
	for (let i = 0; i < segs; i++) {
		const next = (i + 1) % segs
		faces.push([bi[i], ti[i], bi[next]])
		faces.push([bi[next], ti[i], ti[next]])
	}
	const mesh = new Mesh(faces)
	return new Mesh(
		mesh.faces,
		mesh.vectors.map((v) => v3`${v} + ${center}`)
	)
}

type EllipsoidSpec = { radius?: number | Vector3; center?: Vector3; subdivisions?: number }
export function ellipsoid(spec: EllipsoidSpec = {}): Mesh {
	const { radius = v3(1, 1, 1), center = v3(0, 0, 0), subdivisions } = spec
	const { grain } = generation
	const calcR = typeof radius === 'number' ? radius : Math.max(...radius)
	const defaultSubdivisions = Math.max(0, Math.ceil(Math.log2((1.051 * calcR) / grain)))
	const subs = subdivisions ?? defaultSubdivisions
	const base = geodesicSphere({ radius: 1, subdivisions: subs, center: v3(0, 0, 0) })
	const rVec = typeof radius === 'number' ? v3(radius, radius, radius) : radius
	return new Mesh(
		base.faces,
		base.vectors.map((v) => v3`${Vector3.scale(v, rVec)} + ${center}`)
	)
}

type PrismSpec = {
	sides: number
	radius?: number
	height?: number
	center?: Vector3
	rotation?: number
	segments?: number
}
export function prism({
	sides,
	radius = 1,
	height = 2,
	center = v3(0, 0, 0),
	rotation = 0,
}: PrismSpec): Mesh {
	if (sides < 3) throw new Error('prism requires sides >= 3')
	const vertexesBottom: Vector3[] = []
	const vertexesTop: Vector3[] = []
	for (let i = 0; i < sides; i++) {
		const a = rotation + (2 * Math.PI * i) / sides
		vertexesBottom.push(v3(radius * Math.cos(a), radius * Math.sin(a), -height / 2))
		vertexesTop.push(v3(radius * Math.cos(a), radius * Math.sin(a), height / 2))
	}
	const faces: [Vector3, Vector3, Vector3][] = []
	// bottom face
	const bottomCenter = v3(0, 0, -height / 2)
	for (let i = 0; i < sides; i++) {
		const next = (i + 1) % sides
		faces.push([bottomCenter, vertexesBottom[next], vertexesBottom[i]])
	}
	// top face
	const topCenter = v3(0, 0, height / 2)
	for (let i = 0; i < sides; i++) {
		const next = (i + 1) % sides
		faces.push([topCenter, vertexesTop[i], vertexesTop[next]])
	}
	// sides
	for (let i = 0; i < sides; i++) {
		const next = (i + 1) % sides
		faces.push([vertexesBottom[i], vertexesBottom[next], vertexesTop[i]])
		faces.push([vertexesBottom[next], vertexesTop[next], vertexesTop[i]])
	}
	const mesh = new Mesh(faces)
	return new Mesh(
		mesh.faces,
		mesh.vectors.map((v) => v3`${v} + ${center}`)
	)
}

type PyramidSpec = { base?: number; height?: number; center?: Vector3 }
export function pyramid({ base = 1, height = 1.5, center = v3(0, 0, 0) }: PyramidSpec = {}): Mesh {
	const half = base / 2
	const b0 = v3(-half, -half, -height / 2)
	const b1 = v3(half, -half, -height / 2)
	const b2 = v3(half, half, -height / 2)
	const b3 = v3(-half, half, -height / 2)
	const apex = v3(0, 0, height / 2)
	const faces: [Vector3, Vector3, Vector3][] = [
		// base (two triangles)
		[b0, b2, b1],
		[b0, b3, b2],
		// sides
		[apex, b0, b1],
		[apex, b1, b2],
		[apex, b2, b3],
		[apex, b3, b0],
	]
	const mesh = new Mesh(faces)
	return new Mesh(
		mesh.faces,
		mesh.vectors.map((v) => v3`${v} + ${center}`)
	)
}

type CapsuleSpec = {
	radius?: number
	height?: number
	center?: Vector3
	segments?: number
	rings?: number
}
export function capsule3D({
	radius = 0.5,
	height = 2,
	center = v3(0, 0, 0),
	segments,
	rings,
}: CapsuleSpec = {}): Mesh {
	const { grain } = generation
	const segs = segments ?? Math.max(12, Math.ceil((2 * Math.PI * radius) / grain))
	const ringCount = rings ?? Math.max(4, Math.ceil((Math.PI * radius) / (2 * grain)))
	const cyl = Math.max(0, height - 2 * radius)
	if (cyl <= 0) return sphere({ radius, center })
	// build vertices
	const ringsVertexes: Vector3[][] = []
	// bottom tip
	const bottomTip = v3(0, 0, -height / 2)
	// bottom hemisphere rings (exclude tip and equator)
	for (let j = 1; j < ringCount; j++) {
		const t = j / ringCount // 0..1
		const a = -Math.PI / 2 + (Math.PI / 2) * t // -π/2..0
		const r = radius * Math.cos(a)
		const z = -height / 2 + radius * (Math.sin(a) + 1)
		const ring: Vector3[] = []
		for (let i = 0; i < segs; i++) {
			const ang = (2 * Math.PI * i) / segs
			ring.push(v3(r * Math.cos(ang), r * Math.sin(ang), z))
		}
		ringsVertexes.push(ring)
	}
	// cylinder bottom ring at z=-height/2 + radius
	const ringBottom: Vector3[] = []
	for (let i = 0; i < segs; i++) {
		const ang = (2 * Math.PI * i) / segs
		ringBottom.push(v3(radius * Math.cos(ang), radius * Math.sin(ang), -height / 2 + radius))
	}
	ringsVertexes.push(ringBottom)
	// cylinder top ring at z=+height/2 - radius
	const ringTop: Vector3[] = []
	for (let i = 0; i < segs; i++) {
		const ang = (2 * Math.PI * i) / segs
		ringTop.push(v3(radius * Math.cos(ang), radius * Math.sin(ang), height / 2 - radius))
	}
	ringsVertexes.push(ringTop)
	// top hemisphere rings (exclude tip and equator)
	for (let j = ringCount - 1; j >= 1; j--) {
		const t = j / ringCount
		const a = (Math.PI / 2) * t // 0..π/2
		const r = radius * Math.cos(a)
		const z = height / 2 - radius + radius * Math.sin(a)
		const ring: Vector3[] = []
		for (let i = 0; i < segs; i++) {
			const ang = (2 * Math.PI * i) / segs
			ring.push(v3(r * Math.cos(ang), r * Math.sin(ang), z))
		}
		ringsVertexes.push(ring)
	}
	const topTip = v3(0, 0, height / 2)
	// faces
	const faces: [Vector3, Vector3, Vector3][] = []
	// bottom tip to first ring
	if (ringsVertexes.length > 0) {
		const first = ringsVertexes[0]
		for (let i = 0; i < segs; i++) {
			const next = (i + 1) % segs
			faces.push([bottomTip, first[next], first[i]])
		}
	}
	// connect consecutive rings
	for (let k = 0; k < ringsVertexes.length - 1; k++) {
		const a = ringsVertexes[k]
		const b = ringsVertexes[k + 1]
		for (let i = 0; i < segs; i++) {
			const next = (i + 1) % segs
			faces.push([a[i], a[next], b[i]])
			faces.push([a[next], b[next], b[i]])
		}
	}
	// last ring to top tip
	if (ringsVertexes.length > 0) {
		const last = ringsVertexes[ringsVertexes.length - 1]
		for (let i = 0; i < segs; i++) {
			const next = (i + 1) % segs
			faces.push([topTip, last[i], last[next]])
		}
	}
	const mesh = new Mesh(faces)
	return new Mesh(
		mesh.faces,
		mesh.vectors.map((v) => v3`${v} + ${center}`)
	)
}

type HemisphereSpec = { radius?: number; center?: Vector3; segments?: number; rings?: number }
export function hemisphere({
	radius = 1,
	center = v3(0, 0, 0),
	segments,
	rings,
}: HemisphereSpec = {}): Mesh {
	const { grain } = generation
	const segs = segments ?? Math.max(12, Math.ceil((2 * Math.PI * radius) / grain))
	const ringCount = rings ?? Math.max(4, Math.ceil((Math.PI * radius) / (2 * grain)))
	const ringsVertexes: Vector3[][] = []
	// equator ring at z=0
	for (let j = 1; j <= ringCount; j++) {
		const t = j / ringCount // 0..1
		const a = (Math.PI / 2) * t // 0..π/2
		const r = radius * Math.cos(a)
		const z = radius * Math.sin(a)
		const ring: Vector3[] = []
		for (let i = 0; i < segs; i++) {
			const ang = (2 * Math.PI * i) / segs
			ring.push(v3(r * Math.cos(ang), r * Math.sin(ang), z))
		}
		ringsVertexes.push(ring)
	}
	const topTip = v3(0, 0, radius)
	const faces: [Vector3, Vector3, Vector3][] = []
	// connect rings
	for (let k = 0; k < ringsVertexes.length - 1; k++) {
		const a = ringsVertexes[k]
		const b = ringsVertexes[k + 1]
		for (let i = 0; i < segs; i++) {
			const next = (i + 1) % segs
			faces.push([a[i], a[next], b[i]])
			faces.push([a[next], b[next], b[i]])
		}
	}
	// top cap
	const last = ringsVertexes[ringsVertexes.length - 1]
	for (let i = 0; i < segs; i++) {
		const next = (i + 1) % segs
		faces.push([topTip, last[i], last[next]])
	}
	// base disk at z=0
	const baseCenter = v3(0, 0, 0)
	const baseRing = ringsVertexes[0]
	for (let i = 0; i < segs; i++) {
		const next = (i + 1) % segs
		faces.push([baseCenter, baseRing[next], baseRing[i]])
	}
	const mesh = new Mesh(faces)
	return new Mesh(
		mesh.faces,
		mesh.vectors.map((v) => v3`${v} + ${center}`)
	)
}
