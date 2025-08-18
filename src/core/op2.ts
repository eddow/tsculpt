import type { AContour, APolygon, Vector2 } from '@tsculpt/types'
import { epsilon } from './math'
import { MaybePromise } from './ts/maybe'

export default abstract class Op2 {
	abstract union(...contours: AContour[]): MaybePromise<AContour>
	abstract intersect(...contours: AContour[]): MaybePromise<AContour>
	abstract subtract(contour1: AContour, contour2: AContour): MaybePromise<AContour>
	abstract hull(...contours: AContour[]): MaybePromise<AContour>
	abstract vectorIntersect(vA: [Vector2, Vector2], vB: [Vector2, Vector2]): MaybePromise<boolean>
	abstract inPolygon(point: Vector2, polygon: APolygon): MaybePromise<boolean>
	abstract polygonIntersect(p1: APolygon, p2: APolygon): MaybePromise<boolean>
	abstract distinctPolygons(polygons: APolygon[]): MaybePromise<boolean>
}
class EcmascriptEngine {
	vectorIntersect(vA: [Vector2, Vector2], vB: [Vector2, Vector2], edge = true): boolean {
		const [A1, A2] = vA // Segment A: A1 to A2
		const [B1, B2] = vB // Segment B: B1 to B2
		/*
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

		return isOnSegmentB ? edge : isUaValid && isUbValid*/
		function orientation(p: Vector2, q: Vector2, r: Vector2): number {
			const val = (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0])
			if (val === 0) return 0 // collinear
			return val > 0 ? 1 : 2 // clock or counterclock wise
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
	inPolygon(point: Vector2, polygon: APolygon, edge = true): boolean {
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

	polygonIntersect(p1: APolygon, p2: APolygon, edge = true): boolean {
		return (
			this.inPolygon(p2.array[0], p1, edge) || p1.array.some((v) => this.inPolygon(v, p2, edge))
		)
	}

	distinctPolygons(polygons: APolygon[], edge = true): boolean {
		for (let i = 0; i < polygons.length; i++) {
			for (let j = i + 1; j < polygons.length; j++) {
				if (this.polygonIntersect(polygons[i], polygons[j], edge)) {
					return false
				}
			}
		}
		return true
	}
}

export const ecmaOp2 = new EcmascriptEngine()
