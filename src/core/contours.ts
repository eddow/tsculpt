import { generation } from './globals'
import { Vector2, Vector3, v3 } from './types'
import { Contour } from './types/contour'

// 2D primitives that can be extruded
type CircleSpec = [
	{
		radius?: number
		center?: Vector3
		segments?: number
	},
]

function circleSpec(spec: CircleSpec): { radius: number; center: Vector3; segments: number } {
	const { radius = 1, center = v3(0, 0, 0), segments } = spec[0]
	const { grain } = generation

	// Calculate segments based on grain size if not provided
	const circumference = 2 * Math.PI * radius
	const calculatedSegments = segments ?? Math.max(8, Math.ceil(circumference / grain))

	return { radius, center, segments: calculatedSegments }
}

export function circle(...spec: CircleSpec): Contour {
	const { radius, center, segments } = circleSpec(spec)

	// Create Vector2 vertices for the circle perimeter
	const vertices2D: Vector2[] = []
	for (let i = 0; i < segments; i++) {
		const angle = (2 * Math.PI * i) / segments
		const x = radius * Math.cos(angle) + center.x
		const y = radius * Math.sin(angle) + center.y
		vertices2D.push(new Vector2(x, y))
	}

	// Create edges connecting consecutive vertices (closed polygon)
	const edges: [Vector2, Vector2][] = []
	for (let i = 0; i < vertices2D.length; i++) {
		const current = vertices2D[i]
		const next = vertices2D[(i + 1) % vertices2D.length]
		edges.push([current, next])
	}

	return new Contour(edges)
}

type SquareSpec = [
	{
		size?: number | Vector3
		center?: Vector3
	},
]

function squareSpec(spec: SquareSpec): { size: Vector3; center: Vector3 } {
	const { size = 1, center = v3(0, 0, 0) } = spec[0]
	const sizeVec = typeof size === 'number' ? v3(size, size, 0) : v3(size[0], size[1], 0)
	return { size: sizeVec, center }
}

export function square(...spec: SquareSpec): Contour {
	const { size, center } = squareSpec(spec)

	// Create Vector2 vertices for the square
	const halfSize = new Vector2(size.x / 2, size.y / 2)
	const vertices2D = [
		new Vector2(-halfSize.x + center.x, -halfSize.y + center.y),
		new Vector2(halfSize.x + center.x, -halfSize.y + center.y),
		new Vector2(halfSize.x + center.x, halfSize.y + center.y),
		new Vector2(-halfSize.x + center.x, halfSize.y + center.y),
	]

	// Create edges connecting consecutive vertices (closed polygon)
	const edges: [Vector2, Vector2][] = []
	for (let i = 0; i < vertices2D.length; i++) {
		const current = vertices2D[i]
		const next = vertices2D[(i + 1) % vertices2D.length]
		edges.push([current, next])
	}

	return new Contour(edges)
}
