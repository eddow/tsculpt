import { ecmaOp2 } from '@tsculpt/op2'
import Op2 from '@tsculpt/op2'
import { assert } from '@tsculpt/ts/debug'
import { cache, cached } from '@tsculpt/ts/decorators'
import di from '@tsculpt/ts/di'
import { Indexable } from '@tsculpt/ts/indexable'
import { MaybePromise } from '@tsculpt/ts/maybe'
import earcut from 'earcut'
import { v2 } from './builders'
import { Matrix3, Vector2 } from './bunches'

const { op2 } = di<{ op2: Op2 }>()
export type Surface = [Vector2, Vector2, Vector2][]

// Abstract base class for array-like behavior
abstract class Mappable<T> {
	public abstract readonly array: T[]
	map<U>(fn: (value: T, index: number, array: T[]) => U): Array<U> {
		return this.array.map(fn)
	}
	flatMap<U>(fn: (value: T, index: number, array: T[]) => U[]): Array<U> {
		return this.array.flatMap(fn)
	}
	every(fn: (value: T, index: number, array: T[]) => boolean): boolean {
		return this.array.every(fn)
	}
	get length() {
		return this.array.length
	}
	[Symbol.iterator](): Iterator<T> {
		return this.array[Symbol.iterator]()
	}
}

const ArraySim = <T>() =>
	Indexable(Mappable<T>, {
		get(this: Mappable<T>, index) {
			return this.array[index]
		},
		set(this: Mappable<T>, index, value) {
			this.array[index] = value
		},
	})

// Abstract base class for Polygon
export abstract class APolygon extends ArraySim<Vector2>() {
	/**
	 * Returns a reversed copy of the polygon
	 */
	@cached
	get reversed(): Polygon {
		const reversed = new Polygon(...this.array.reverse())
		cache(reversed, 'reversed', this)
		return reversed
	}

	/**
	 * Maps each vertex through a transformation function
	 */
	mapVertex(fn: (vertex: Vector2) => Vector2): Polygon {
		return new Polygon(...this.map(fn))
	}
}

// Concrete Polygon implementation
@assert.integrity({
	'No intersections': function () {
		for (let i = 0; i < this.length - 1; i++) {
			for (let j = i + 2; j < this.length; j++) {
				const a = [i, i + 1]
				const b = [j, (j + 1) % this.length]
				if (a[0] === b[0] || a[0] === b[1] || a[1] === b[0] || a[1] === b[1]) continue

				if (ecmaOp2.vectorIntersect([this[a[0]], this[a[1]]], [this[b[0]], this[b[1]]], false)) {
					return { i, j }
				}
			}
		}
	},
})
export class Polygon extends APolygon {
	public array: Vector2[]
	constructor(...array: Vector2[]) {
		super()
		this.array = array
	}
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
}

// Intermediate Polygon that computes when accessing array
export abstract class IntermediatePolygon extends APolygon {
	protected abstract toPolygon(): Vector2[]

	@cached
	get array() {
		return this.toPolygon()
	}
}

export interface IndexedHolesShape {
	polygons: number[]
	holesIndices: number[]
}

// Abstract base class for Shape
export abstract class AShape {
	abstract readonly polygon: APolygon
	abstract readonly holes: APolygon[]

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
		const holeVertices = holes.flatMap((hole) => hole.reversed.flatMap((v) => [v.x, v.y]))

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

// Concrete Shape implementation
@assert.integrity({
	'All holes in polygon': function () {
		return this.holes.every((hole) => hole.every((v) => ecmaOp2.inPolygon(v, this.polygon)))
	},
	'Distinct holes': function () {
		return ecmaOp2.distinctPolygons(this.holes)
	},
})
export class Shape extends AShape {
	/**
	 * @param polygon CCW positive polygon
	 * @param holes CW negative polygons
	 */
	constructor(
		public readonly polygon: APolygon,
		public readonly holes: APolygon[] = []
	) {
		super()
	}
}

// Intermediate Shape that computes when accessing polygon/holes
export abstract class IntermediateShape extends AShape {
	protected abstract toShape(): { polygon: APolygon; holes: APolygon[] }
	private _shape: { polygon: APolygon; holes: APolygon[] } | undefined

	@cached
	get polygon() {
		if (!this._shape) this._shape = this.toShape()
		return this._shape.polygon
	}

	@cached
	get holes() {
		if (!this._shape) this._shape = this.toShape()
		return this._shape.holes
	}
}

// Abstract base class for Contour
export abstract class AContour extends ArraySim<Shape>() {
	/**
	 * Creates a contour from a single polygon
	 */
	static from(polygon: APolygon): Contour
	static from(vertices: Vector2[]): Contour
	static from(polygonOrVertices: APolygon | Vector2[]): Contour {
		return new Contour(
			new Shape(
				polygonOrVertices instanceof APolygon
					? polygonOrVertices
					: new Polygon(...polygonOrVertices)
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
	get flatPolygons(): APolygon[] {
		const polygons: APolygon[] = []
		for (const shape of this) {
			polygons.push(shape.polygon)
			polygons.push(...shape.holes)
		}
		return polygons
	}

	// Transformation methods that create MatrixedContour instances
	transform(matrix: Matrix3): AContour {
		return new MatrixedContour(this, matrix)
	}

	translate(t: Vector2): AContour {
		const translationMatrix = new Matrix3(1, 0, t.x, 0, 1, t.y, 0, 0, 1)
		return this.transform(translationMatrix)
	}

	scale(s: number | Vector2): AContour {
		const scaleVector = typeof s === 'number' ? new Vector2(s, s) : s
		const scaleMatrix = new Matrix3(scaleVector.x, 0, 0, 0, scaleVector.y, 0, 0, 0, 1)
		return this.transform(scaleMatrix)
	}

	rotate(angle: number): AContour {
		const cos = Math.cos(angle)
		const sin = Math.sin(angle)
		const rotationMatrix = new Matrix3(cos, -sin, 0, sin, cos, 0, 0, 0, 1)
		return this.transform(rotationMatrix)
	}

	union(...others: AContour[]): MaybePromise<AContour> {
		return op2.union(this, ...others)
	}
	intersect(...others: AContour[]): MaybePromise<AContour> {
		return op2.intersect(this, ...others)
	}
	hull(...others: AContour[]): MaybePromise<AContour> {
		return op2.hull(this, ...others)
	}
	subtract(other: AContour): MaybePromise<AContour> {
		return op2.subtract(this, other)
	}
	subtractFrom(other: AContour): MaybePromise<AContour> {
		return op2.subtract(other, this)
	}
}

// Concrete Contour implementation
@assert.integrity({
	'Distinct shapes': function () {
		return ecmaOp2.distinctPolygons(this.map((s) => s.polygon))
	},
})
export class Contour extends AContour {
	public array: Shape[]
	constructor(...array: Shape[]) {
		super()
		this.array = array
	}

	/**
	 * Creates a contour from a single polygon
	 */
	static from(polygon: APolygon): Contour
	static from(vertices: Vector2[]): Contour
	static from(polygonOrVertices: APolygon | Vector2[]): Contour {
		return new Contour(
			new Shape(
				polygonOrVertices instanceof APolygon
					? polygonOrVertices
					: new Polygon(...polygonOrVertices)
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
	get flatPolygons(): APolygon[] {
		const polygons: APolygon[] = []
		for (const shape of this) {
			polygons.push(shape.polygon)
			polygons.push(...shape.holes)
		}
		return polygons
	}
}

// Intermediate Contour that computes when accessing array
export abstract class IntermediateContour extends AContour {
	protected abstract toContour(): Shape[]

	@cached
	get array() {
		return this.toContour()
	}
}

// Internal MatrixedContour class - not exported
class MatrixedContour extends IntermediateContour {
	private matrix: Matrix3

	constructor(
		private readonly sourceContour: AContour,
		matrix: Matrix3 = new Matrix3(1, 0, 0, 0, 1, 0, 0, 0, 1)
	) {
		super()
		this.matrix = matrix
	}

	protected toContour(): Shape[] {
		return this.sourceContour.mapVertex((v) => this.applyMatrix(v)).array
	}

	private applyMatrix(v: Vector2): Vector2 {
		// Apply 3x3 transformation matrix to 2D vector
		// Treat the vector as homogeneous coordinates [x, y, 1]
		const x = v.x * this.matrix.m(0, 0) + v.y * this.matrix.m(0, 1) + this.matrix.m(0, 2)
		const y = v.x * this.matrix.m(1, 0) + v.y * this.matrix.m(1, 1) + this.matrix.m(1, 2)
		const w = v.x * this.matrix.m(2, 0) + v.y * this.matrix.m(2, 1) + this.matrix.m(2, 2)

		// Perspective divide if w != 1
		if (w !== 1 && w !== 0) {
			return new Vector2(x / w, y / w)
		}
		return new Vector2(x, y)
	}

	// Override transformation methods to work with existing matrix
	override transform(matrix: Matrix3): AContour {
		return new MatrixedContour(this.sourceContour, this.multiplyMatrix(matrix))
	}

	private multiplyMatrix(other: Matrix3): Matrix3 {
		const result = new Matrix3(0, 0, 0, 0, 0, 0, 0, 0, 0)
		for (let i = 0; i < 3; i++) {
			for (let j = 0; j < 3; j++) {
				let sum = 0
				for (let k = 0; k < 3; k++) {
					sum += other.m(i, k) * this.matrix.m(k, j)
				}
				result[i * 3 + j] = sum
			}
		}
		return result
	}
}
