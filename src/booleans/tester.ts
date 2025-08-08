import { AMesh, Engine, InternalMesh } from '@tsculpt/booleans/index'
import { Mesh, Vector3 } from '@tsculpt/types'

// Fake mesh for testing purposes
export class FakeMesh extends InternalMesh {
	constructor(public readonly id: string) {
		super()
	}

	toMesh(): Mesh {
		// Create a simple test mesh with a single triangle
		const vertices: Vector3[] = [new Vector3(0, 0, 0), new Vector3(1, 0, 0), new Vector3(0, 1, 0)]
		const faces: [Vector3, Vector3, Vector3][] = [[vertices[0], vertices[1], vertices[2]]]
		return new Mesh(faces)
	}
}

class TesterEngine extends Engine {
	private operationCount = 0

	union(...meshes: AMesh[]): AMesh {
		this.operationCount++
		// Return a fake mesh with operation info
		return new FakeMesh(`union_${this.operationCount}_${meshes.length}_meshes`)
	}

	intersect(...meshes: AMesh[]): AMesh {
		this.operationCount++
		// Return a fake mesh with operation info
		return new FakeMesh(`intersect_${this.operationCount}_${meshes.length}_meshes`)
	}

	subtract(_mesh1: AMesh, _mesh2: AMesh): AMesh {
		this.operationCount++
		// Return a fake mesh with operation info
		return new FakeMesh(`subtract_${this.operationCount}_mesh1_mesh2`)
	}

	// Helper method to get operation count for testing
	getOperationCount(): number {
		return this.operationCount
	}

	// Helper method to reset operation count for testing
	resetOperationCount(): void {
		this.operationCount = 0
	}
}

export default new TesterEngine()

export * from '@tsculpt/booleans/index'
