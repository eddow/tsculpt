import { type IMesh, Mesh } from '@tsculpt/types'
import { v3 } from '@tsculpt/types/builders'
import type { Vector3 } from '@tsculpt/types/bunches'
import { Box3, Vector3 as ThreeVector3 } from 'three'

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
}

/**
 * Calculate comprehensive geometry statistics
 */
export function analyzeGeometry(mesh: IMesh): GeometryStats {
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

	const isWatertight = Array.from(edgeMap.values()).every((count) => count === 2)

	// Check if manifold (no non-manifold edges)
	const isManifold = Array.from(edgeMap.values()).every((count) => count <= 2)

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
		volume: Math.abs(volume),
		hasNormals: false, // Your mesh format doesn't store normals
		hasUVs: false, // Your mesh format doesn't store UVs
		isWatertight,
		isManifold,
	}
}
