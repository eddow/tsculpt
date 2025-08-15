import { Vector2, Vector3 } from './bunches'

/**
 * Represents a 2D contour/profile for extrusion operations.
 * Uses Vector2 for efficiency and semantic clarity.
 * A contour is defined by edges (line segments), not faces.
 */
export class Contour {
	private vectors2D: Vector2[] = []
	private edges2D: [number, number][] = []

	constructor(edges: [Vector2, Vector2][])
	constructor(vectors: Vector2[], edges: [number, number][])
	constructor(edgesOrVectors: [Vector2, Vector2][] | Vector2[], edges?: [number, number][]) {
		if (Array.isArray(edgesOrVectors[0]) && Array.isArray(edgesOrVectors[0][0])) {
			// Constructor with Vector2 edges
			const edges2D = edgesOrVectors as [Vector2, Vector2][]
			this.vectors2D = Contour.extractVectors2D(edges2D)
			this.edges2D = Contour.createEdgeIndices(edges2D, this.vectors2D)
		} else {
			// Constructor with vectors and edge indices
			this.vectors2D = edgesOrVectors as Vector2[]
			this.edges2D = edges || []
		}
	}

	/**
	 * Extract unique Vector2 vertices from edges
	 */
	private static extractVectors2D(edges: [Vector2, Vector2][]): Vector2[] {
		const uniqueVectors = new Map<string, Vector2>()

		for (const edge of edges) {
			for (const vertex of edge) {
				const key = `${vertex.x},${vertex.y}`
				if (!uniqueVectors.has(key)) {
					uniqueVectors.set(key, vertex)
				}
			}
		}

		return Array.from(uniqueVectors.values())
	}

	/**
	 * Create edge indices from Vector2 edges
	 */
	private static createEdgeIndices(
		edges: [Vector2, Vector2][],
		vectors2D: Vector2[]
	): [number, number][] {
		const edgeIndices: [number, number][] = []

		for (const edge of edges) {
			const indices: number[] = []
			for (const vertex of edge) {
				const index = vectors2D.findIndex((v: Vector2) => v.x === vertex.x && v.y === vertex.y)
				if (index === -1) {
					throw new Error(`Vertex not found in vectors array: (${vertex.x}, ${vertex.y})`)
				}
				indices.push(index)
			}
			edgeIndices.push([indices[0], indices[1]])
		}

		return edgeIndices
	}

	/**
	 * Get Vector2 vertices
	 */
	get vectors(): Vector2[] {
		return this.vectors2D
	}

	/**
	 * Get edge indices
	 */
	get edges(): [number, number][] {
		return this.edges2D
	}

	/**
	 * Convert to Vector3 for extrusion compatibility
	 * Creates triangular faces from edges for 3D mesh generation
	 */
	toVector3(): { vectors: Vector3[]; faces: [number, number, number][] } {
		// Convert edges to triangular faces (simple triangulation)
		const faces: [number, number, number][] = []
		for (let i = 0; i < this.edges2D.length; i++) {
			const edge = this.edges2D[i]
			const nextEdge = this.edges2D[(i + 1) % this.edges2D.length]

			// Create a triangle from two consecutive edges
			faces.push([edge[0], edge[1], nextEdge[1]])
		}

		return {
			vectors: this.vectors2D.map((v) => new Vector3(v.x, v.y, 0)),
			faces: faces,
		}
	}

	/**
	 * Creates a Contour from a polygon defined by vertices
	 * Assumes vertices are in order and form a closed polygon
	 */
	static polygon(vertices: Vector2[]): Contour {
		// Create edges connecting consecutive vertices
		const edges: [Vector2, Vector2][] = []
		for (let i = 0; i < vertices.length; i++) {
			const current = vertices[i]
			const next = vertices[(i + 1) % vertices.length]
			edges.push([current, next])
		}

		return new Contour(edges)
	}
}
