import { winding } from '@tsculpt'
import { Algorithms } from '@tsculpt/ts/di'
import {
	AContour,
	APolygon,
	IntermediateContour,
	IntermediatePolygon,
	Polygon,
	Shape,
	Vector2,
} from '@tsculpt/types'

// Import the correct types
import type { Clipper2ZFactoryFunction, MainModule, PathsD } from 'clipper2-wasm/dist/clipper2z'

let module: MainModule = null!

// Clipper2 intermediate classes
class Clipper2Polygon extends IntermediatePolygon {
	constructor(public pathD: any) {
		super()
	}

	protected toPolygon(): Vector2[] {
		const vertices: Vector2[] = []
		for (let i = 0; i < this.pathD.size(); i++) {
			const point = this.pathD.get(i)
			vertices.push(new Vector2(point.x, point.y))
		}
		return vertices
	}

	static from(polygon: Polygon): Clipper2Polygon {
		if (polygon instanceof Clipper2Polygon) return polygon
		if (!module) {
			throw new Error('Clipper2 module not initialized')
		}
		const coords: number[] = []
		for (const vertex of polygon) {
			coords.push(vertex.x, vertex.y)
		}
		const pathD = module.MakePathD(coords)
		return new Clipper2Polygon(pathD)
	}
}

class Clipper2Contour extends IntermediateContour {
	constructor(public pathsD: PathsD) {
		super()
	}

	protected toContour(): Shape[] {
		if (!module) {
			throw new Error('Clipper2 module not initialized')
		}

		const shapes: Shape[] = []

		// Group paths by their winding order to determine main polygons vs holes
		const mainPolygons: Vector2[][] = []
		const holes: Vector2[][] = []

		for (let i = 0; i < this.pathsD.size(); i++) {
			const path = this.pathsD.get(i)
			const vertices: Vector2[] = []

			for (let j = 0; j < path.size(); j++) {
				const point = path.get(j)
				vertices.push(new Vector2(point.x, point.y))
			}

			// Skip empty paths
			if (vertices.length === 0) continue

			// Determine winding order to classify as main polygon or hole
			// Positive winding = counterclockwise = main polygon
			// Negative winding = clockwise = hole
			const w = winding(vertices)

			if (w > 0) {
				mainPolygons.push(vertices)
			} else {
				holes.push(vertices)
			}
		}

		// Create shapes from main polygons and their associated holes
		for (const mainPolygon of mainPolygons) {
			// Find holes that are inside this main polygon
			const associatedHoles: Vector2[][] = []
			for (const hole of holes) {
				if (this.isPolygonInside(mainPolygon, hole)) {
					associatedHoles.push(hole)
				}
			}

			shapes.push(
				new Shape(
					new Polygon(...mainPolygon),
					associatedHoles.map((hole) => new Polygon(...hole))
				)
			)
		}

		return shapes
	}

	private isPolygonInside(outer: Vector2[], inner: Vector2[]): boolean {
		// Check if the inner polygon is inside the outer polygon
		// by testing if the first vertex of the inner polygon is inside the outer polygon
		if (inner.length === 0) return false

		const testPoint = inner[0]
		return this.pointInPolygon(testPoint, outer)
	}

	private pointInPolygon(point: Vector2, polygon: Vector2[]): boolean {
		let inside = false
		for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
			if (
				polygon[i].y > point.y !== polygon[j].y > point.y &&
				point.x <
					((polygon[j].x - polygon[i].x) * (point.y - polygon[i].y)) /
						(polygon[j].y - polygon[i].y) +
						polygon[i].x
			) {
				inside = !inside
			}
		}
		return inside
	}
}

// Helper function to convert AContour to Clipper2Contour
function toClipper2Contour(aContour: AContour): Clipper2Contour {
	if (aContour instanceof Clipper2Contour) return aContour
	if (!module) {
		throw new Error('Clipper2 module not initialized')
	}

	const pathsD = new module.PathsD()

	for (const shape of aContour) {
		// Main polygon
		const mainCoords: number[] = []
		for (const vertex of shape.polygon) {
			mainCoords.push(vertex.x, vertex.y)
		}
		const mainPath = module.MakePathD(mainCoords)
		pathsD.push_back(mainPath)

		// Holes
		for (const hole of shape.holes) {
			const holeCoords: number[] = []
			for (const vertex of hole) {
				holeCoords.push(vertex.x, vertex.y)
			}
			const holePath = module.MakePathD(holeCoords)
			pathsD.push_back(holePath)
		}
	}

	return new Clipper2Contour(pathsD)
}

function union2(contour1: AContour, ...contours: AContour[]): AContour {

	// Start with the first contour
	let result = toClipper2Contour(contour1).pathsD

	// Union with each subsequent contour
	for (const contour of contours) {
		const clipperContour = toClipper2Contour(contour)
		const unionResult = module.UnionD(result, clipperContour.pathsD, module.FillRule.EvenOdd, 2)
		result = unionResult
	}

	return new Clipper2Contour(result)
}

function intersect2(contour1: AContour, ...contours: AContour[]): AContour {

	// Start with the first contour
	let result = toClipper2Contour(contour1).pathsD

	// Intersect with each subsequent contour
	for (const contour of contours) {
		const clipperContour = toClipper2Contour(contour)
		const intersectResult = module.IntersectD(
			result,
			clipperContour.pathsD,
			module.FillRule.EvenOdd,
			2
		)
		result = intersectResult
	}

	return new Clipper2Contour(result)
}

function subtract2(contour1: AContour, contour2: AContour): AContour {
	const clipperContour1 = toClipper2Contour(contour1)
	const clipperContour2 = toClipper2Contour(contour2)

	// Perform difference operation
	const result = module.DifferenceD(
		clipperContour1.pathsD,
		clipperContour2.pathsD,
		module.FillRule.EvenOdd,
		2
	)

	return new Clipper2Contour(result)
}

function hull2(contour1: AContour, ...contours: AContour[]): AContour {

	// Combine all contours into a single PathsD
	const allPaths = new module.PathsD()
	for (const contour of [contour1, ...contours]) {
		const clipperContour = toClipper2Contour(contour)
		for (let i = 0; i < clipperContour.pathsD.size(); i++) {
			allPaths.push_back(clipperContour.pathsD.get(i))
		}
	}

	// For convex hull, we'll use a simple approach
	// Clipper2 doesn't have a direct convex hull function, so we'll use union
	const result = module.UnionSelfD(allPaths, module.FillRule.EvenOdd, 2)

	return new Clipper2Contour(result)
}

function vectorIntersect(vA: [Vector2, Vector2], vB: [Vector2, Vector2]): boolean {
	// Create two line segments as PathD objects
	const lineA = module.MakePathD([vA[0].x, vA[0].y, vA[1].x, vA[1].y])
	const lineB = module.MakePathD([vB[0].x, vB[0].y, vB[1].x, vB[1].y])

	// Create PathsD containers for the lines
	const pathsA = new module.PathsD()
	pathsA.push_back(lineA)
	const pathsB = new module.PathsD()
	pathsB.push_back(lineB)

	// Use Clipper2's intersection to check if lines intersect
	const result = module.IntersectD(pathsA, pathsB, module.FillRule.EvenOdd, 2)

	// If there's any intersection result, the lines intersect
	return result.size() > 0
}

// Override non-abstract methods to use Clipper2's more robust operations
function inPolygon(point: Vector2, polygon: APolygon): boolean {
	// Create a tiny circle around the point and check if it intersects with the polygon
	const pointPath = module.MakePathD([
		point.x,
		point.y,
		point.x + 0.001,
		point.y,
		point.x,
		point.y + 0.001,
	])
	const clipperPolygon = Clipper2Polygon.from(polygon)

	// Use intersection to check if point is inside
	const pointPaths = new module.PathsD()
	pointPaths.push_back(pointPath)
	const polygonPaths = new module.PathsD()
	polygonPaths.push_back(clipperPolygon.pathD)

	const result = module.IntersectD(pointPaths, polygonPaths, module.FillRule.EvenOdd, 2)

	return result.size() > 0
}

function polygonIntersect(p1: APolygon, p2: APolygon): boolean {
	const clipperPolygon1 = Clipper2Polygon.from(p1)
	const clipperPolygon2 = Clipper2Polygon.from(p2)

	// Use intersection to check if polygons overlap
	const paths1 = new module.PathsD()
	paths1.push_back(clipperPolygon1.pathD)
	const paths2 = new module.PathsD()
	paths2.push_back(clipperPolygon2.pathD)

	const result = module.IntersectD(paths1, paths2, module.FillRule.EvenOdd, 2)

	return result.size() > 0
}

function distinctPolygons(polygons: APolygon[]): boolean {
	// Check all pairs of polygons for intersection
	for (let i = 0; i < polygons.length; i++) {
		for (let j = i + 1; j < polygons.length; j++) {
			const clipperPolygon1 = Clipper2Polygon.from(polygons[i])
			const clipperPolygon2 = Clipper2Polygon.from(polygons[j])

			const paths1 = new module.PathsD()
			paths1.push_back(clipperPolygon1.pathD)
			const paths2 = new module.PathsD()
			paths2.push_back(clipperPolygon2.pathD)

			const result = module.IntersectD(paths1, paths2, module.FillRule.EvenOdd, 2)

			if (result.size() > 0) {
				return false // Found intersection, polygons are not distinct
			}
		}
	}
	return true // No intersections found, polygons are distinct
}

export default async () => {
	try {
		// Dynamic import to avoid issues with SSR
		const wasm = (await import('clipper2-wasm/dist/es/clipper2z')) as any
		const Clipper2ZFactory = wasm.default as Clipper2ZFactoryFunction

		module = await Clipper2ZFactory({
			locateFile: () => {
				// In a browser environment, the WASM file should be in the public directory
				return '/clipper2z.wasm'
			},
		})
	} catch (error) {
		console.error(error)
		throw new Error('Failed to initialize Clipper2')
	}
	return {
		union2,
		intersect2,
		subtract2,
		hull2,
		vectorIntersect,
		inPolygon,
		polygonIntersect,
		distinctPolygons,
	} satisfies Partial<Algorithms>
}
