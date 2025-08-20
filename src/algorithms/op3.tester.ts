import { Algorithms } from '@tsculpt/ts/di'
import { AMesh, IntermediateMesh, Mesh, Vector3 } from '@tsculpt/types'
import { v3 } from '@tsculpt/types/builders'

// Fake mesh for testing purposes
export class FakeMesh extends IntermediateMesh {
	constructor(public readonly id: string) {
		super()
	}

	toMesh(): Mesh {
		// Create a simple test mesh with a single triangle
		const vertices: Vector3[] = [v3(0, 0, 0), v3(1, 0, 0), v3(0, 1, 0)]
		const faces: [Vector3, Vector3, Vector3][] = [[vertices[0], vertices[1], vertices[2]]]
		return new Mesh(faces)
	}
}

let operationCount = 0

function union3(...meshes: AMesh[]): AMesh {
	operationCount++
	// Return a fake mesh with operation info
	return new FakeMesh(`union_${operationCount}_${meshes.length}_meshes`)
}

function intersect3(...meshes: AMesh[]): AMesh {
	operationCount++
	// Return a fake mesh with operation info
	return new FakeMesh(`intersect_${operationCount}_${meshes.length}_meshes`)
}

function subtract3(_mesh1: AMesh, _mesh2: AMesh): AMesh {
	operationCount++
	// Return a fake mesh with operation info
	return new FakeMesh(`subtract_${operationCount}_mesh1_mesh2`)
}

function hull3(...meshes: AMesh[]): AMesh {
	operationCount++
	// Return a fake mesh with operation info
	return new FakeMesh(`hull_${operationCount}_${meshes.length}_meshes`)
}

export default {
	union3,
	intersect3,
	subtract3,
	hull3,
} satisfies Partial<Algorithms>
