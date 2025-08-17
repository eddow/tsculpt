import { epsilon } from '@tsculpt/math'
import { assert } from '@tsculpt/ts/debug'
import { cached } from '@tsculpt/ts/decorators'
import earcut from 'earcut'
import { v2 } from './builders'
import { Vector2 } from './bunches'

export type Surface = [Vector2, Vector2, Vector2][]

class ArrayMappingArray<T> extends Array<T> {
	map<U>(fn: (value: T, index: number, array: T[]) => U): Array<U> {
		return Array.from(this).map(fn)
	}
}

@assert.integrity({
	'No intersections': function () {
		for (let i = 0; i < this.length - 1; i++) {
			for (let j = i + 2; j < this.length; j++) {
				const a = [i, i + 1]
				const b = [j, (j + 1) % this.length]
				if (a[0] === b[0] || a[0] === b[1] || a[1] === b[0] || a[1] === b[1]) continue

				if (vectorIntersect([this[a[0]], this[a[1]]], [this[b[0]], this[b[1]]])) {
					return false
				}
			}
		}
		return true
	},
})
/**
 * Represents a 2D polygon as an array of Vector2 vertices.
 * Vertices should be ordered counter-clockwise for positive polygons.
 */
export class Polygon extends ArrayMappingArray<Vector2> {
	/**
	 * Creates a polygon from individual coordinates
	 */
	static fromCoords(...coords: [number, number][]): Polygon {
		return new Polygon(...coords.map(([x, y]) => new Vector2(x, y)))
	}

	/**
	 * Creates a polygon from a flat array of numbers [x1, y1, x2, y2, ...]
	 */
	static fromFlat(coords: number[]): Polygon {
		const vertices: Vector2[] = []
		for (let i = 0; i < coords.length; i += 2) {
			vertices.push(new Vector2(coords[i], coords[i + 1]))
		}
		return new Polygon(...vertices)
	}

	/**
	 * Returns a reversed copy of the polygon
	 */
	get reversed(): Polygon {
		return new Polygon(...this.reverse())
	}

	/**
	 * Maps each vertex through a transformation function
	 */
	mapVertex(fn: (vertex: Vector2) => Vector2): Polygon {
		return new Polygon(...this.map(fn))
	}
}
export interface IndexedHolesShape {
	polygons: number[]
	holesIndices: number[]
}

@assert.integrity({
	"All holes in polygon": function() {
		return this.holes.every(hole => hole.every(v => inPolygon(v, this.polygon)))
	},
	"Distinct holes": function() {
		return distinctPolygons(this.holes)
	}
})
export class Shape {
	/**
	 * @param polygon CCW positive polygon
	 * @param holes CW negative polygons
	 */
	constructor(
		public readonly polygon: Polygon,
		public readonly holes: Polygon[] = []
	) {}

	/**
	 * Maps each vertex through a transformation function, preserving shape structure
	 */
	mapVertex(fn: (vertex: Vector2) => Vector2): Shape {
		return new Shape(
			this.polygon.mapVertex(fn),
			this.holes.map((hole) => hole.mapVertex(fn))
		)
	}

	@cached
	get indexedHoles(): IndexedHolesShape {
		const { polygon, holes } = this
		// Flatten the main polygon into [x0, y0, x1, y1, ...]
		const vertices = polygon.flatMap((v) => [v.x, v.y])

		// Flatten all holes (in reverse order) and record their start indices
		const holeVertices = holes.flatMap((hole) => hole.reverse().flatMap((v) => [v.x, v.y]))

		// Compute the start index of each hole in the combined vertex array
		// (earcut expects an array of hole start indices, not lengths)
		const holeIndices: number[] = []
		let currentIndex = polygon.length * 2 // Start after the main polygon
		for (const hole of holes) {
			holeIndices.push(currentIndex / 2) // Divide by 2 because earcut works in vertex counts, not coordinates
			currentIndex += hole.length * 2
		}

		// Combine main polygon and holes into a single vertex array
		return {
			polygons: [...vertices, ...holeVertices],
			holesIndices: holeIndices,
		}
	}
	triangulate(winding: 'ccw' | 'cw' = 'ccw'): Surface {
		const { polygons: allVertices, holesIndices } = this.indexedHoles

		// Triangulate using earcut
		const indices = earcut(allVertices, holesIndices)
		function vertex(i: number) {
			return v2(allVertices[i * 2], allVertices[i * 2 + 1])
		}
		// Convert indices back to triangles
		const surface: Surface = []
		for (let i = 0; i < indices.length; i += 3) {
			const a = vertex(indices[i])
			const b = vertex(indices[i + 1])
			const c = vertex(indices[i + 2])

			// Apply winding order
			if (winding === 'cw') {
				surface.push([a, c, b]) // Reverse winding for clockwise
			} else {
				surface.push([a, b, c]) // Default counter-clockwise
			}
		}

		return surface
	}
}

@assert.integrity({
	"Distinct shapes": function() {
		return distinctPolygons(this.map(s => s.polygon))
	}
})
/**
 * Represents a 2D contour/profile for extrusion operations.
 * A contour is a set of shapes, where each shape contains a main polygon and optional holes.
 */
export class Contour extends ArrayMappingArray<Shape> {
	/**
	 * Creates a contour from a single polygon
	 */
	static from(polygon: Polygon): Contour
	static from(vertices: Vector2[]): Contour
	static from(polygonOrVertices: Polygon | Vector2[]): Contour {
		return new Contour(
			new Shape(
				polygonOrVertices instanceof Polygon ? polygonOrVertices : new Polygon(...polygonOrVertices)
			)
		)
	}

	/**
	 * Maps each vertex through a transformation function, preserving shape structure
	 */
	mapVertex(fn: (vertex: Vector2) => Vector2): Contour {
		return new Contour(...this.map((shape) => shape.mapVertex(fn)))
	}

	/**
	 * Returns a flat array of all polygons (main polygons and holes) for extrusion operations
	 * Each polygon can be extruded individually
	 */
	get flatPolygons(): Polygon[] {
		const polygons: Polygon[] = []
		for (const shape of this) {
			polygons.push(shape.polygon)
			polygons.push(...shape.holes)
		}
		return polygons
	}
}

//#region helper functions

function vectorIntersect(vA: [Vector2, Vector2], vB: [Vector2, Vector2]): boolean {
	const [A1, A2] = vA; // Segment A: A1 to A2
	const [B1, B2] = vB; // Segment B: B1 to B2

	// Line A: (A1 to A2) → a1*x + b1*y + c1 = 0
	const a1 = A2.y - A1.y;
	const b1 = A1.x - A2.x;
	const c1 = a1 * A1.x + b1 * A1.y;

	// Line B: (B1 to B2) → a2*x + b2*y + c2 = 0
	const a2 = B2.y - B1.y;
	const b2 = B1.x - B2.x;
	const c2 = a2 * B1.x + b2 * B1.y;

	// Determinant (denominator)
	const denominator = a1 * b2 - a2 * b1;

	// If lines are parallel (or nearly parallel), no intersection
	if (Math.abs(denominator) < epsilon) {
		return false;
	}

	// Compute intersection parameters
	const ua = (b2 * c1 - b1 * c2) / denominator;
	const ub = (a1 * c2 - a2 * c1) / denominator;

	// Compute intersection point from Segment A
	const x = A1.x + ua * (A2.x - A1.x);
	const y = A1.y + ua * (A2.y - A1.y);

	// Check if (x, y) lies on Segment B
	const segBMinX = Math.min(B1.x, B2.x);
	const segBMaxX = Math.max(B1.x, B2.x);
	const segBMinY = Math.min(B1.y, B2.y);
	const segBMaxY = Math.max(B1.y, B2.y);

	const isOnSegmentB =
		x >= segBMinX - epsilon &&
		x <= segBMaxX + epsilon &&
		y >= segBMinY - epsilon &&
		y <= segBMaxY + epsilon;

	// Check if ua and ub are within [0, 1] (with epsilon tolerance)
	const isUaValid = ua >= -epsilon && ua <= 1 + epsilon;
	const isUbValid = ub >= -epsilon && ub <= 1 + epsilon;

	return isUaValid && isUbValid && isOnSegmentB;
}

function inPolygon(point: Vector2, polygon: Polygon): boolean {
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
		const onHorizontalEdge = yi === yj && y === yi && Math.min(xi, xj) <= x && x <= Math.max(xi, xj)

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

function polygonIntersect(p1: Polygon, p2: Polygon): boolean {
	return inPolygon(p2[0], p1) || p1.some(v => inPolygon(v, p2))
}

function distinctPolygons(polygons: Polygon[]): boolean {
	for (let i = 0; i < polygons.length; i++) {
		for (let j = i + 1; j < polygons.length; j++) {
			if (polygonIntersect(polygons[i], polygons[j])) {
				return false
			}
		}
	}
	return true
}

//#endregion
