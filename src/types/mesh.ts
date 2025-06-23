import { cached } from '../ts/decorators'
import { VectorMap } from '../vectorSet'
import type { Vector3 } from './vectors'

type FaceIndices = [number, number, number]

export interface IMesh {
	vectors: readonly Vector3[]
	faces: readonly FaceIndices[]
	verticed: readonly [Vector3, Vector3, Vector3][]
}

abstract class BaseMesh implements IMesh {
	abstract readonly faces: readonly FaceIndices[]
	abstract readonly vectors: readonly Vector3[]

	@cached('vectors')
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
			for (const vertice of vertices) this.set.index(vertice)
			this.faces = faces as FaceIndices[]
		} else
			this.faces = (faces as [Vector3, Vector3, Vector3][]).map(
				(face) => face.map((v) => this.set.index(v)) as FaceIndices
			)
	}
	get vectors() {
		return this.set.vectors
	}
}
/*
export class TransformedMesh extends BaseMesh {
	constructor(mesh: IMesh, transform: (v: Vector3) => Vector3) {
		super()
		this.faces = mesh.faces
		this.vectors = mesh.vectors.map(transform)
	}
}*/
