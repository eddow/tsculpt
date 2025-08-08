import { cached } from '../ts/decorators'
import { VectorMap } from '../vectorSet'
import { Vector, type Vector3, vecSum } from './bunches'

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
	translate(t: Vector3): Mesh {
		return this.map((v) => vecSum(v, t) as Vector3)
	}
	scale(s: number | Vector3): Mesh {
		return this.map((v) => Vector.prod(v, s))
	}

	bbox(): { min: Vector3; max: Vector3 } {
		return {
			min: Vector.min(...this.vectors),
			max: Vector.max(...this.vectors),
		}
	}
}

export class Mesh extends AMesh {
	readonly faces: readonly Numbers3[] = []
	private readonly set = new VectorMap<Vector3>()
	constructor(faces: readonly [Vector3, Vector3, Vector3][])
	constructor(faces: readonly Numbers3[], vectors: readonly Vector3[])
	constructor(
		faces: readonly [Vector3, Vector3, Vector3][] | readonly Numbers3[],
		vectors?: readonly Vector3[]
	) {
		super()
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
			this.faces = (faces as [Vector3, Vector3, Vector3][])
				.map((face) => face.map((v) => this.set.index(v)) as [number, number, number])
				.filter((face) => face[0] !== face[1] && face[1] !== face[2] && face[2] !== face[0])
	}
	get vectors() {
		return this.set.vectors
	}
}

export abstract class IntermediateMesh extends AMesh {
	protected abstract toMesh(): Mesh
	private _mesh: Mesh | undefined
	get faces() {
		if (!this._mesh) this._mesh = this.toMesh()
		return this._mesh.faces
	}
	get vectors() {
		if (!this._mesh) this._mesh = this.toMesh()
		return this._mesh.vectors
	}
}
