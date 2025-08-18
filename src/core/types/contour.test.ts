import { describe, expect, it } from 'vitest'
import { circle, square } from '../shapes'
import { v2 } from './builders'
import { Vector2 } from './bunches'
import { Contour, Polygon, Shape } from './contour'

describe('Contour', () => {
	it('should create a shape from a circle', () => {
		const contour = circle({ radius: 2 })

		expect(contour).toBeInstanceOf(Contour)
		expect(contour.length).toBe(1) // One shape
		expect(contour[0]).toBeInstanceOf(Shape)
		expect(contour[0].polygon).toBeInstanceOf(Polygon)
		expect(contour[0].polygon.length).toBeGreaterThan(8) // Circle has many vertices
		expect(contour[0].polygon.every((v) => v instanceof Vector2)).toBe(true)
		expect(contour[0].holes).toEqual([]) // Circle has no holes
	})

	it('should create a shape from a square', () => {
		const contour = square({ size: 2 })

		expect(contour).toBeInstanceOf(Contour)
		expect(contour.length).toBe(1) // One shape
		expect(contour[0]).toBeInstanceOf(Shape)
		expect(contour[0].polygon).toBeInstanceOf(Polygon)
		expect(contour[0].polygon.length).toBe(4) // Square has 4 vertices
		expect(contour[0].polygon.every((v) => v instanceof Vector2)).toBe(true)
		expect(contour[0].holes).toEqual([]) // Square has no holes
	})

	it('should create contour from polygon', () => {
		const polygon = new Polygon(v2(0, 0), v2(1, 0), v2(1, 1), v2(0, 1))
		const contour = Contour.from(polygon)

		expect(contour).toBeInstanceOf(Contour)
		expect(contour.length).toBe(1)
		expect(contour[0]).toBeInstanceOf(Shape)
		expect(contour[0].polygon).toBe(polygon)
		expect(contour[0].holes).toEqual([])
	})

	it('should create contour from vertices', () => {
		const vertices = [v2(0, 0), v2(1, 0), v2(1, 1), v2(0, 1)]
		const contour = Contour.from(vertices)

		expect(contour).toBeInstanceOf(Contour)
		expect(contour.length).toBe(1)
		expect(contour[0]).toBeInstanceOf(Shape)
		expect(contour[0].polygon).toBeInstanceOf(Polygon)
		expect(contour[0].polygon.length).toBe(4)
		expect(contour[0].holes).toEqual([])
	})

	it('should map vertices through transformation function', () => {
		const contour = square({ size: 2 })
		const transformed = contour.mapVertex((v) => v2(v.x * 2, v.y * 2))

		expect(transformed).toBeInstanceOf(Contour)
		expect(transformed.length).toBe(1)
		expect(transformed[0]).toBeInstanceOf(Shape)
		expect(transformed[0].polygon).toBeInstanceOf(Polygon)

		// Check that vertices were transformed
		const originalVertices = contour[0].polygon
		const transformedVertices = transformed[0].polygon
		expect(transformedVertices.length).toBe(originalVertices.length)

		for (let i = 0; i < originalVertices.length; i++) {
			expect(transformedVertices[i].x).toBe(originalVertices[i].x * 2)
			expect(transformedVertices[i].y).toBe(originalVertices[i].y * 2)
		}
	})

	it('should return flat polygons for extrusion', () => {
		const contour = square({ size: 2 })
		const flatPolygons = contour.flatPolygons

		expect(flatPolygons).toBeInstanceOf(Array)
		expect(flatPolygons.length).toBe(1) // One polygon, no holes
		expect(flatPolygons[0]).toBeInstanceOf(Polygon)
		expect(flatPolygons[0]).toBe(contour[0].polygon)
	})

	it('should handle contour with multiple shapes', () => {
		const polygon1 = new Polygon(v2(0, 0), v2(1, 0), v2(1, 1), v2(0, 1))
		const polygon2 = new Polygon(v2(10, 10), v2(11, 10), v2(11, 11), v2(10, 11))
		const shape1 = new Shape(polygon1)
		const shape2 = new Shape(polygon2)
		const contour = new Contour(shape1, shape2)

		expect(contour.length).toBe(2)
		expect(contour[0]).toBe(shape1)
		expect(contour[1]).toBe(shape2)
		expect(contour.flatPolygons.length).toBe(2)
		expect(contour.flatPolygons[0]).toBe(polygon1)
		expect(contour.flatPolygons[1]).toBe(polygon2)
	})

	it('should handle shapes with holes in flatPolygons', () => {
		const mainPolygon = new Polygon(v2(0, 0), v2(3, 0), v2(3, 3), v2(0, 3))
		const hole = new Polygon(v2(1, 1), v2(2, 1), v2(2, 2), v2(1, 2))
		const shape = new Shape(mainPolygon, [hole])
		const contour = new Contour(shape)

		const flatPolygons = contour.flatPolygons
		expect(flatPolygons.length).toBe(2) // Main polygon + 1 hole
		expect(flatPolygons[0]).toBe(mainPolygon)
		expect(flatPolygons[1]).toBe(hole)
	})
})

describe('Shape', () => {
	it('should create shape with polygon and holes', () => {
		const polygon = new Polygon(v2(0, 0), v2(3, 0), v2(3, 3), v2(0, 3))
		const hole = new Polygon(v2(1, 1), v2(2, 1), v2(2, 2), v2(1, 2))
		const shape = new Shape(polygon, [hole])

		expect(shape.polygon).toBe(polygon)
		expect(shape.holes).toEqual([hole])
	})

	it('should create shape with only polygon', () => {
		const polygon = new Polygon(v2(0, 0), v2(1, 0), v2(1, 1), v2(0, 1))
		const shape = new Shape(polygon)

		expect(shape.polygon).toBe(polygon)
		expect(shape.holes).toEqual([])
	})

	it('should map vertices through transformation function', () => {
		const polygon = new Polygon(v2(0, 0), v2(1, 0), v2(1, 1), v2(0, 1))
		const hole = new Polygon(v2(0.25, 0.25), v2(0.75, 0.25), v2(0.75, 0.75), v2(0.25, 0.75))
		const shape = new Shape(polygon, [hole])
		const transformed = shape.mapVertex((v) => v2(v.x * 2, v.y * 2))

		expect(transformed).toBeInstanceOf(Shape)
		expect(transformed.polygon).toBeInstanceOf(Polygon)
		expect(transformed.holes.length).toBe(1)
		expect(transformed.holes[0]).toBeInstanceOf(Polygon)

		// Check main polygon transformation
		expect(transformed.polygon.length).toBe(4)
		expect(transformed.polygon[0].x).toBe(0)
		expect(transformed.polygon[0].y).toBe(0)
		expect(transformed.polygon[1].x).toBe(2)
		expect(transformed.polygon[1].y).toBe(0)

		// Check hole transformation
		expect(transformed.holes[0].length).toBe(4)
		expect(transformed.holes[0][0].x).toBe(0.5)
		expect(transformed.holes[0][0].y).toBe(0.5)
	})

	it('should triangulate shape without holes', () => {
		const polygon = new Polygon(v2(0, 0), v2(1, 0), v2(1, 1), v2(0, 1))
		const shape = new Shape(polygon)
		const surface = shape.triangulate()

		expect(surface).toBeInstanceOf(Array)
		expect(surface.length).toBe(2) // Square should triangulate to 2 triangles
		expect(surface[0]).toHaveLength(3) // Each triangle has 3 vertices
		expect(surface[1]).toHaveLength(3)
		expect(surface[0].every((v) => v instanceof Vector2)).toBe(true)
		expect(surface[1].every((v) => v instanceof Vector2)).toBe(true)
	})

	it('should triangulate shape with holes', () => {
		const polygon = new Polygon(v2(0, 0), v2(3, 0), v2(3, 3), v2(0, 3))
		const hole = new Polygon(v2(1, 1), v2(2, 1), v2(2, 2), v2(1, 2))
		const shape = new Shape(polygon, [hole])
		const surface = shape.triangulate()

		expect(surface).toBeInstanceOf(Array)
		expect(surface.length).toBeGreaterThan(0) // Should have triangles
		expect(surface.every((triangle) => triangle.length === 3)).toBe(true)
		expect(surface.every((triangle) => triangle.every((v) => v instanceof Vector2))).toBe(true)
	})
})
