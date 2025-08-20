import { Algorithms } from '@tsculpt/ts/di'
import { APolygon, AShape, Surface } from '@tsculpt/types'
import { v2 } from '@tsculpt/types/builders'
import earcut from 'earcut'

interface IndexedHolesShape {
	polygons: number[]
	holesIndices: number[]
}
export function indexedHoles(polygon: APolygon, holes: APolygon[]): IndexedHolesShape {
	// Flatten the main polygon into [x0, y0, x1, y1, ...]
	const vertices = polygon.flatMap((v) => [v.x, v.y])

	// Flatten all holes (in reverse order) and record their start indices
	const holeVertices = holes.flatMap((hole) => hole.reversed.flatMap((v) => [v.x, v.y]))

	// Compute the start index of each hole in the combined vertex array
	// (earcut expects an array of hole start indices, not lengths)
	const holeIndices: number[] = []
	let currentIndex = polygon.length * 2 // Start after the main polygon
	for (const hole of holes) {
		holeIndices.push(currentIndex / 2) // Divide by 2 because earcut works in vertex counts, not coordinates
		currentIndex += hole.length * 2
	}

	// Combine main polygon and holes into a single vertex array
	return {
		polygons: [...vertices, ...holeVertices],
		holesIndices: holeIndices,
	}
}

function triangulate(shape: AShape, winding: 'ccw' | 'cw' = 'ccw'): Surface {
	const { polygons: allVertices, holesIndices } = indexedHoles(shape.polygon, shape.holes)

	// Triangulate using earcut
	const indices = earcut(allVertices, holesIndices)
	function vertex(i: number) {
		return v2(allVertices[i * 2], allVertices[i * 2 + 1])
	}
	// Convert indices back to triangles
	const surface: Surface = []
	for (let i = 0; i < indices.length; i += 3) {
		const a = vertex(indices[i])
		const b = vertex(indices[i + 1])
		const c = vertex(indices[i + 2])

		// Apply winding order
		if (winding === 'cw') {
			surface.push([a, c, b]) // Reverse winding for clockwise
		} else {
			surface.push([a, b, c]) // Default counter-clockwise
		}
	}

	return surface
}

export default {
	triangulate,
} as Partial<Algorithms>
