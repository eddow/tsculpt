import { lerp } from '@tsculpt/math'
import { generation } from '../globals'
import { VectorMap } from '../optimizations'
import { assert } from '../ts/debug'
import { Vector2, Vector3 } from './bunches'
import { Contour } from './contour'
import { Mesh } from './mesh'

// TODO Make more robust path management (composition, lofting, size estimation for grain mgt, &c)
interface Frame {
	o: Vector3
	x: Vector3
	y: Vector3
}
/**
 * Parametric path in 3D space. t is typically in [0, 1], but not enforced.
 * Returns origin point and coordinate frame vectors.
 */
export type PathFn = (t: number) => Frame

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
					path(range.end).o.sub(path(range.start).o).size /
						(sampling.maxSegmentLength || generation.grain)
				)
	if (pathSamples < 2) {
		throw new Error('Path must have at least 2 samples')
	}
	// Handle contour (constant or parametric)
	const getContour = typeof contour === 'function' ? contour : () => contour

	// Use VectorMap for vertex deduplication
	const vectorMap = new VectorMap<Vector3>()
	const faces: [number, number, number][] = []

	// Transform a 2D vertex to 3D using the given frame
	const transformVertex = (v2: Vector2, frame: Frame): Vector3 => {
		const x = v2.x * frame.x.x + v2.y * frame.y.x
		const y = v2.x * frame.x.y + v2.y * frame.y.y
		const z = v2.x * frame.x.z + v2.y * frame.y.z
		return frame.o.add([x, y, z])
	}

	// Convert 2D vertex to 3D and get index
	const vertexToIndex = (v2: Vector2, frame: Frame): number => {
		const v3 = transformVertex(v2, frame)
		return vectorMap.index(v3)
	}

	const firstFrame = path(range.start)
	const firstContour = getContour(range.start)
	// Process contours in pairs (lastContour, nextContour)
	let lastContoured = firstContour.flatPolygons.map((polygon) =>
		polygon.map((vertex) => vertexToIndex(vertex, firstFrame))
	)

	for (let i = 1; i < pathSamples; i++) {
		const t = lerp(range.start, range.end, i / (pathSamples - 1))
		const frame = path(t)
		const contour = getContour(t)

		// Convert contour to mesh indices for extrusion
		const nextContoured = contour.flatPolygons.map((polygon) =>
			polygon.map((vertex) => vertexToIndex(vertex, frame))
		)

		// Generate faces between lastContour and nextContour
		assert.equal(
			lastContoured.length,
			nextContoured.length,
			'lastContour and nextContour must have the same number of polygons'
		)
		// For each polygon in the contour
		for (let polyIndex = 0; polyIndex < lastContoured.length; polyIndex++) {
			const lastPoly = lastContoured[polyIndex]
			const nextPoly = nextContoured[polyIndex]
			assert.equal(
				lastPoly.length,
				nextPoly.length,
				'lastPoly and nextPoly must have the same number of vertices'
			)
			const verticesPerPoly = lastPoly.length

			/*
			faces (4 edges) =
				L (Last rotation) & R (current Rotation) x
				P (current Polygon) & N (Next polygon)
			*/
			let vPL = lastPoly[verticesPerPoly - 1]
			let vNL = nextPoly[verticesPerPoly - 1]
			// Create faces for each edge of the polygon
			for (let j = 0; j < verticesPerPoly; j++) {
				const vPR = lastPoly[j]
				const vNR = nextPoly[j]

				// Triangulate the quad
				faces.push([vNL, vPR, vNR])
				faces.push([vPL, vPR, vNL])

				vPL = vPR
				vNL = vNR
			}
		}

		lastContoured = nextContoured
	}

	// Add caps for the first and last contours
	if (caps) {
		// Start cap (first contour) - use shape triangulation with CCW winding
		for (const shape of firstContour) {
			const surface = shape.triangulate('cw')
			for (const triangle of surface) {
				const indices = triangle.map((vertex) => vertexToIndex(vertex, firstFrame))
				faces.push(indices as [number, number, number])
			}
		}

		// End cap (last contour) - use shape triangulation with CW winding
		const lastContour = getContour(range.end)
		const lastFrame = path(range.end)
		for (const shape of lastContour) {
			const surface = shape.triangulate('ccw')
			for (const triangle of surface) {
				const indices = triangle.map((vertex) => vertexToIndex(vertex, lastFrame))
				faces.push(indices as [number, number, number])
			}
		}
	}

	return new Mesh(faces, vectorMap.vectors)
}
