import { generation } from './globals'
import { Vector2, scale, v2 } from './types'
import { Contour, Polygon, Shape } from './types/contour'

// 2D primitives that can be extruded
export function rect({
	size = 1,
	center = v2(0, 0),
}: {
	size?: number | Vector2
	center?: Vector2
} = {}): Contour {
	// Create Vector2 vertices for the square
	const halfSize = typeof size === 'number' ? v2(size / 2, size / 2) : scale(size, 0.5)
	const vertices2D = [
		v2(-halfSize.x + center.x, -halfSize.y + center.y),
		v2(halfSize.x + center.x, -halfSize.y + center.y),
		v2(halfSize.x + center.x, halfSize.y + center.y),
		v2(-halfSize.x + center.x, halfSize.y + center.y),
	]

	// Create a polygon from the vertices
	return Contour.from(vertices2D)
}
export const square = rect

// Ellipse
type EllipseSpec = {
	radius?: Vector2 | number
	center?: Vector2
	rotation?: number // radians
	segments?: number
}

export function ellipse({
	radius = 1,
	center = v2(0, 0),
	rotation = 0,
	segments,
}: EllipseSpec = {}): Contour {
	const r = typeof radius === 'number' ? v2(radius, radius) : radius
	const { grain } = generation
	const approxPerimeter = 2 * Math.PI * Math.max(r.x, r.y)
	const segs = segments ?? Math.max(8, Math.ceil(approxPerimeter / grain))
	const cosR = Math.cos(rotation)
	const sinR = Math.sin(rotation)
	const vertices: Vector2[] = []
	for (let i = 0; i < segs; i++) {
		const a = (2 * Math.PI * i) / segs
		const x = r.x * Math.cos(a)
		const y = r.y * Math.sin(a)
		// rotate and translate
		vertices.push(v2(x * cosR - y * sinR + center.x, x * sinR + y * cosR + center.y))
	}
	return Contour.from(vertices)
}
export const circle = ellipse

// Annulus (ring)
type AnnulusSpec = {
	inner: number
	outer: number
	center?: Vector2
	segments?: number
}

export function annulus({ inner, outer, center = v2(0, 0), segments }: AnnulusSpec): Contour {
	if (inner <= 0 || outer <= 0) throw new Error('Annulus radii must be positive')
	if (inner >= outer) throw new Error('Annulus requires inner < outer')
	const { grain } = generation
	const segs = segments ?? Math.max(8, Math.ceil((2 * Math.PI * outer) / grain))
	const outerVerts: Vector2[] = []
	const innerVerts: Vector2[] = []
	for (let i = 0; i < segs; i++) {
		const a = (2 * Math.PI * i) / segs
		outerVerts.push(v2(center.x + outer * Math.cos(a), center.y + outer * Math.sin(a)))
		innerVerts.push(v2(center.x + inner * Math.cos(a), center.y + inner * Math.sin(a)))
	}
	return new Contour(new Shape(new Polygon(...outerVerts), [new Polygon(...innerVerts)]))
}

// Sector (pie)
type SectorSpec = {
	radius: number
	start: number // radians
	end: number // radians
	center?: Vector2
	segments?: number
}

export function sector({ radius, start, end, center = v2(0, 0), segments }: SectorSpec): Contour {
	if (radius <= 0) throw new Error('Sector radius must be positive')
	const sweep = Math.abs(end - start)
	const { grain } = generation
	const arcLength = sweep * radius
	const segs = segments ?? Math.max(2, Math.ceil(arcLength / grain))
	const vertices: Vector2[] = [center]
	for (let i = 0; i <= segs; i++) {
		const t = i / segs
		const a = start + (end - start) * t
		vertices.push(v2(center.x + radius * Math.cos(a), center.y + radius * Math.sin(a)))
	}
	return Contour.from(vertices)
}

// Ring sector (annular sector)
type RingSectorSpec = {
	inner: number
	outer: number
	start: number
	end: number
	center?: Vector2
	segments?: number
}

export function ringSector({
	inner,
	outer,
	start,
	end,
	center = v2(0, 0),
	segments,
}: RingSectorSpec): Contour {
	if (!(inner > 0 && outer > 0 && inner < outer))
		throw new Error('ringSector requires 0 < inner < outer')
	const sweep = Math.abs(end - start)
	const { grain } = generation
	const arcLength = sweep * outer
	const segs = segments ?? Math.max(3, Math.ceil(arcLength / grain))
	const vertexes: Vector2[] = []
	// outer arc CCW from start to end
	for (let i = 0; i <= segs; i++) {
		const t = i / segs
		const a = start + (end - start) * t
		vertexes.push(v2(center.x + outer * Math.cos(a), center.y + outer * Math.sin(a)))
	}
	// inner arc back from end to start (reverse)
	for (let i = 0; i <= segs; i++) {
		const t = i / segs
		const a = end - (end - start) * t
		vertexes.push(v2(center.x + inner * Math.cos(a), center.y + inner * Math.sin(a)))
	}
	return Contour.from(vertexes)
}

// Rounded rectangle (per-corner radii supported)
type CornerRadii = number | Vector2 | { tl?: number; tr?: number; br?: number; bl?: number }
type RoundedRectSpec = {
	size?: number | Vector2
	center?: Vector2
	radius?: CornerRadii
	segments?: number // segments per quarter
}

export function roundedRectangle({
	size = 1,
	center = v2(0, 0),
	radius = 0.1,
	segments,
}: RoundedRectSpec = {}): Contour {
	const w = typeof size === 'number' ? size : size.x
	const h = typeof size === 'number' ? size : size.y
	const half = v2(w / 2, h / 2)
	const toNum = (r: CornerRadii) =>
		typeof r === 'number' ? r : r instanceof Vector2 ? Math.max(r.x, r.y) : 0
	const uniformR = typeof radius === 'number' || radius instanceof Vector2
	const rTL = Math.min(toNum(uniformR ? radius : ((radius as any).tl ?? 0)), half.x, half.y)
	const rTR = Math.min(toNum(uniformR ? radius : ((radius as any).tr ?? 0)), half.x, half.y)
	const rBR = Math.min(toNum(uniformR ? radius : ((radius as any).br ?? 0)), half.x, half.y)
	const rBL = Math.min(toNum(uniformR ? radius : ((radius as any).bl ?? 0)), half.x, half.y)
	const { grain } = generation
	const perimeter = 2 * (w + h)
	const seg = segments ?? Math.max(1, Math.ceil(perimeter / 4 / grain))
	const vertexes: Vector2[] = []
	// helper to push arc from start to end angle inclusive
	function pushArc(cx: number, cy: number, r: number, a0: number, a1: number) {
		if (r <= 0) return
		for (let i = 0; i <= seg; i++) {
			const t = i / seg
			const a = a0 + (a1 - a0) * t
			vertexes.push(v2(cx + r * Math.cos(a) + center.x, cy + r * Math.sin(a) + center.y))
		}
	}
	// Start at top-right corner and go CCW
	if (rTR > 0) pushArc(half.x - rTR, half.y - rTR, rTR, -0, Math.PI / 2)
	else vertexes.push(v2(half.x + center.x, half.y + center.y))
	if (rTL > 0) pushArc(-half.x + rTL, half.y - rTL, rTL, Math.PI / 2, Math.PI)
	else vertexes.push(v2(-half.x + center.x, half.y + center.y))
	if (rBL > 0) pushArc(-half.x + rBL, -half.y + rBL, rBL, Math.PI, (3 * Math.PI) / 2)
	else vertexes.push(v2(-half.x + center.x, -half.y + center.y))
	if (rBR > 0) pushArc(half.x - rBR, -half.y + rBR, rBR, (3 * Math.PI) / 2, 2 * Math.PI)
	else vertexes.push(v2(half.x + center.x, -half.y + center.y))
	return Contour.from(vertexes)
}

// Regular polygon (N-gon)
type RegularPolygonSpec = { sides: number; radius?: number; center?: Vector2; rotation?: number }
export function regularPolygon({
	sides,
	radius = 1,
	center = v2(0, 0),
	rotation = 0,
}: RegularPolygonSpec): Contour {
	if (sides < 3) throw new Error('regularPolygon requires sides >= 3')
	const vertexes: Vector2[] = []
	for (let i = 0; i < sides; i++) {
		const a = rotation + (2 * Math.PI * i) / sides
		vertexes.push(v2(center.x + radius * Math.cos(a), center.y + radius * Math.sin(a)))
	}
	return Contour.from(vertexes)
}

// Capsule / Stadium (obround)
type CapsuleSpec = { width: number; height: number; center?: Vector2; segments?: number }
export function capsule({ width, height, center = v2(0, 0), segments }: CapsuleSpec): Contour {
	const { grain } = generation
	const r = Math.min(width, height) / 2
	const long = Math.max(width, height) - 2 * r
	if (long < 0) return circle({ radius: Math.min(width, height) / 2, center, segments })
	const horizontal = width >= height
	const seg = segments ?? Math.max(8, Math.ceil((Math.PI * r + long) / grain))
	const vertexes: Vector2[] = []
	// start at rightmost point, go CCW
	for (let i = 0; i <= seg; i++) {
		const t = i / seg
		const a = (Math.PI / 2) * (t * 2) // 0..π
		const ca = Math.cos(a)
		const sa = Math.sin(a)
		const dx = horizontal ? long / 2 : 0
		const dy = horizontal ? 0 : long / 2
		vertexes.push(v2(center.x + dx + r * ca, center.y + dy + r * sa))
	}
	for (let i = 0; i <= seg; i++) {
		const t = i / seg
		const a = Math.PI + Math.PI * t // π..2π
		const ca = Math.cos(a)
		const sa = Math.sin(a)
		const dx = horizontal ? -(long / 2) : 0
		const dy = horizontal ? 0 : -(long / 2)
		vertexes.push(v2(center.x + dx + r * ca, center.y + dy + r * sa))
	}
	return Contour.from(vertexes)
}

// Slot: alias of capsule
export function slot(spec: CapsuleSpec): Contour {
	return capsule(spec)
}

// Star polygon
type StarSpec = {
	points: number
	outer: number
	inner: number
	center?: Vector2
	rotation?: number
}
export function star({ points, outer, inner, center = v2(0, 0), rotation = 0 }: StarSpec): Contour {
	if (points < 2) throw new Error('star requires points >= 2')
	if (!(inner > 0 && outer > 0 && inner < outer)) throw new Error('star requires 0 < inner < outer')
	const vertexes: Vector2[] = []
	const total = points * 2
	for (let i = 0; i < total; i++) {
		const r = i % 2 === 0 ? outer : inner
		const a = rotation + (2 * Math.PI * i) / total
		vertexes.push(v2(center.x + r * Math.cos(a), center.y + r * Math.sin(a)))
	}
	return Contour.from(vertexes)
}
