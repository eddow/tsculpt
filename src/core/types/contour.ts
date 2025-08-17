import { assert } from '@tsculpt/ts/debug'
import { cached } from '@tsculpt/ts/decorators'
import earcut from 'earcut'
import { v2 } from './builders'
import { Vector2 } from './bunches'
import { ecmaOp2 } from '@tsculpt/op2'
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

				if (ecmaOp2.vectorIntersect([this[a[0]], this[a[1]]], [this[b[0]], this[b[1]]])) {
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
	'All holes in polygon': function () {
		return this.holes.every((hole) => hole.every((v) => ecmaOp2.inPolygon(v, this.polygon)))
	},
	'Distinct holes': function () {
		return ecmaOp2.distinctPolygons(this.holes)
	},
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
	'Distinct shapes': function () {
		return ecmaOp2.distinctPolygons(this.map((s) => s.polygon))
	},
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
