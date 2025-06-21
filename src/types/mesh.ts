import { cached } from '../ts/decorators'
import type { Vector3 } from './vectors'
import { VectorMap } from '../vectorSet'

type FaceIndices = [number, number, number]

export interface IMesh {
	vectors: readonly Vector3[]
	faces: readonly FaceIndices[]
	verticed: readonly [Vector3, Vector3, Vector3][]
}
export class Mesh extends VectorMap<Vector3> implements IMesh {
	readonly faces: readonly FaceIndices[] = []
	constructor(faces: readonly [Vector3, Vector3, Vector3][])
	constructor(faces: readonly FaceIndices[], vertices: readonly Vector3[])
	constructor(faces: readonly [Vector3, Vector3, Vector3][] | readonly FaceIndices[], vertices?: readonly  Vector3[]) {
		super()
		if (faces.length === 0) return
		if(vertices) {
			for(const vertice of vertices) this.index(vertice)
			this.faces = faces as FaceIndices[]
		} else
			this.faces = (faces as [Vector3, Vector3, Vector3][])
				.map(face => face.map(v => this.index(v)) as FaceIndices)
	}

	@cached()
	get verticed() {
		return this.faces.map(face => face.map(i => this.vector(i)) as [Vector3, Vector3, Vector3])
	}
}
