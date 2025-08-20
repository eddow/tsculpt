import type { APolygon, Vector2 } from '@tsculpt/types'
import { epsilon } from '../core/math'
import { Algorithms } from '@tsculpt/ts/di'

function vectorIntersect(vA: [Vector2, Vector2], vB: [Vector2, Vector2], edge = true): boolean {
	const [A1, A2] = vA // Segment A: A1 to A2
	const [B1, B2] = vB // Segment B: B1 to B2

	function orientation(p: Vector2, q: Vector2, r: Vector2): number {
		const val = (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0])
		if (val === 0) return 0 // collinear
		return val > 0 ? 1 : 2 // clock or counterclockwise
	}

	// Helper function to check if point q lies on segment pr
	function onSegment(p: Vector2, q: Vector2, r: Vector2): boolean {
		if (
			q[0] <= Math.max(p[0], r[0]) &&
			q[0] >= Math.min(p[0], r[0]) &&
			q[1] <= Math.max(p[1], r[1]) &&
			q[1] >= Math.min(p[1], r[1])
		) {
			return true
		}
		return false
	}

	const o1 = orientation(A1, A2, B1)
	const o2 = orientation(A1, A2, B2)
	const o3 = orientation(B1, B2, A1)
	const o4 = orientation(B1, B2, A2)

	// Special cases (collinear or edge cases)
	// A1, A2 and B1 are collinear and B1 lies on segment A1A2
	if (
		(o1 === 0 && onSegment(A1, B1, A2)) ||
		// A1, A2 and B2 are collinear and B2 lies on segment A1A2
		(o2 === 0 && onSegment(A1, B2, A2)) ||
		// B1, B2 and A1 are collinear and A1 lies on segment B1B2
		(o3 === 0 && onSegment(B1, A1, B2)) ||
		// B1, B2 and A2 are collinear and A2 lies on segment B1B2
		(o4 === 0 && onSegment(B1, A2, B2))
	)
		return edge

	return o1 !== o2 && o3 !== o4
}

function inPolygon(point: Vector2, polygon: APolygon, edge = true): boolean {
	const x = point.x
	const y = point.y
	let inside = false

	// Handle empty polygon
	if (polygon.length === 0) return false

	// Check if point is exactly on a vertex
	for (const vertex of polygon) {
		if (Math.abs(vertex.x - x) < epsilon && Math.abs(vertex.y - y) < epsilon) {
			return edge
		}
	}

	// Ray casting algorithm
	const n = polygon.length
	for (let i = 0, j = n - 1; i < n; j = i++) {
		const xi = polygon[i].x
		const yi = polygon[i].y
		const xj = polygon[j].x
		const yj = polygon[j].y

		// Check if point is on the edge (including horizontal and vertical edges)
		const onHorizontalEdge =
			Math.abs(yi - yj) < epsilon &&
			Math.abs(y - yi) < epsilon &&
			Math.min(xi, xj) - epsilon <= x &&
			x <= Math.max(xi, xj) + epsilon

		const onVerticalEdge =
			Math.abs(xi - xj) < epsilon &&
			Math.abs(x - xi) < epsilon &&
			Math.min(yi, yj) - epsilon <= y &&
			y <= Math.max(yi, yj) + epsilon

		const onSlopedEdge =
			Math.abs(yi - yj) > epsilon &&
			yi > y !== yj > y &&
			Math.abs(x - ((xj - xi) * (y - yi)) / (yj - yi) - xi) < epsilon

		if (onHorizontalEdge || onVerticalEdge || onSlopedEdge) {
			return edge
		}

		// Check for ray intersection (exclude horizontal edges)
		if (Math.abs(yi - yj) > epsilon) {
			const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi
			if (intersect) {
				inside = !inside
			}
		}
	}

	return inside
}

function polygonIntersect(p1: APolygon, p2: APolygon, edge = true): boolean {
	return (
		inPolygon(p2.array[0], p1, edge) || p1.array.some((v) => inPolygon(v, p2, edge))
	)
}

function distinctPolygons(polygons: APolygon[], edge = true): boolean {
	for (let i = 0; i < polygons.length; i++) {
		for (let j = i + 1; j < polygons.length; j++) {
			if (polygonIntersect(polygons[i], polygons[j], edge)) {
				return false
			}
		}
	}
	return true
}

export default {
	vectorIntersect,
	inPolygon,
	polygonIntersect,
	distinctPolygons,
} satisfies Partial<Algorithms>
