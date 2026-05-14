import { AMesh, MeshBase, Vector3 } from '@tsculpt/types'
import { Box3, Vector3 as ThreeVector3 } from 'three'
import { epsilon } from './math'

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
	/** Signed volume before absolute-value display; negative means inside-out winding. */
	signedVolume: number
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
	const signedVolume = volume
	const absVolume = Math.abs(signedVolume)
	const isDegenerate = mesh.faces.length === 0 || absVolume < 1e-12 || signedVolume < 0
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
		signedVolume,
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

// ---------------------------------------------------------------------------
// Mesh repair functions
// ---------------------------------------------------------------------------

type Numbers3 = readonly [number, number, number]

/** Report of what repair actions were taken */
export interface RepairReport {
	normalsFlipped: boolean
	degenerateRemoved: number
	holesFilled: number
	totalActions: number
}

function edgeKey(a: number, b: number): string {
	return `${Math.min(a, b)}-${Math.max(a, b)}`
}

/** Build undirected edge→count map from face index triples */
function buildEdgeMap(faces: readonly Numbers3[]): Map<string, number> {
	const edgeMap = new Map<string, number>()
	for (const face of faces) {
		for (let i = 0; i < 3; i++) {
			const edge = edgeKey(face[i], face[(i + 1) % 3])
			edgeMap.set(edge, (edgeMap.get(edge) || 0) + 1)
		}
	}
	return edgeMap
}

function buildBoundaryLoops(faces: readonly Numbers3[]): number[][] {
	const edgeMap = buildEdgeMap(faces)
	const boundaryEdges: [number, number][] = []

	for (const face of faces) {
		for (let i = 0; i < 3; i++) {
			const a = face[i]
			const b = face[(i + 1) % 3]
			if (edgeMap.get(edgeKey(a, b)) === 1) {
				boundaryEdges.push([a, b])
			}
		}
	}

	const outgoing = new Map<number, number[]>()
	for (const [a, b] of boundaryEdges) {
		const edges = outgoing.get(a)
		if (edges) {
			edges.push(b)
		} else {
			outgoing.set(a, [b])
		}
	}

	const visitedEdges = new Set<string>()
	const loops: number[][] = []

	for (const [start, next] of boundaryEdges) {
		const startKey = `${start}->${next}`
		if (visitedEdges.has(startKey)) continue

		const loop: number[] = [start]
		let current = start
		let candidate = next
		let closed = false

		while (true) {
			const directedKey = `${current}->${candidate}`
			if (visitedEdges.has(directedKey)) break

			visitedEdges.add(directedKey)
			loop.push(candidate)

			if (candidate === start) {
				closed = true
				break
			}

			const nextCandidates = outgoing
				.get(candidate)
				?.filter((n) => !visitedEdges.has(`${candidate}->${n}`))
			if (!nextCandidates || nextCandidates.length !== 1) break

			current = candidate
			candidate = nextCandidates[0]
		}

		if (closed && loop.length >= 4) {
			loops.push(loop.slice(0, -1))
		}
	}

	return loops
}

/**
 * If the mesh has negative signed volume, flip all face windings.
 * Returns new face array; never mutates input.
 */
export function repairNormals(
	faces: Numbers3[],
	vectors: readonly Vector3[]
): { faces: Numbers3[]; flipped: boolean } {
	let volume = 0
	for (const face of faces) {
		const v1 = vectors[face[0]]
		const v2 = vectors[face[1]]
		const v3 = vectors[face[2]]
		const det =
			v1[0] * (v2[1] * v3[2] - v2[2] * v3[1]) +
			v1[1] * (v2[2] * v3[0] - v2[0] * v3[2]) +
			v1[2] * (v2[0] * v3[1] - v2[1] * v3[0])
		volume += det / 6
	}
	if (volume >= 0) return { faces, flipped: false }
	return {
		faces: faces.map((f) => [f[0], f[2], f[1]] as Numbers3),
		flipped: true,
	}
}

/**
 * Remove faces whose surface area is below epsilon.
 */
export function removeDegenerateFaces(
	faces: Numbers3[],
	vectors: readonly Vector3[]
): { faces: Numbers3[]; removed: number } {
	const result: Numbers3[] = []
	for (const face of faces) {
		const v1 = vectors[face[0]]
		const v2 = vectors[face[1]]
		const v3 = vectors[face[2]]
		const e1x = v2[0] - v1[0]
		const e1y = v2[1] - v1[1]
		const e1z = v2[2] - v1[2]
		const e2x = v3[0] - v1[0]
		const e2y = v3[1] - v1[1]
		const e2z = v3[2] - v1[2]
		const cx = e1y * e2z - e1z * e2y
		const cy = e1z * e2x - e1x * e2z
		const cz = e1x * e2y - e1y * e2x
		const area = Math.sqrt(cx * cx + cy * cy + cz * cz) / 2
		if (area > epsilon) {
			result.push(face)
		}
	}
	return { faces: result, removed: faces.length - result.length }
}

/**
 * Detect boundary edge loops and fill each with a fan triangle from
 * the loop centroid. Returns new face array and any new centroid
 * vectors that need to be appended to the vector list.
 */
export function fillHoles(
	faces: Numbers3[],
	vectors: readonly Vector3[]
): { faces: Numbers3[]; newVectors: Vector3[]; holesFilled: number } {
	const loops = buildBoundaryLoops(faces)
	if (loops.length === 0) return { faces, newVectors: [], holesFilled: 0 }

	// Fill each loop with fan triangulation from centroid
	const allVectors = [...vectors] as Vector3[]
	const newFaces = [...faces] as Numbers3[]
	let holesFilled = 0

	for (const loop of loops) {
		let cx = 0
		let cy = 0
		let cz = 0
		for (const vi of loop) {
			const v = allVectors[vi]
			cx += v[0]
			cy += v[1]
			cz += v[2]
		}
		cx /= loop.length
		cy /= loop.length
		cz /= loop.length
		const centerIdx = allVectors.length
		allVectors.push([cx, cy, cz] as Vector3)

		for (let i = 0; i < loop.length; i++) {
			newFaces.push([loop[(i + 1) % loop.length], loop[i], centerIdx] as Numbers3)
		}
		holesFilled++
	}

	const newVectors = allVectors.slice(vectors.length)
	return { faces: newFaces, newVectors, holesFilled }
}

/**
 * Run all available repair operations on a mesh.
 * Returns a brand-new Mesh (never mutates the original) and a report of actions taken.
 */
export function repairMesh(mesh: AMesh): { repaired: MeshBase; report: RepairReport } {
	let faces: Numbers3[] = mesh.faces.map((f) => [...f] as Numbers3)
	const vectors: Vector3[] = mesh.vectors.map((v) => [...v] as Vector3)

	const report: RepairReport = {
		normalsFlipped: false,
		degenerateRemoved: 0,
		holesFilled: 0,
		totalActions: 0,
	}

	// 1. Fix inverted normals
	const nr = repairNormals(faces, vectors)
	faces = nr.faces
	report.normalsFlipped = nr.flipped

	// 2. Remove degenerate (zero-area) faces
	const dr = removeDegenerateFaces(faces, vectors)
	faces = dr.faces
	report.degenerateRemoved = dr.removed

	// 3. Fill boundary holes
	const hr = fillHoles(faces, vectors)
	faces = hr.faces
	const allVectors = [...vectors, ...hr.newVectors]
	report.holesFilled = hr.holesFilled

	report.totalActions =
		(report.normalsFlipped ? 1 : 0) + report.degenerateRemoved + report.holesFilled

	return {
		repaired: new MeshBase(faces, allVectors),
		report,
	}
}
