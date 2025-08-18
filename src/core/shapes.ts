import { generation } from './globals'
import { Vector2, v2 } from './types'
import { Contour } from './types/contour'

// 2D primitives that can be extruded
type CircleSpec = {
	radius?: number
	center?: Vector2
	segments?: number
}

function circleSpec(spec: CircleSpec): { radius: number; center: Vector2; segments: number } {
	const { radius = 1, center = v2(0, 0), segments } = spec
	const { grain } = generation

	// Calculate segments based on grain size if not provided
	const calculatedSegments = segments ?? Math.max(8, Math.ceil((2 * Math.PI * radius) / grain))

	return { radius, center, segments: calculatedSegments }
}

export function circle(spec: CircleSpec = {}): Contour {
	const { radius, center, segments } = circleSpec(spec)

	// Create Vector2 vertices for the circle perimeter
	const vertices: Vector2[] = []
	for (let i = 0; i < segments; i++) {
		const angle = (2 * Math.PI * i) / segments
		const x = radius * Math.cos(angle) + center.x
		const y = radius * Math.sin(angle) + center.y
		vertices.push(v2(x, y))
	}

	// Create a polygon from the vertices
	return Contour.from(vertices)
}

type SquareSpec = {
	size?: number | Vector2
	center?: Vector2
}

function squareSpec(spec: SquareSpec): { size: Vector2; center: Vector2 } {
	const { size = 1, center = v2(0, 0) } = spec
	const sizeVec = typeof size === 'number' ? v2(size, size) : size
	return { size: sizeVec, center }
}

export function square(spec: SquareSpec = {}): Contour {
	const { size, center } = squareSpec(spec)

	// Create Vector2 vertices for the square
	const halfSize = v2(size.x / 2, size.y / 2)
	const vertices2D = [
		v2(-halfSize.x + center.x, -halfSize.y + center.y),
		v2(halfSize.x + center.x, -halfSize.y + center.y),
		v2(halfSize.x + center.x, halfSize.y + center.y),
		v2(-halfSize.x + center.x, halfSize.y + center.y),
	]

	// Create a polygon from the vertices
	return Contour.from(vertices2D)
}
