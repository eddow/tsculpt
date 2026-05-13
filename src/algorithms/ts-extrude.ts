import { Algorithms } from '@tsculpt/ts/di'
import { AMesh } from '@tsculpt/types'
import type { AContour, ContourBase, Vector3 } from '@tsculpt/types'
import type { ExtrusionResult, TsExtrudeFactoryFunction, TsExtrudeModule } from '../ts-extrude-wasm'

let module: any = null
const tsExtrudeModuleUrl = '/ts-extrude-wasm/ts_extrude.js'
const importPublicModule = new Function('url', 'return import(url)') as <T>(
	url: string
) => Promise<T>

/**
 * Extrusion result intermediate class
 */
class ExtrusionMesh extends AMesh {
	private _vertices: Vector3[]
	private _faces: [number, number, number][]

	constructor(vertices: Vector3[], faces: [number, number, number][]) {
		super()
		this._vertices = vertices
		this._faces = faces
	}

	get vectors(): readonly Vector3[] {
		return this._vertices
	}

	get faces(): readonly [number, number, number][] {
		return this._faces
	}

	get verticed(): [Vector3, Vector3, Vector3][] {
		const validFaces: [Vector3, Vector3, Vector3][] = []
		for (const face of this._faces) {
			const v0 = this._vertices[face[0]]
			const v1 = this._vertices[face[1]]
			const v2 = this._vertices[face[2]]

			// Only add faces with all valid vertices
			if (v0 && v1 && v2) {
				validFaces.push([v0, v1, v2])
			}
		}

		return validFaces
	}
}

/**
 * Convert AContour to flat arrays for WASM
 */
function contourToFlatArrays(
	contour: AContour | ((t: number) => ContourBase),
	samples: number
): { vertices: Float32Array; offsets: Uint32Array; lengths: Uint32Array } {
	const vertices: number[] = []
	const offsets: number[] = []
	const lengths: number[] = []

	for (let i = 0; i < samples; i++) {
		offsets.push(vertices.length / 2)

		// Get contour for this sample (handle both static and parametric contours)
		const currentContour = typeof contour === 'function' ? contour(i / (samples - 1)) : contour

		// Flatten all polygons in the contour
		for (const shape of currentContour) {
			for (const vertex of shape.polygon) {
				vertices.push(vertex.x, vertex.y)
			}
			// Holes are included in the vertex array
			for (const hole of shape.holes) {
				for (const vertex of hole) {
					vertices.push(vertex.x, vertex.y)
				}
			}
		}

		lengths.push(vertices.length / 2 - offsets[offsets.length - 1])
	}

	return {
		vertices: new Float32Array(vertices),
		offsets: new Uint32Array(offsets),
		lengths: new Uint32Array(lengths),
	}
}

/**
 * Convert WASM result back to MeshBase
 */
function wasmResultToMesh(result: ExtrusionResult): AMesh {
	const vertices: Vector3[] = []
	const faces: [number, number, number][] = []

	// Convert flat vertex array to Vector3[]
	for (let i = 0; i < result.vertices.length; i += 3) {
		const x = result.vertices[i]
		const y = result.vertices[i + 1]
		const z = result.vertices[i + 2]

		const vertex = {
			x,
			y,
			z,
		} as Vector3

		vertices.push(vertex)
	}

	const vertexCount = vertices.length

	// Convert flat face array to face triplets
	for (let i = 0; i < result.faces.length; i += 3) {
		const v0 = result.faces[i]
		const v1 = result.faces[i + 1]
		const v2 = result.faces[i + 2]

		// Validate face indices to prevent undefined vertex access
		if (v0 < vertexCount && v1 < vertexCount && v2 < vertexCount) {
			faces.push([v0, v1, v2] as [number, number, number])
		}
	}

	return new ExtrusionMesh(vertices, faces)
}

/**
 * Ensure the WASM module is initialized
 */
async function ensureTsExtrudeInitialized(): Promise<any> {
	if (!module) {
		try {
			// Import the WASM module
			const wasmModule = await importPublicModule<
				TsExtrudeModule & { default: TsExtrudeFactoryFunction }
			>(tsExtrudeModuleUrl)

			// Initialize the WASM module
			await wasmModule.default({
				locateFile: () => '/ts-extrude-wasm/ts_extrude_bg.wasm',
			})

			// The module now has the exported functions
			module = wasmModule
		} catch (error) {
			console.error('Failed to initialize TsExtrude WASM module:', error)
			throw error
		}
	}
	return module
}

/**
 * Main extrusion function using WASM
 */
export const extrudeWasm = async (
	path: (t: number) => { o: Vector3; x: Vector3; y: Vector3 },
	contour: AContour | ((t: number) => ContourBase),
	samples: number,
	caps = true
): Promise<AMesh> => {
	const mod = await ensureTsExtrudeInitialized()

	// Build path arrays
	const pathOrigins: number[] = []
	const pathXAxes: number[] = []
	const pathYAxes: number[] = []

	for (let i = 0; i < samples; i++) {
		const t = i / (samples - 1)
		const frame = path(t)
		pathOrigins.push(frame.o.x, frame.o.y, frame.o.z)
		pathXAxes.push(frame.x.x, frame.x.y, frame.x.z)
		pathYAxes.push(frame.y.x, frame.y.y, frame.y.z)
	}

	// Build contour arrays
	const contourArrays = contourToFlatArrays(contour, samples)

	// Call WASM
	const result = mod.extrude_wasm(
		new Float32Array(pathOrigins),
		new Float32Array(pathXAxes),
		new Float32Array(pathYAxes),
		contourArrays.vertices,
		contourArrays.offsets,
		contourArrays.lengths,
		caps
	)

	return wasmResultToMesh(result)
}

/**
 * Parallel extrusion using segment splitting
 */
export const extrudeParallelWasm = async (
	path: (t: number) => { o: Vector3; x: Vector3; y: Vector3 },
	contour: AContour | ((t: number) => ContourBase),
	samples: number,
	caps = true,
	workerCount = 4
): Promise<AMesh> => {
	const mod = await ensureTsExtrudeInitialized()

	// Build path arrays
	const pathOrigins: number[] = []
	const pathXAxes: number[] = []
	const pathYAxes: number[] = []

	for (let i = 0; i < samples; i++) {
		const t = i / (samples - 1)
		const frame = path(t)
		pathOrigins.push(frame.o.x, frame.o.y, frame.o.z)
		pathXAxes.push(frame.x.x, frame.x.y, frame.x.z)
		pathYAxes.push(frame.y.x, frame.y.y, frame.y.z)
	}

	// Build contour arrays
	const contourArrays = contourToFlatArrays(contour, samples)

	// Split into segments
	const segmentSize = Math.ceil(samples / workerCount)
	const segments: Array<{
		start: number
		end: number
		isFirst: boolean
		isLast: boolean
	}> = []

	for (let i = 0; i < workerCount; i++) {
		const start = i * segmentSize
		const end = Math.min((i + 1) * segmentSize, samples)
		if (start >= samples) break
		segments.push({
			start,
			end,
			isFirst: i === 0,
			isLast: end >= samples || i === workerCount - 1,
		})
	}

	// Process segments in parallel
	const results = await Promise.all(
		segments.map((seg) =>
			mod.extrude_segment_wasm(
				new Float32Array(pathOrigins),
				new Float32Array(pathXAxes),
				new Float32Array(pathYAxes),
				contourArrays.vertices,
				contourArrays.offsets,
				contourArrays.lengths,
				seg.start,
				seg.end,
				caps,
				seg.isFirst,
				seg.isLast
			)
		)
	)

	// Merge results
	const allVertices: Vector3[] = []
	const allFaces: [number, number, number][] = []
	let vertexOffset = 0

	for (const result of results) {
		const segmentVertexCount = result.vertices.length / 3

		// Add vertices
		for (let i = 0; i < result.vertices.length; i += 3) {
			allVertices.push({
				x: result.vertices[i],
				y: result.vertices[i + 1],
				z: result.vertices[i + 2],
			} as Vector3)
		}

		// Add faces with offset adjustment
		for (let i = 0; i < result.faces.length; i += 3) {
			const v0 = result.faces[i] + vertexOffset
			const v1 = result.faces[i + 1] + vertexOffset
			const v2 = result.faces[i + 2] + vertexOffset

			// Validate face indices
			if (v0 < allVertices.length && v1 < allVertices.length && v2 < allVertices.length) {
				allFaces.push([v0, v1, v2] as [number, number, number])
			}
		}

		vertexOffset += segmentVertexCount
	}

	return new ExtrusionMesh(allVertices, allFaces)
}

// Initialize WASM on module load
ensureTsExtrudeInitialized().catch(() => {
	// Silently fail initialization, will retry on first use
})

export default {
	extrudeWasm,
} satisfies Partial<Algorithms>
