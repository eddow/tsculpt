import { Algorithms } from '@tsculpt/ts/di'
import { type AMesh, IntermediateMesh, type MeshSpecification, Vector3 } from '@tsculpt/types'

/**
 * Factory function type for ts-csg-wasm module initialization
 */
type CsgFactoryFunction = (init: { locateFile?: (file: string) => string }) => Promise<void>

interface CsgModule {
	csg_union(
		a_vertices: Float32Array,
		a_faces: Uint32Array,
		b_vertices: Float32Array,
		b_faces: Uint32Array
	): CsgResult
	csg_intersect(
		a_vertices: Float32Array,
		a_faces: Uint32Array,
		b_vertices: Float32Array,
		b_faces: Uint32Array
	): CsgResult
	csg_subtract(
		a_vertices: Float32Array,
		a_faces: Uint32Array,
		b_vertices: Float32Array,
		b_faces: Uint32Array
	): CsgResult
	csg_hull(vertices: Float32Array, faces: Uint32Array): CsgResult
}

interface CsgResult {
	vertices: Float32Array
	faces: Uint32Array
}

let module: CsgModule = null!
const tsCsgModuleUrl = '/ts-csg-wasm/ts_csg.js'
const importPublicModule = new Function('url', 'return import(url)') as <T>(
	url: string
) => Promise<T>

/**
 * Lazy-initialize the WASM module
 */
async function ensureInitialized(): Promise<CsgModule> {
	if (module) return module

	try {
		const wasmModule = await importPublicModule<{
			default: CsgFactoryFunction
			csg_union: CsgModule['csg_union']
			csg_intersect: CsgModule['csg_intersect']
			csg_subtract: CsgModule['csg_subtract']
			csg_hull: CsgModule['csg_hull']
		}>(tsCsgModuleUrl)

		const init = wasmModule.default
		await init({
			locateFile: () => '/ts-csg-wasm/ts_csg_bg.wasm',
		})

		module = {
			csg_union: wasmModule.csg_union,
			csg_intersect: wasmModule.csg_intersect,
			csg_subtract: wasmModule.csg_subtract,
			csg_hull: wasmModule.csg_hull,
		}

		return module
	} catch (error) {
		console.warn('ts-csg WASM not available, 3D booleans will use JSCAD fallback:', error)
		throw error
	}
}

/**
 * Intermediate mesh wrapping a CSG result — defers conversion until needed.
 * Exposes raw flat arrays for chaining operations without round-trip conversion.
 */
class CsgResultMesh extends IntermediateMesh {
	private _cachedMesh: MeshSpecification | null = null

	constructor(
		private readonly _csgVertices: Float32Array,
		private readonly _csgFaces: Uint32Array
	) {
		super()
	}

	/** Direct access to raw vertices for chaining */
	get rawVertices(): Float32Array {
		return this._csgVertices
	}

	/** Direct access to raw faces for chaining */
	get rawFaces(): Uint32Array {
		return this._csgFaces
	}

	protected toMesh(): MeshSpecification {
		if (this._cachedMesh) return this._cachedMesh

		const vertexCount = this._csgVertices.length / 3
		const faceCount = this._csgFaces.length / 3

		const vectors: Vector3[] = []
		for (let i = 0; i < vertexCount; i++) {
			vectors.push(
				new Vector3(
					this._csgVertices[i * 3],
					this._csgVertices[i * 3 + 1],
					this._csgVertices[i * 3 + 2]
				)
			)
		}

		const faceTriples: [Vector3, Vector3, Vector3][] = []
		for (let i = 0; i < faceCount; i++) {
			const a = this._csgFaces[i * 3]
			const b = this._csgFaces[i * 3 + 1]
			const c = this._csgFaces[i * 3 + 2]

			if (a < vertexCount && b < vertexCount && c < vertexCount) {
				faceTriples.push([vectors[a], vectors[b], vectors[c]])
			}
		}

		this._cachedMesh = faceTriples
		return this._cachedMesh
	}
}

/**
 * Convert AMesh to flat arrays for WASM
 */
function ameshToArrays(mesh: AMesh): {
	vertices: Float32Array
	faces: Uint32Array
} {
	const vertexMap = new Map<string, number>()
	const vertices: number[] = []
	const faces: number[] = []

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

		faces.push(...faceIndices)
	}

	return {
		vertices: new Float32Array(vertices),
		faces: new Uint32Array(faces),
	}
}

/**
 * Perform a pairwise boolean reduction over an array of meshes
 */
async function booleanReduce(
	meshes: AMesh[],
	op: (
		a: Float32Array,
		aF: Uint32Array,
		b: Float32Array,
		bF: Uint32Array
	) => { vertices: Float32Array; faces: Uint32Array }
): Promise<AMesh> {
	if (meshes.length === 0) {
		throw new Error('At least one mesh required')
	}
	if (meshes.length === 1) {
		return meshes[0]
	}

	let result = ameshToArrays(meshes[0])

	for (let i = 1; i < meshes.length; i++) {
		const next = ameshToArrays(meshes[i])
		result = op(result.vertices, result.faces, next.vertices, next.faces)
	}

	return new CsgResultMesh(result.vertices, result.faces)
}

// ── DI algorithm implementations ──

async function union3(mesh1: AMesh, ...meshes: AMesh[]): Promise<AMesh> {
	const mod = await ensureInitialized()
	return booleanReduce([mesh1, ...meshes], mod.csg_union)
}

async function intersect3(mesh1: AMesh, ...meshes: AMesh[]): Promise<AMesh> {
	const mod = await ensureInitialized()
	return booleanReduce([mesh1, ...meshes], mod.csg_intersect)
}

async function subtract3(mesh1: AMesh, mesh2: AMesh): Promise<AMesh> {
	const mod = await ensureInitialized()
	const a = ameshToArrays(mesh1)
	const b = ameshToArrays(mesh2)
	const result = mod.csg_subtract(a.vertices, a.faces, b.vertices, b.faces)
	return new CsgResultMesh(result.vertices, result.faces)
}

async function hull3(mesh1: AMesh, ...meshes: AMesh[]): Promise<AMesh> {
	const mod = await ensureInitialized()

	if (meshes.length === 0) {
		const single = ameshToArrays(mesh1)
		const result = mod.csg_hull(single.vertices, single.faces)
		return new CsgResultMesh(result.vertices, result.faces)
	}

	// Union all meshes first, then hull the combined result
	const unionResult = await booleanReduce([mesh1, ...meshes], mod.csg_union)
	if (unionResult instanceof CsgResultMesh) {
		const result = mod.csg_hull(unionResult.rawVertices, unionResult.rawFaces)
		return new CsgResultMesh(result.vertices, result.faces)
	}
	// Shouldn't reach here (booleanReduce always returns CsgResultMesh)
	const arrays = ameshToArrays(unionResult)
	const result = mod.csg_hull(arrays.vertices, arrays.faces)
	return new CsgResultMesh(result.vertices, result.faces)
}

// Pre-initialize on module load (non-blocking)
ensureInitialized().catch(() => {
	// Silently fail — DI will use JSCAD fallback
})

export default {
	union3,
	intersect3,
	subtract3,
	hull3,
} satisfies Partial<Algorithms>
