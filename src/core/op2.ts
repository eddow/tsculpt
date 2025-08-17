import type { Contour, Polygon, Vector2 } from '@tsculpt/types'
import { epsilon } from './math'

export default abstract class Engine {
	abstract union(contour1: Contour, contour2: Contour): Contour
	abstract intersect(contour1: Contour, contour2: Contour): Contour
	abstract subtract(contour1: Contour, contour2: Contour): Contour
	abstract hull(contours: Contour[]): Contour
	vectorIntersect(vA: [Vector2, Vector2], vB: [Vector2, Vector2]): boolean {
		const [A1, A2] = vA // Segment A: A1 to A2
		const [B1, B2] = vB // Segment B: B1 to B2

		// Line A: (A1 to A2) → a1*x + b1*y + c1 = 0
		const a1 = A2.y - A1.y
		const b1 = A1.x - A2.x
		const c1 = a1 * A1.x + b1 * A1.y

		// Line B: (B1 to B2) → a2*x + b2*y + c2 = 0
		const a2 = B2.y - B1.y
		const b2 = B1.x - B2.x
		const c2 = a2 * B1.x + b2 * B1.y

		// Determinant (denominator)
		const denominator = a1 * b2 - a2 * b1

		// If lines are parallel (or nearly parallel), no intersection
		if (Math.abs(denominator) < epsilon) {
			return false
		}

		// Compute intersection parameters
		const ua = (b2 * c1 - b1 * c2) / denominator
		const ub = (a1 * c2 - a2 * c1) / denominator

		// Compute intersection point from Segment A
		const x = A1.x + ua * (A2.x - A1.x)
		const y = A1.y + ua * (A2.y - A1.y)

		// Check if (x, y) lies on Segment B
		const segBMinX = Math.min(B1.x, B2.x)
		const segBMaxX = Math.max(B1.x, B2.x)
		const segBMinY = Math.min(B1.y, B2.y)
		const segBMaxY = Math.max(B1.y, B2.y)

		const isOnSegmentB =
			x >= segBMinX - epsilon &&
			x <= segBMaxX + epsilon &&
			y >= segBMinY - epsilon &&
			y <= segBMaxY + epsilon

		// Check if ua and ub are within [0, 1] (with epsilon tolerance)
		const isUaValid = ua >= -epsilon && ua <= 1 + epsilon
		const isUbValid = ub >= -epsilon && ub <= 1 + epsilon

		return isUaValid && isUbValid && isOnSegmentB
	}

	inPolygon(point: Vector2, polygon: Polygon): boolean {
		const x = point.x
		const y = point.y
		let inside = false

		// Handle empty polygon
		if (polygon.length === 0) return false

		// Check if point is exactly on a vertex
		for (const vertex of polygon) {
			if (vertex.x === x && vertex.y === y) {
				return true
			}
		}

		// Ray casting algorithm
		const n = polygon.length
		for (let i = 0, j = n - 1; i < n; j = i++) {
			const xi = polygon[i].x
			const yi = polygon[i].y
			const xj = polygon[j].x
			const yj = polygon[j].y

			// Check if point is on the edge
			const onEdge = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi
			const onHorizontalEdge =
				yi === yj && y === yi && Math.min(xi, xj) <= x && x <= Math.max(xi, xj)

			if (onEdge || onHorizontalEdge) {
				return true
			}

			// Check for ray intersection
			const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi

			if (intersect) {
				inside = !inside
			}
		}

		return inside
	}

	polygonIntersect(p1: Polygon, p2: Polygon): boolean {
		return this.inPolygon(p2[0], p1) || p1.some((v) => this.inPolygon(v, p2))
	}

	distinctPolygons(polygons: Polygon[]): boolean {
		for (let i = 0; i < polygons.length; i++) {
			for (let j = i + 1; j < polygons.length; j++) {
				if (this.polygonIntersect(polygons[i], polygons[j])) {
					return false
				}
			}
		}
		return true
	}

	//#endregion
}
