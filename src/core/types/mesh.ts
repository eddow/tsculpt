import Op3 from '@tsculpt/op3'
import { cached } from '@tsculpt/ts/decorators'
import di from '@tsculpt/ts/di'
import { MaybePromise } from '@tsculpt/ts/maybe'
import { VectorMap } from '../optimizations'
import { Matrix4, Vector, Vector3 } from './bunches'

const { op3 } = di<{ op3: Op3 }>()
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
		return op3.union(this, ...others)
	}
	subtract(other: AMesh): MaybePromise<AMesh> {
		return op3.subtract(this, other)
	}
	subtractFrom(other: AMesh): MaybePromise<AMesh> {
		return op3.subtract(other, this)
	}
	intersect(...others: AMesh[]): MaybePromise<AMesh> {
		return op3.intersect(this, ...others)
	}
	hull(...others: AMesh[]): MaybePromise<AMesh> {
		return op3.hull(this, ...others)
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
