import { type AMesh } from '@tsculpt/types'
import { Box3, Vector3 as ThreeVector3 } from 'three'

/**
 * Printability status of a mesh.
 * - 'printable': watertight, manifold, positive volume — ready for 3D printing
 * - 'not-watertight': at least one edge is shared by ≠2 faces — has holes
 * - 'non-manifold': at least one edge shared by >2 faces — self-intersections or flaps
 * - 'degenerate': zero or negative volume — flat or inside-out
 */
export type Printability = 'printable' | 'not-watertight' | 'non-manifold' | 'degenerate'

/**
 * Geometry statistics and analysis
 */
export interface GeometryStats {
	vertexCount: number
	faceCount: number
	boundingBox: {
		min: [number, number, number]
		max: [number, number, number]
		size: [number, number, number]
		center: [number, number, number]
	}
	surfaceArea: number
	volume: number
	hasNormals: boolean
	hasUVs: boolean
	isWatertight: boolean
	isManifold: boolean
	/** High-level printability assessment */
	printability: Printability
	/** Number of boundary edges (edges shared by only 1 face — holes) */
	boundaryEdges: number
	/** Number of non-manifold edges (edges shared by >2 faces) */
	nonManifoldEdges: number
}
/**
 * Calculate comprehensive geometry statistics
 */
export function analyzeGeometry(mesh: AMesh): GeometryStats {
	// Basic counts
	const vertexCount = mesh.vectors.length
	const faceCount = mesh.faces.length

	// Bounding box
	const bbox = new Box3()
	for (const v of mesh.vectors) {
		bbox.expandByPoint(new ThreeVector3(v[0], v[1], v[2]))
	}

	const min = bbox.min
	const max = bbox.max
	const size = bbox.getSize(new ThreeVector3())
	const center = bbox.getCenter(new ThreeVector3())

	// Surface area
	let surfaceArea = 0
	for (const face of mesh.faces) {
		const v1 = mesh.vectors[face[0]]
		const v2 = mesh.vectors[face[1]]
		const v3 = mesh.vectors[face[2]]

		// Calculate face area using cross product
		const edge1 = [v2[0] - v1[0], v2[1] - v1[1], v2[2] - v1[2]]
		const edge2 = [v3[0] - v1[0], v3[1] - v1[1], v3[2] - v1[2]]

		const cross = [
			edge1[1] * edge2[2] - edge1[2] * edge2[1],
			edge1[2] * edge2[0] - edge1[0] * edge2[2],
			edge1[0] * edge2[1] - edge1[1] * edge2[0],
		]

		const area = Math.sqrt(cross[0] * cross[0] + cross[1] * cross[1] + cross[2] * cross[2]) / 2
		surfaceArea += area
	}

	// Volume (using signed tetrahedron volume)
	let volume = 0
	for (const face of mesh.faces) {
		const v1 = mesh.vectors[face[0]]
		const v2 = mesh.vectors[face[1]]
		const v3 = mesh.vectors[face[2]]

		// Signed volume of tetrahedron
		const det =
			v1[0] * (v2[1] * v3[2] - v2[2] * v3[1]) +
			v1[1] * (v2[2] * v3[0] - v2[0] * v3[2]) +
			v1[2] * (v2[0] * v3[1] - v2[1] * v3[0])

		volume += det / 6
	}

	// Check if watertight (all edges shared by exactly 2 faces)
	const edgeMap = new Map<string, number>()
	for (const face of mesh.faces) {
		for (let i = 0; i < 3; i++) {
			const v1 = Math.min(face[i], face[(i + 1) % 3])
			const v2 = Math.max(face[i], face[(i + 1) % 3])
			const edge = `${v1}-${v2}`
			edgeMap.set(edge, (edgeMap.get(edge) || 0) + 1)
		}
	}

	const edgeCounts = Array.from(edgeMap.values())
	const isWatertight = edgeCounts.every((count) => count === 2)
	const isManifold = edgeCounts.every((count) => count <= 2)
	const boundaryEdges = edgeCounts.filter((count) => count === 1).length
	const nonManifoldEdges = edgeCounts.filter((count) => count > 2).length

	// Determine printability
	const absVolume = Math.abs(volume)
	const isDegenerate = mesh.faces.length === 0 || absVolume < 1e-12
	let printability: Printability
	if (isDegenerate) {
		printability = 'degenerate'
	} else if (!isManifold) {
		printability = 'non-manifold'
	} else if (!isWatertight) {
		printability = 'not-watertight'
	} else {
		printability = 'printable'
	}

	return {
		vertexCount,
		faceCount,
		boundingBox: {
			min: [min.x, min.y, min.z],
			max: [max.x, max.y, max.z],
			size: [size.x, size.y, size.z],
			center: [center.x, center.y, center.z],
		},
		surfaceArea,
		volume: absVolume,
		hasNormals: false, // Your mesh format doesn't store normals
		hasUVs: false, // Your mesh format doesn't store UVs
		isWatertight,
		isManifold,
		printability,
		boundaryEdges,
		nonManifoldEdges,
	}
}
