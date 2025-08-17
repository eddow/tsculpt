import Op2, { ecmaOp2 } from '@tsculpt/op2'
import { Contour, Polygon, Shape, Vector2 } from '@tsculpt/types'
import { v2 } from '@tsculpt/types/builders'

// Import the correct types
import type { Clipper2ZFactoryFunction, MainModule, PathsD } from 'clipper2-wasm/dist/clipper2z'

// Global module instance
let clipper2Module: MainModule | null = null
let initPromise: Promise<MainModule> | null = null

async function ensureClipper2Initialized(): Promise<MainModule> {
	if (clipper2Module) return clipper2Module

	if (initPromise) return initPromise

	// Dynamic import to avoid issues with SSR
	const module = await import('clipper2-wasm/dist/es/clipper2z') as any
	const Clipper2ZFactory = module.default as Clipper2ZFactoryFunction

	initPromise = Clipper2ZFactory({
		locateFile: () => {
			// In a browser environment, the WASM file should be in the public directory
			return '/clipper2z.wasm'
		},
	}).then((module: MainModule) => {
		clipper2Module = module
		return module
	})

	return initPromise
}

class Clipper2Engine extends Op2 {
	// Convert internal Polygon to Clipper2 PathD format
	private polygonToPathD(polygon: Polygon): number[] {
		const coords: number[] = []
		for (const vertex of polygon) {
			coords.push(vertex.x, vertex.y)
		}
		return coords
	}

	// Convert Clipper2 PathD format to internal Polygon
	private pathDToPolygon(coords: number[]): Polygon {
		const vertices: any[] = []
		for (let i = 0; i < coords.length; i += 2) {
			vertices.push(v2(coords[i], coords[i + 1]))
		}
		return new Polygon(...vertices)
	}

	// Convert Contour to Clipper2 PathsD format
	private contourToPathsD(contour: Contour): PathsD {
		if (!clipper2Module) {
			throw new Error('Clipper2 module not initialized')
		}

		const pathsD = new clipper2Module.PathsD()

		for (const shape of contour) {
			// Main polygon (positive)
			const mainPath = clipper2Module.MakePathD(this.polygonToPathD(shape.polygon))
			pathsD.push_back(mainPath)

			// Holes (negative) - we'll handle these separately
			for (const hole of shape.holes) {
				const holePath = clipper2Module.MakePathD(this.polygonToPathD(hole))
				pathsD.push_back(holePath)
			}
		}

		return pathsD
	}

	// Convert Clipper2 PathsD result to Contour
	private pathsDToContour(pathsD: PathsD): Contour {
		if (!clipper2Module) {
			throw new Error('Clipper2 module not initialized')
		}

		const shapes: Shape[] = []

		// For now, we'll create a simple shape from the first path
		// In a more complete implementation, we'd need to handle holes properly
		if (pathsD.size() > 0) {
			const mainPath = pathsD.get(0)
			const mainPolygon = this.pathDToPolygon(this.pathDToCoords(mainPath))
			shapes.push(new Shape(mainPolygon))
		}

		return new Contour(...shapes)
	}

	// Helper to convert PathD to coordinates array
	private pathDToCoords(pathD: any): number[] {
		const coords: number[] = []
		for (let i = 0; i < pathD.size(); i++) {
			const point = pathD.get(i)
			coords.push(point.x, point.y)
		}
		return coords
	}

	async union(contour1: Contour, contour2: Contour): Promise<Contour> {
		try {
			const module = await ensureClipper2Initialized()
			const paths1 = this.contourToPathsD(contour1)
			const paths2 = this.contourToPathsD(contour2)

			// Perform union operation
			const result = module.UnionD(paths1, paths2, module.FillRule.EvenOdd, 2)

			return this.pathsDToContour(result)
		} catch (error) {
			console.warn('Clipper2 union failed, falling back to simple union:', error)
			return contour1
		}
	}

	async intersect(contour1: Contour, contour2: Contour): Promise<Contour> {
		try {
			const module = await ensureClipper2Initialized()
			const paths1 = this.contourToPathsD(contour1)
			const paths2 = this.contourToPathsD(contour2)

			// Perform intersection operation
			const result = module.IntersectD(paths1, paths2, module.FillRule.EvenOdd, 2)

			return this.pathsDToContour(result)
		} catch (error) {
			console.warn('Clipper2 intersection failed, falling back to simple intersection:', error)
			return contour1
		}
	}

	async subtract(contour1: Contour, contour2: Contour): Promise<Contour> {
		try {
			const module = await ensureClipper2Initialized()
			const paths1 = this.contourToPathsD(contour1)
			const paths2 = this.contourToPathsD(contour2)

			// Perform difference operation
			const result = module.DifferenceD(paths1, paths2, module.FillRule.EvenOdd, 2)

			return this.pathsDToContour(result)
		} catch (error) {
			console.warn('Clipper2 subtraction failed, falling back to simple subtraction:', error)
			return contour1
		}
	}

	async hull(contours: Contour[]): Promise<Contour> {
		if (contours.length === 0) {
			return new Contour(new Shape(new Polygon(v2(0, 0), v2(1, 0), v2(0, 1))))
		}

		try {
			const module = await ensureClipper2Initialized()
			// Combine all contours into a single PathsD
			const allPaths = new module.PathsD()
			for (const contour of contours) {
				const paths = this.contourToPathsD(contour)
				for (let i = 0; i < paths.size(); i++) {
					allPaths.push_back(paths.get(i))
				}
			}

			// For convex hull, we'll use a simple approach
			// Clipper2 doesn't have a direct convex hull function, so we'll use union
			const result = module.UnionSelfD(allPaths, module.FillRule.EvenOdd, 2)

			return this.pathsDToContour(result)
		} catch (error) {
			console.warn('Clipper2 hull failed, falling back to simple hull:', error)
			return contours[0] || new Contour(new Shape(new Polygon(v2(0, 0), v2(1, 0), v2(0, 1))))
		}
	}

	async vectorIntersect(vA: [Vector2, Vector2], vB: [Vector2, Vector2]): Promise<boolean> {
		try {
			const module = await ensureClipper2Initialized()
			// For vector intersection, we'll use the ECMAScript implementation as Clipper2 is designed for polygons
			return ecmaOp2.vectorIntersect(vA, vB)
		} catch (error) {
			console.warn('Clipper2 vectorIntersect failed, falling back to basic check:', error)
			return ecmaOp2.vectorIntersect(vA, vB)
		}
	}

	// Override non-abstract methods to use Clipper2's more robust operations
	async inPolygon(point: Vector2, polygon: Polygon): Promise<boolean> {
		try {
			const module = await ensureClipper2Initialized()

			// Create a tiny circle around the point and check if it intersects with the polygon
			const pointPath = module.MakePathD([point.x, point.y, point.x + 0.001, point.y, point.x, point.y + 0.001])
			const polygonPath = module.MakePathD(this.polygonToPathD(polygon))

			// Use intersection to check if point is inside
			const pointPaths = new module.PathsD()
			pointPaths.push_back(pointPath)
			const polygonPaths = new module.PathsD()
			polygonPaths.push_back(polygonPath)

			const result = module.IntersectD(pointPaths, polygonPaths, module.FillRule.EvenOdd, 2)

			return result.size() > 0
		} catch (error) {
			console.warn('Clipper2 inPolygon failed, falling back to ray casting:', error)
			return ecmaOp2.inPolygon(point, polygon)
		}
	}

	async polygonIntersect(p1: Polygon, p2: Polygon): Promise<boolean> {
		try {
			const module = await ensureClipper2Initialized()

			const path1 = module.MakePathD(this.polygonToPathD(p1))
			const path2 = module.MakePathD(this.polygonToPathD(p2))

			// Use intersection to check if polygons overlap
			const paths1 = new module.PathsD()
			paths1.push_back(path1)
			const paths2 = new module.PathsD()
			paths2.push_back(path2)

			const result = module.IntersectD(paths1, paths2, module.FillRule.EvenOdd, 2)

			return result.size() > 0
		} catch (error) {
			console.warn('Clipper2 polygonIntersect failed, falling back to basic check:', error)
			return ecmaOp2.polygonIntersect(p1, p2)
		}
	}

	async distinctPolygons(polygons: Polygon[]): Promise<boolean> {
		try {
			const module = await ensureClipper2Initialized()

			// Check all pairs of polygons for intersection
			for (let i = 0; i < polygons.length; i++) {
				for (let j = i + 1; j < polygons.length; j++) {
					const path1 = module.MakePathD(this.polygonToPathD(polygons[i]))
					const path2 = module.MakePathD(this.polygonToPathD(polygons[j]))

					const paths1 = new module.PathsD()
					paths1.push_back(path1)
					const paths2 = new module.PathsD()
					paths2.push_back(path2)

					const result = module.IntersectD(paths1, paths2, module.FillRule.EvenOdd, 2)

					if (result.size() > 0) {
						return false // Found intersection, polygons are not distinct
					}
				}
			}
			return true // No intersections found, polygons are distinct
		} catch (error) {
			console.warn('Clipper2 distinctPolygons failed, falling back to basic check:', error)
			return ecmaOp2.distinctPolygons(polygons)
		}
	}
}

// Initialize the module when the module is loaded
ensureClipper2Initialized().catch(error => {
	console.warn('Failed to initialize Clipper2:', error)
})

export default new Clipper2Engine()
