import { generation } from '../globals'
import { VectorMap } from '../vectorSet'
import { Vector3 } from './bunches'
import { Contour } from './contour'
import { Mesh } from './mesh'

/**
 * Parametric path in 3D space. t is typically in [0, 1], but not enforced.
 * Returns origin point and coordinate frame vectors.
 */
export type PathFn = (t: number) => {
	o: Vector3 // origin point
	x: Vector3 // x-axis direction (normalized)
	y: Vector3 // y-axis direction (normalized)
}

/**
 * Parametric contour/profile along the path. Allows the profile to vary with t.
 */
export type ContourFn = (t: number) => Contour

/**
 * Sampling strategy for the path
 */
export type SamplingMode =
	| { type: 'count'; samples: number }
	| { type: 'adaptive'; maxSegmentLength?: number } // defaults to generation.grain
/**
 * Generic parametric extrusion specification.
 *
 * The resulting sweep is conceptually the "product" of:
 * - a 1D path in 3D (path(t) -> Vector3)
 * - a 2D contour varying along the path (contour(t) -> Contour)
 */
export interface ExtrusionSpec {
	path: PathFn
	contour: ContourFn | Contour
	// Path sampling
	sampling?: SamplingMode // default: adaptive with grain-based length

	// Path range
	range?: { start: number; end: number } // default: [0, 1]

	// Caps
	caps?: boolean // default: true

}

export function extrude(spec: ExtrusionSpec): Mesh {
	const {
		path,
		contour,
		sampling = { type: 'adaptive' },
		range = { start: 0, end: 1 },
		caps = true,
	} = spec

	// Determine number of path samples
	const pathSamples =
		sampling.type === 'count'
			? sampling.samples
			: Math.ceil(
					Vector3.sub(path(range.end).o, path(range.start).o).size /
						(sampling.maxSegmentLength || generation.grain)
				)

	// Generate path samples
	const pathFrames: { o: Vector3; x: Vector3; y: Vector3 }[] = []
	for (let i = 0; i < pathSamples; i++) {
		const t = range.start + (range.end - range.start) * (i / (pathSamples - 1))
		pathFrames.push(path(t))
	}

	// Handle contour (constant or parametric)
	const getContour = typeof contour === 'function' ? contour : () => contour

	// Use VectorMap for vertex deduplication
	const vectorMap = new VectorMap<Vector3>()
	const faces: [number, number, number][] = []
	const contourIndices: number[][] = [] // Store indices for each contour

	// For each path sample, generate contour vertices
	for (let i = 0; i < pathFrames.length; i++) {
		const t = range.start + (range.end - range.start) * (i / (pathSamples - 1))
		const frame = pathFrames[i]
		const contour = getContour(t)

		// Convert contour to 3D vertices at this path point
		const contourVertices = contour.vectors.map((v2) => new Vector3(v2.x, v2.y, 0))

		// Transform vertices using the provided coordinate frame
		const transformedVertices = contourVertices.map((vertex) => {
			// Transform vertex from local XY to world coordinates using the frame
			const x = vertex.x * frame.x.x + vertex.y * frame.y.x
			const y = vertex.x * frame.x.y + vertex.y * frame.y.y
			const z = vertex.x * frame.x.z + vertex.y * frame.y.z

			return Vector3.add(new Vector3(x, y, z), frame.o)
		})

		// Store vertex indices for this contour
		const currentContourIndices: number[] = []
		for (const vertex of transformedVertices) {
			currentContourIndices.push(vectorMap.index(vertex))
		}
		contourIndices.push(currentContourIndices)
	}

	// Generate faces between consecutive path samples
	for (let i = 0; i < pathFrames.length - 1; i++) {
		const currentContour = contourIndices[i]
		const nextContour = contourIndices[i + 1]
		const verticesPerContour = currentContour.length

		// Create faces for each contour edge
		for (let j = 0; j < verticesPerContour; j++) {
			const next = (j + 1) % verticesPerContour

			const current1 = currentContour[j]
			const current2 = currentContour[next]
			const next1 = nextContour[j]
			const next2 = nextContour[next]

			// Triangulate the quad
			faces.push([current1, current2, next1])
			faces.push([current2, next2, next1])
		}
	}

	// Add caps if requested
	if (caps && contourIndices.length > 0) {
		const firstContour = contourIndices[0]
		const lastContour = contourIndices[contourIndices.length - 1]

		// Start cap (fan triangulation)
		if (firstContour.length >= 3) {
			for (let i = 1; i < firstContour.length - 1; i++) {
				faces.push([firstContour[0], firstContour[i + 1], firstContour[i]])
			}
		}

		// End cap (fan triangulation)
		if (lastContour.length >= 3) {
			for (let i = 1; i < lastContour.length - 1; i++) {
				faces.push([lastContour[0], lastContour[i], lastContour[i + 1]])
			}
		}
	}

	return new Mesh(faces, vectorMap.vectors)
}
