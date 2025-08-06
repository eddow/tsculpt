import { Mesh } from '../types'

export abstract class InternalMesh {
	abstract toMesh(): Mesh
}

export type AMesh = Mesh | InternalMesh

export abstract class Engine {
	abstract union(...meshes: AMesh[]): AMesh
	abstract intersect(...meshes: AMesh[]): AMesh
	abstract subtract(mesh1: AMesh, mesh2: AMesh): AMesh
	result(aMesh: AMesh): Mesh {
		return aMesh instanceof InternalMesh ? aMesh.toMesh() : aMesh
	}
}

export function isMesh(value: unknown): value is AMesh {
	return value instanceof Mesh || value instanceof InternalMesh
}
