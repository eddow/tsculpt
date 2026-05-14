import { MaybePromise } from '@tsculpt/ts/async'
import { cached } from '@tsculpt/ts/decorators'
import di from '@tsculpt/ts/di'
import { markComputedMethod } from '../computed/decorators'
import { analyzeGeometry, type GeometryStats, repairMesh, type RepairReport } from '../geometry-utils'
import { VectorMap } from '../optimizations'
import { Matrix4, Vector, Vector3 } from './bunches'

const { union3, subtract3, intersect3, hull3 } = di()
type Numbers3 = readonly [number, number, number]

export abstract class AMesh {
	abstract readonly faces: readonly Numbers3[]
	abstract readonly vectors: readonly Vector3[]

	@cached
	get verticed() {
		return this.faces.map((face) => face.map((i) => this.vectors[i]) as [Vector3, Vector3, Vector3])
	}

	map(fct: (v: Vector3) => Vector3): Mesh {
		return new Mesh(this.faces, this.vectors.map(fct))
	}

	translate(t: Vector3): AMesh {
		const translationMatrix = new Matrix4(1, 0, 0, t[0], 0, 1, 0, t[1], 0, 0, 1, t[2], 0, 0, 0, 1)
		return this.transform(translationMatrix)
	}

	scale(s: number | Vector3): AMesh {
		const scaleVector = typeof s === 'number' ? new Vector3(s, s, s) : s
		const scaleMatrix = new Matrix4(
			scaleVector[0],
			0,
			0,
			0,
			0,
			scaleVector[1],
			0,
			0,
			0,
			0,
			scaleVector[2],
			0,
			0,
			0,
			0,
			1
		)
		return this.transform(scaleMatrix)
	}

	bbox(): { min: Vector3; max: Vector3 } {
		return {
			min: Vector.min(...this.vectors),
			max: Vector.max(...this.vectors),
		}
	}

	// Transformation methods that create MatrixedMesh instances
	transform(matrix: Matrix4): AMesh {
		return new MatrixedMesh(this, matrix)
	}

	rotateX(angle: number): AMesh {
		const cos = Math.cos(angle)
		const sin = Math.sin(angle)
		const rotationMatrix = new Matrix4(1, 0, 0, 0, 0, cos, -sin, 0, 0, sin, cos, 0, 0, 0, 0, 1)
		return this.transform(rotationMatrix)
	}

	rotateY(angle: number): AMesh {
		const cos = Math.cos(angle)
		const sin = Math.sin(angle)
		const rotationMatrix = new Matrix4(cos, 0, sin, 0, 0, 1, 0, 0, -sin, 0, cos, 0, 0, 0, 0, 1)
		return this.transform(rotationMatrix)
	}

	rotateZ(angle: number): AMesh {
		const cos = Math.cos(angle)
		const sin = Math.sin(angle)
		const rotationMatrix = new Matrix4(cos, -sin, 0, 0, sin, cos, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1)
		return this.transform(rotationMatrix)
	}

	rotate(axis: Vector3, angle?: number): AMesh {
		// If no angle provided, use the length of the axis vector
		const rotationAngle = angle ?? axis.size

		// Special case: if axis is [0, 0, z], use rotateZ
		if (axis.x === 0 && axis.y === 0 && axis.z !== 0) {
			return this.rotateZ(rotationAngle)
		}

		// Special case: if axis is [x, 0, 0], use rotateX
		if (axis.x !== 0 && axis.y === 0 && axis.z === 0) {
			return this.rotateX(rotationAngle)
		}

		// Special case: if axis is [0, y, 0], use rotateY
		if (axis.x === 0 && axis.y !== 0 && axis.z === 0) {
			return this.rotateY(rotationAngle)
		}

		// General case: rotate around arbitrary axis using Rodrigues' rotation formula
		// Normalize the axis
		const normalizedAxis = axis.normalized
		const x = normalizedAxis.x
		const y = normalizedAxis.y
		const z = normalizedAxis.z

		const cos = Math.cos(rotationAngle)
		const sin = Math.sin(rotationAngle)
		const oneMinusCos = 1 - cos

		const rotationMatrix = new Matrix4(
			cos + x * x * oneMinusCos,
			x * y * oneMinusCos - z * sin,
			x * z * oneMinusCos + y * sin,
			0,
			y * x * oneMinusCos + z * sin,
			cos + y * y * oneMinusCos,
			y * z * oneMinusCos - x * sin,
			0,
			z * x * oneMinusCos - y * sin,
			z * y * oneMinusCos + x * sin,
			cos + z * z * oneMinusCos,
			0,
			0,
			0,
			0,
			1
		)
		return this.transform(rotationMatrix)
	}

	union(...others: AMesh[]): MaybePromise<AMesh> {
		return union3(this, ...others)
	}

	subtract(other: AMesh): MaybePromise<AMesh> {
		return subtract3(this, other)
	}

	subtractFrom(other: AMesh): MaybePromise<AMesh> {
		return subtract3(other, this)
	}

	intersect(...others: AMesh[]): MaybePromise<AMesh> {
		return intersect3(this, ...others)
	}

	hull(...others: AMesh[]): MaybePromise<AMesh> {
		return hull3(this, ...others)
	}

	/**
	 * Analyze mesh geometry for printability and statistics.
	 * Returns comprehensive stats including watertight/manifold checks,
	 * surface area, volume, and a printability assessment.
	 */
	analyze(): GeometryStats {
		return analyzeGeometry(this)
	}

	/**
	 * Run all available repair operations on this mesh.
	 * Returns a brand-new repaired Mesh (never mutates the original)
	 * and a report of what was fixed.
	 */
	repair(): { repaired: AMesh; report: RepairReport } {
		return repairMesh(this)
	}
}

export type MeshSpecification =
	| {
			faces: readonly Numbers3[]
			vectors: readonly Vector3[]
	  }
	| readonly [Vector3, Vector3, Vector3][]

export class Mesh extends AMesh {
	readonly faces: readonly Numbers3[] = []
	private readonly set = new VectorMap<Vector3>()
	constructor(faces: readonly Numbers3[], vectors: readonly Vector3[])
	constructor(spec: MeshSpecification)
	constructor(
		specs: readonly [Vector3, Vector3, Vector3][] | readonly Numbers3[] | MeshSpecification,
		vectors?: readonly Vector3[]
	) {
		super()
		if ('vectors' in specs) vectors = specs.vectors
		const faces =
			'faces' in specs ? specs.faces : (specs as [Vector3, Vector3, Vector3][] | Numbers3[])
		if (faces.length === 0) return
		if (vectors) {
			const indices = [] as number[]
			for (const vertice of vectors) indices.push(this.set.index(vertice))
			this.faces =
				indices.length < vectors.length
					? (faces as Numbers3[]).map(
							(face) => face.map((i) => indices[i]) as [number, number, number]
						)
					: (faces as Numbers3[])
		} else
			this.faces = (faces as [Vector3, Vector3, Vector3][]).map((face) => this.set.face(...face))
		this.faces = this.faces.filter(
			(face) => face[0] !== face[1] && face[1] !== face[2] && face[2] !== face[0]
		)
	}
	get vectors() {
		return this.set.vectors
	}
}

/**
 * Mesh variant that uses typed arrays for better memory layout
 */
export class TypedMesh extends AMesh {
	private _vertices: Float32Array
	private _faces: Uint32Array

	constructor(faces: Numbers3[], vectors: Vector3[]) {
		super()

		// Convert to typed arrays
		this._vertices = new Float32Array(vectors.length * 3)
		for (let i = 0; i < vectors.length; i++) {
			this._vertices[i * 3] = vectors[i][0]
			this._vertices[i * 3 + 1] = vectors[i][1]
			this._vertices[i * 3 + 2] = vectors[i][2]
		}

		this._faces = new Uint32Array(faces.length * 3)
		for (let i = 0; i < faces.length; i++) {
			this._faces[i * 3] = faces[i][0]
			this._faces[i * 3 + 1] = faces[i][1]
			this._faces[i * 3 + 2] = faces[i][2]
		}
	}

	get faces(): readonly Numbers3[] {
		// Convert typed array back to array for compatibility
		const result: Numbers3[] = []
		for (let i = 0; i < this._faces.length; i += 3) {
			result.push([this._faces[i], this._faces[i + 1], this._faces[i + 2]])
		}
		return result
	}

	get vectors(): readonly Vector3[] {
		// Convert typed array back to array for compatibility
		const result: Vector3[] = []
		for (let i = 0; i < this._vertices.length; i += 3) {
			result.push([this._vertices[i], this._vertices[i + 1], this._vertices[i + 2]] as Vector3)
		}
		return result
	}

	/**
	 * Direct access to typed arrays for zero-copy operations
	 */
	get verticesTyped(): Float32Array {
		return this._vertices
	}

	get facesTyped(): Uint32Array {
		return this._faces
	}
}

export abstract class IntermediateMesh extends AMesh {
	protected abstract toMesh(): MeshSpecification
	private _mesh: Mesh | undefined
	get faces() {
		if (!this._mesh) this._mesh = new Mesh(this.toMesh())
		return this._mesh.faces
	}
	get vectors() {
		if (!this._mesh) this._mesh = new Mesh(this.toMesh())
		return this._mesh.vectors
	}
}

// Internal MatrixedMesh class - not exported
class MatrixedMesh extends IntermediateMesh {
	private matrix: Matrix4

	constructor(
		private readonly sourceMesh: AMesh,
		matrix: Matrix4 = new Matrix4(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1)
	) {
		super()
		this.matrix = matrix
	}

	protected toMesh(): Mesh {
		// Apply matrix transformation to all vertices
		const transformedVectors = this.sourceMesh.vectors.map((v) => this.applyMatrix(v))
		return new Mesh(this.sourceMesh.faces, transformedVectors)
	}

	private applyMatrix(v: Vector3): Vector3 {
		// Apply 4x4 transformation matrix to 3D vector
		// Treat the vector as homogeneous coordinates [x, y, z, 1]
		const x =
			v[0] * this.matrix.m(0, 0) +
			v[1] * this.matrix.m(0, 1) +
			v[2] * this.matrix.m(0, 2) +
			this.matrix.m(0, 3)
		const y =
			v[0] * this.matrix.m(1, 0) +
			v[1] * this.matrix.m(1, 1) +
			v[2] * this.matrix.m(1, 2) +
			this.matrix.m(1, 3)
		const z =
			v[0] * this.matrix.m(2, 0) +
			v[1] * this.matrix.m(2, 1) +
			v[2] * this.matrix.m(2, 2) +
			this.matrix.m(2, 3)
		const w =
			v[0] * this.matrix.m(3, 0) +
			v[1] * this.matrix.m(3, 1) +
			v[2] * this.matrix.m(3, 2) +
			this.matrix.m(3, 3)

		// Perspective divide if w != 1
		if (w !== 1 && w !== 0) {
			return new Vector3(x / w, y / w, z / w)
		}
		return new Vector3(x, y, z)
	}

	// Override transformation methods to work with existing matrix
	override transform(matrix: Matrix4): AMesh {
		return new MatrixedMesh(this.sourceMesh, this.multiplyMatrix(matrix))
	}

	private multiplyMatrix(other: Matrix4): Matrix4 {
		const result = new Matrix4(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0)
		for (let i = 0; i < 4; i++) {
			for (let j = 0; j < 4; j++) {
				let sum = 0
				for (let k = 0; k < 4; k++) {
					sum += other.m(i, k) * this.matrix.m(k, j)
				}
				result[i * 4 + j] = sum
			}
		}
		return result
	}
}

markComputedMethod(AMesh.prototype, 'map')
markComputedMethod(AMesh.prototype, 'translate')
markComputedMethod(AMesh.prototype, 'scale')
markComputedMethod(AMesh.prototype, 'bbox', { returns: 'value' })
markComputedMethod(AMesh.prototype, 'transform')
markComputedMethod(AMesh.prototype, 'rotateX')
markComputedMethod(AMesh.prototype, 'rotateY')
markComputedMethod(AMesh.prototype, 'rotateZ')
markComputedMethod(AMesh.prototype, 'rotate')
markComputedMethod(AMesh.prototype, 'union')
markComputedMethod(AMesh.prototype, 'subtract')
markComputedMethod(AMesh.prototype, 'subtractFrom')
markComputedMethod(AMesh.prototype, 'intersect')
markComputedMethod(AMesh.prototype, 'hull')
markComputedMethod(AMesh.prototype, 'analyze', { returns: 'value' })
markComputedMethod(AMesh.prototype, 'repair')

export { Mesh as MeshBase }
