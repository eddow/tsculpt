import { generation } from '../globals'
import { VectorMap } from '../vectorSet'
import { Vector3 } from './bunches'
import { Contour } from './contour'
import { Mesh } from './mesh'

/**
 * Parametric path in 3D space. t is typically in [0, 1], but not enforced.
 */
export type PathFn = (t: number) => Vector3

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

	// Orientation
	orientation?: Vector3 | ((t: number) => Vector3)
}

export function extrude(spec: ExtrusionSpec): Mesh {
	const {
		path,
		contour,
		sampling = { type: 'adaptive' },
		range = { start: 0, end: 1 },
		caps = true,
		orientation,
	} = spec

	// Determine number of path samples
	const pathSamples =
		sampling.type === 'count'
			? sampling.samples
			: Math.ceil(
					Vector3.sub(path(range.end), path(range.start)).size /
						(sampling.maxSegmentLength || generation.grain)
				)

	// Generate path samples
	const pathPoints: Vector3[] = []
	for (let i = 0; i < pathSamples; i++) {
		const t = range.start + (range.end - range.start) * (i / (pathSamples - 1))
		pathPoints.push(path(t))
	}

	// Handle contour (constant or parametric)
	const getContour = typeof contour === 'function' ? contour : () => contour
	const getUp = typeof orientation === 'function' ? orientation : () => orientation!

	// Use VectorMap for vertex deduplication
	const vectorMap = new VectorMap<Vector3>()
	const faces: [number, number, number][] = []
	const contourIndices: number[][] = [] // Store indices for each contour

	// For each path sample, generate contour vertices
	for (let i = 0; i < pathPoints.length; i++) {
		const t = range.start + (range.end - range.start) * (i / (pathSamples - 1))
		const pathPoint = pathPoints[i]
		const contour = getContour(t)

		// Convert contour to 3D vertices at this path point
		const contourVertices = contour.vectors.map((v2) => new Vector3(v2.x, v2.y, 0))

		// Apply orientation transformation
		const transformedVertices = contourVertices.map((vertex) => {
			if (orientation) {
				// Parametric up vector: orientation(t) -> Vector3
				const up = getUp(t)
				const tangent =
					i < pathPoints.length - 1
						? Vector3.sub(pathPoints[i + 1], pathPoints[i]).normalized()
						: Vector3.sub(pathPoints[i], pathPoints[i - 1]).normalized()

				// Handle case where tangent and up are parallel (cross product is zero)
				const crossProduct = new Vector3(...Vector3.cross(tangent, up))
				if (crossProduct.size < 1e-10) {
					// For parallel vectors, use a simple approach: X stays X, Y stays Y, Z comes from path
					return new Vector3(vertex.x, vertex.y, pathPoint.z)
				}

				// Compute right vector: tangent × up
				const right = crossProduct.normalized()
				// Recompute up to ensure orthogonality: right × tangent
				const correctedUp = new Vector3(...Vector3.cross(right, tangent)).normalized()

				// Transform vertex from local XY to world coordinates
				const x = vertex.x * right.x + vertex.y * correctedUp.x
				const y = vertex.x * right.y + vertex.y * correctedUp.y
				const z = vertex.x * right.z + vertex.y * correctedUp.z

				return Vector3.add(new Vector3(x, y, z), pathPoint)
			}
			// Frenet frame orientation: use path tangent, normal, and binormal
			const tangent =
				i < pathPoints.length - 1
					? Vector3.sub(pathPoints[i + 1], pathPoints[i]).normalized()
					: Vector3.sub(pathPoints[i], pathPoints[i - 1]).normalized()

			// Compute normal vector (direction of curvature)
			let normal: Vector3
			if (i === 0) {
				// For first point, use a perpendicular vector to tangent
				normal = Math.abs(tangent.x) < 0.5 ? new Vector3(1, 0, 0) : new Vector3(0, 1, 0)
				// Project out tangent component
				const tangentComponent =
					normal[0] * tangent[0] + normal[1] * tangent[1] + normal[2] * tangent[2]
				normal = Vector3.sub(
					normal,
					new Vector3(
						tangent[0] * tangentComponent,
						tangent[1] * tangentComponent,
						tangent[2] * tangentComponent
					)
				)
				normal = normal.normalized()
			} else if (i === pathPoints.length - 1) {
				// For last point, use previous normal
				const prevTangent = Vector3.sub(pathPoints[i], pathPoints[i - 1]).normalized()
				normal = Math.abs(prevTangent.x) < 0.5 ? new Vector3(1, 0, 0) : new Vector3(0, 1, 0)
				const tangentComponent =
					normal[0] * prevTangent[0] + normal[1] * prevTangent[1] + normal[2] * prevTangent[2]
				normal = Vector3.sub(
					normal,
					new Vector3(
						prevTangent[0] * tangentComponent,
						prevTangent[1] * tangentComponent,
						prevTangent[2] * tangentComponent
					)
				)
				normal = normal.normalized()
			} else {
				// For middle points, compute normal from curvature
				const prevPoint = pathPoints[i - 1]
				const currentPoint = pathPoints[i]
				const nextPoint = pathPoints[i + 1]

				const prevTangent = Vector3.sub(currentPoint, prevPoint).normalized()
				const nextTangent = Vector3.sub(nextPoint, currentPoint).normalized()

				// Normal is perpendicular to both tangents
				normal = new Vector3(...Vector3.cross(prevTangent, nextTangent)).normalized()

				// If tangents are parallel, use fallback
				if (normal.size < 1e-10) {
					normal = Math.abs(tangent.x) < 0.5 ? new Vector3(1, 0, 0) : new Vector3(0, 1, 0)
					const tangentComponent =
						normal[0] * tangent[0] + normal[1] * tangent[1] + normal[2] * tangent[2]
					normal = Vector3.sub(
						normal,
						new Vector3(
							tangent[0] * tangentComponent,
							tangent[1] * tangentComponent,
							tangent[2] * tangentComponent
						)
					)
					normal = normal.normalized()
				}
			}

			// Compute binormal: tangent × normal
			const binormal = new Vector3(...Vector3.cross(tangent, normal)).normalized()

			// Transform vertex from local XY to world coordinates using Frenet frame
			// X component goes along normal, Y component goes along binormal
			const x = vertex.x * normal.x + vertex.y * binormal.x
			const y = vertex.x * normal.y + vertex.y * binormal.y
			const z = vertex.x * normal.z + vertex.y * binormal.z

			return Vector3.add(new Vector3(x, y, z), pathPoint)
		})

		// Store vertex indices for this contour
		const currentContourIndices: number[] = []
		for (const vertex of transformedVertices) {
			currentContourIndices.push(vectorMap.index(vertex))
		}
		contourIndices.push(currentContourIndices)
	}

	// Generate faces between consecutive path samples
	for (let i = 0; i < pathPoints.length - 1; i++) {
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
