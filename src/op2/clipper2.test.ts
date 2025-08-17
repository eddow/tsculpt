import { describe, expect, it } from 'vitest'
import { Contour, Polygon, Shape } from '@tsculpt/types'
import { v2 } from '@tsculpt/types/builders'
import engine from './clipper2'

// Helper function to create a simple test contour
function createTestContour(): Contour {
	const vertices = [v2(0, 0), v2(1, 0), v2(0, 1)]
	const polygon = new Polygon(...vertices)
	const shape = new Shape(polygon)
	return new Contour(shape)
}

describe('Clipper2Engine', () => {
	it('should perform union operations', async () => {
		const contour1 = createTestContour()
		const contour2 = createTestContour()

		const result = await engine.union(contour1, contour2)

		expect(result).toBeInstanceOf(Contour)
		expect(result.flatPolygons.length).toBeGreaterThan(0)
	})

	it('should perform intersection operations', async () => {
		const contour1 = createTestContour()
		const contour2 = createTestContour()

		const result = await engine.intersect(contour1, contour2)

		expect(result).toBeInstanceOf(Contour)
		expect(result.flatPolygons.length).toBeGreaterThan(0)
	})

	it('should perform subtraction operations', async () => {
		const contour1 = createTestContour()
		const contour2 = createTestContour()

		const result = await engine.subtract(contour1, contour2)

		expect(result).toBeInstanceOf(Contour)
		expect(result.flatPolygons.length).toBeGreaterThan(0)
	})

	it('should perform hull operations', async () => {
		const contour1 = createTestContour()
		const contour2 = createTestContour()

		const result = await engine.hull([contour1, contour2])

		expect(result).toBeInstanceOf(Contour)
		expect(result.flatPolygons.length).toBeGreaterThan(0)
	})

	it('should handle multiple contours in hull', async () => {
		const contour1 = createTestContour()
		const contour2 = createTestContour()
		const contour3 = createTestContour()

		const result = await engine.hull([contour1, contour2, contour3])

		expect(result).toBeInstanceOf(Contour)
		expect(result.flatPolygons.length).toBeGreaterThan(0)
	})

	it('should handle empty contours array in hull', async () => {
		const result = await engine.hull([])

		expect(result).toBeInstanceOf(Contour)
		expect(result.flatPolygons.length).toBeGreaterThan(0)
	})
})
