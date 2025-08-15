import { Vector2, Vector3 } from './bunches'
import { VectorMap } from '../vectorSet'
import { cache } from '@tsculpt/ts/decorators'

/**
 * Represents a 2D contour/profile for extrusion operations.
 * Uses Vector2 for efficiency and semantic clarity.
 * A contour is defined by edges (line segments), not faces.
 */
export class Contour {
	private readonly set = new VectorMap<Vector2>()
	get vectors() {
		return this.set.vectors
	}
	readonly edges: [number, number][]

	constructor(edges: [Vector2, Vector2][])
	constructor(vectors: Vector2[], edges: [number, number][])
	constructor(edgesOrVectors: [Vector2, Vector2][] | Vector2[], edges?: [number, number][]) {
		if (Array.isArray(edgesOrVectors[0]) && Array.isArray(edgesOrVectors[0][0])) {
			// Constructor with Vector2 edges
			const edges = edgesOrVectors as [Vector2, Vector2][]
			this.edges = []

			for (const edge of edges) {
				const indices: number[] = []
				for (const vertex of edge) {
					const index = this.set.index(vertex)
					indices.push(index)
				}
				this.edges.push([indices[0], indices[1]])
			}
		} else {
			// Constructor with vectors and edge indices
			const vectors = edgesOrVectors as Vector2[]
			for (const vector of vectors) this.set.index(vector)
			this.edges = edges || []
		}
	}

	get reversed() {
		const reversed = new Contour(this.vectors, this.edges.map(([a, b]) => [b, a]))
		cache(reversed, 'reversed', this)
		return reversed
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
