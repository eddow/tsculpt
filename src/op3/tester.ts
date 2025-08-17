import type Engine from '@tsculpt/op3'
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

class TesterEngine implements Engine {
	private operationCount = 0

	async union(...meshes: AMesh[]): Promise<AMesh> {
		this.operationCount++
		// Return a fake mesh with operation info
		return new FakeMesh(`union_${this.operationCount}_${meshes.length}_meshes`)
	}

	async intersect(...meshes: AMesh[]): Promise<AMesh> {
		this.operationCount++
		// Return a fake mesh with operation info
		return new FakeMesh(`intersect_${this.operationCount}_${meshes.length}_meshes`)
	}

	async subtract(_mesh1: AMesh, _mesh2: AMesh): Promise<AMesh> {
		this.operationCount++
		// Return a fake mesh with operation info
		return new FakeMesh(`subtract_${this.operationCount}_mesh1_mesh2`)
	}

	async hull(...meshes: AMesh[]): Promise<AMesh> {
		this.operationCount++
		// Return a fake mesh with operation info
		return new FakeMesh(`hull_${this.operationCount}_${meshes.length}_meshes`)
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
