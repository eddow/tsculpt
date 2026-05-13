import { type AMesh, IntermediateMesh, type MeshSpecification, Vector3 } from '@tsculpt/types'
// TODO: ts-meta/destroyable -> auto dispose
// Import types for csgrs WASM module
// Note: These would need to be generated from the actual csgrs WASM bindings
// TODO: Generate proper TypeScript definitions from csgrs WASM bindings

/**
 * Factory function type for csgrs-wasm module initialization
 */
export type CsgrsFactoryFunction = (init: {
	locateFile?: (file: string) => string
}) => Promise<CsgrsModule>

interface CsgrsModule {
	// Core CSG operations
	union(mesh1: any, mesh2: any): any
	intersect(mesh1: any, mesh2: any): any
	subtract(mesh1: any, mesh2: any): any
	hull(meshes: any[]): any

	// Mesh creation and conversion
	createMesh(vertices: number[], faces: number[]): any
	meshToVerticesFaces(mesh: any): { vertices: number[]; faces: number[] }

	// Utility functions
	freeMesh(mesh: any): void
}

/**
 * Engine interface for 3D CSG operations
 */
interface Engine {
	union(...meshes: AMesh[]): Promise<AMesh>
	intersect(...meshes: AMesh[]): Promise<AMesh>
	subtract(mesh1: AMesh, mesh2: AMesh): Promise<AMesh>
	hull(...meshes: AMesh[]): Promise<AMesh>
}

let module: CsgrsModule = null!

/**
 * Check if csgrs-wasm is available
 */
export async function isCsgrsAvailable(): Promise<boolean> {
	try {
		await ensureCsgrsInitialized()
		return true
	} catch {
		return false
	}
}

async function ensureCsgrsInitialized(): Promise<CsgrsModule> {
	if (module) return module

	try {
		// Try to load csgrs-wasm
		// Note: csgrs-wasm package does not exist on npm
		// Alternative: Consider using @bitbybit-dev/manifold or manifold3d
		// TODO: Create WASM bindings for csgrs or switch to manifold-3d
		const csgrsModule = (await import('csgrs-wasm')) as { default: CsgrsFactoryFunction }
		const CsgrsFactory = csgrsModule.default

		module = await CsgrsFactory({
			locateFile: () => {
				return '/csgrs.wasm'
			},
		})

		return module
	} catch (error) {
		console.warn('csgrs-wasm not available, CSG operations will use fallback:', error)
		throw new Error('csgrs-wasm module not available')
	}
}

class CsgrsMesh extends IntermediateMesh {
	private _csgrsMesh: any

	constructor(csgrsMesh: any) {
		super()
		this._csgrsMesh = csgrsMesh
	}

	get csgrsMesh(): any {
		return this._csgrsMesh
	}

	toMesh(): MeshSpecification {
		const { vertices, faces } = module.meshToVerticesFaces(this.csgrsMesh)

		// Convert flat arrays to Vector3 and face arrays
		const vector3Vertices: Vector3[] = []
		for (let i = 0; i < vertices.length; i += 3) {
			vector3Vertices.push(new Vector3(vertices[i], vertices[i + 1], vertices[i + 2]))
		}

		const faceTriangles: [Vector3, Vector3, Vector3][] = []
		for (let i = 0; i < faces.length; i += 3) {
			faceTriangles.push([
				vector3Vertices[faces[i]],
				vector3Vertices[faces[i + 1]],
				vector3Vertices[faces[i + 2]],
			])
		}

		return faceTriangles
	}

	// Clean up WASM memory when mesh is no longer needed
	dispose() {
		if (module && this._csgrsMesh) {
			module.freeMesh(this._csgrsMesh)
			this._csgrsMesh = null
		}
	}
}

function toCsgrsMesh(mesh: AMesh): CsgrsMesh {
	if (mesh instanceof CsgrsMesh) return mesh

	// Convert tsculpt mesh to csgrs format
	const vertices: number[] = []
	const faces: number[] = []

	// Extract unique vertices and build face indices
	const vertexMap = new Map<string, number>()
	let vertexIndex = 0

	for (const face of mesh.verticed) {
		const faceIndices: number[] = []

		for (const vertex of face) {
			const key = `${vertex.x},${vertex.y},${vertex.z}`
			let index = vertexMap.get(key)

			if (index === undefined) {
				index = vertexIndex++
				vertexMap.set(key, index)
				vertices.push(vertex.x, vertex.y, vertex.z)
			}

			faceIndices.push(index)
		}

		// Add face indices
		faces.push(...faceIndices)
	}

	const csgrsMesh = module.createMesh(vertices, faces)
	return new CsgrsMesh(csgrsMesh)
}

class CsgrsEngine implements Engine {
	async union(...meshes: AMesh[]): Promise<AMesh> {
		if (meshes.length === 0) {
			throw new Error('At least one mesh required for union')
		}
		if (meshes.length === 1) {
			return meshes[0]
		}

		try {
			let result = toCsgrsMesh(meshes[0])

			for (let i = 1; i < meshes.length; i++) {
				const nextMesh = toCsgrsMesh(meshes[i])
				const unionResult = module.union(result.csgrsMesh, nextMesh.csgrsMesh)

				// Clean up intermediate meshes
				result.dispose()
				nextMesh.dispose()

				result = new CsgrsMesh(unionResult)
			}

			return result
		} catch (error) {
			console.warn('Csgrs union failed:', error)
			// Fallback to simple union or throw
			throw error
		}
	}

	async intersect(...meshes: AMesh[]): Promise<AMesh> {
		if (meshes.length === 0) {
			throw new Error('At least one mesh required for intersection')
		}
		if (meshes.length === 1) {
			return toCsgrsMesh(meshes[0])
		}

		try {
			let result = toCsgrsMesh(meshes[0])

			for (let i = 1; i < meshes.length; i++) {
				const nextMesh = toCsgrsMesh(meshes[i])
				const intersectResult = module.intersect(result.csgrsMesh, nextMesh.csgrsMesh)

				// Clean up intermediate meshes
				result.dispose()
				nextMesh.dispose()

				result = new CsgrsMesh(intersectResult)
			}

			return result
		} catch (error) {
			console.warn('Csgrs intersection failed:', error)
			throw error
		}
	}

	async subtract(mesh1: AMesh, mesh2: AMesh): Promise<AMesh> {
		try {
			const csgrsMesh1 = toCsgrsMesh(mesh1)
			const csgrsMesh2 = toCsgrsMesh(mesh2)

			const result = module.subtract(csgrsMesh1.csgrsMesh, csgrsMesh2.csgrsMesh)

			// Clean up input meshes
			csgrsMesh1.dispose()
			csgrsMesh2.dispose()

			return new CsgrsMesh(result)
		} catch (error) {
			console.warn('Csgrs subtraction failed:', error)
			throw error
		}
	}

	async hull(...meshes: AMesh[]): Promise<AMesh> {
		if (meshes.length === 0) {
			throw new Error('At least one mesh required for hull')
		}
		if (meshes.length === 1) {
			return toCsgrsMesh(meshes[0])
		}

		try {
			const csgrsMeshes = meshes.map(toCsgrsMesh)
			const result = module.hull(csgrsMeshes.map((m) => m.csgrsMesh))

			// Clean up input meshes
			for (const mesh of csgrsMeshes) mesh.dispose()

			return new CsgrsMesh(result)
		} catch (error) {
			console.warn('Csgrs hull failed:', error)
			throw error
		}
	}
}

// Initialize the module when loaded
ensureCsgrsInitialized().catch((error) => {
	console.warn('Failed to initialize Csgrs:', error)
})

export default async () => {
	module = await ensureCsgrsInitialized()
	return new CsgrsEngine()
}
