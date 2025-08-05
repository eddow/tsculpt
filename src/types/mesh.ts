import { vecProd, vecSum } from '@tsculpt/expression'
import { cached } from '../ts/decorators'
import { VectorMap } from '../vectorSet'
import { v3 } from './builders'
import type { Vector3 } from './bunches'

type FaceIndices = [number, number, number]

export interface IMesh {
	vectors: readonly Vector3[]
	faces: readonly FaceIndices[]
	verticed: readonly [Vector3, Vector3, Vector3][]
}

abstract class BaseMesh implements IMesh {
	abstract readonly faces: readonly FaceIndices[]
	abstract readonly vectors: readonly Vector3[]

	@cached()
	get verticed() {
		return this.faces.map((face) => face.map((i) => this.vectors[i]) as [Vector3, Vector3, Vector3])
	}
}

export class Mesh extends BaseMesh implements IMesh {
	readonly faces: readonly FaceIndices[] = []
	private readonly set = new VectorMap<Vector3>()
	constructor(faces: readonly [Vector3, Vector3, Vector3][])
	constructor(faces: readonly FaceIndices[], vertices: readonly Vector3[])
	constructor(
		faces: readonly [Vector3, Vector3, Vector3][] | readonly FaceIndices[],
		vertices?: readonly Vector3[]
	) {
		super()
		if (faces.length === 0) return
		if (vertices) {
			const indices = [] as number[]
			for (const vertice of vertices) indices.push(this.set.index(vertice))
			this.faces =
				indices.length < vertices.length
					? (faces as FaceIndices[]).map((face) => face.map((i) => indices[i]) as FaceIndices)
					: (faces as FaceIndices[])
		} else
			this.faces = (faces as [Vector3, Vector3, Vector3][]).map(
				(face) => face.map((v) => this.set.index(v)) as FaceIndices
			)
	}
	get vectors() {
		return this.set.vectors
	}
	map(fct: (v: Vector3) => Vector3): Mesh {
		return new Mesh(this.faces, this.set.vectors.map(fct))
	}
	translate(t: Vector3): Mesh {
		return this.map((v) => vecSum(v, t) as Vector3)
	}
	scale(s: Vector3 | number): Mesh {
		return this.map((v) => vecProd(v, s) as Vector3)
	}
}
