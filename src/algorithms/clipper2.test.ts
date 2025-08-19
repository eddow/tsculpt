import { Contour, Polygon, Shape } from '@tsculpt/types'
import { v2 } from '@tsculpt/types/builders'
import { beforeAll, describe, expect, it } from 'vitest'
import factory, { Clipper2Op2 } from './clipper2'

// Helper function to create a simple test contour
function createTestContour(): Contour {
	const vertices = [v2(0, 0), v2(1, 0), v2(0, 1)]
	const polygon = new Polygon(...vertices)
	const shape = new Shape(polygon)
	return new Contour(shape)
}

describe('Clipper2Engine', () => {
	let engine: Clipper2Op2
	beforeAll(async () => {
		engine = await factory()
	})
	it('should perform union operations', async () => {
		const contour1 = createTestContour()
		const contour2 = createTestContour()

		const result = await engine.union(contour1, contour2)

		expect(result).toBeInstanceOf(Contour)
		expect(result.flatPolygons.length).toBeGreaterThan(0)
	})

	it('should perform union operations with multiple contours', async () => {
		const contour1 = createTestContour()
		const contour2 = createTestContour()
		const contour3 = createTestContour()

		const result = await engine.union(contour1, contour2, contour3)

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

	it('should perform intersection operations with multiple contours', async () => {
		const contour1 = createTestContour()
		const contour2 = createTestContour()
		const contour3 = createTestContour()

		const result = await engine.intersect(contour1, contour2, contour3)

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

		const result = await engine.hull(contour1, contour2)

		expect(result).toBeInstanceOf(Contour)
		expect(result.flatPolygons.length).toBeGreaterThan(0)
	})

	it('should handle multiple contours in hull', async () => {
		const contour1 = createTestContour()
		const contour2 = createTestContour()
		const contour3 = createTestContour()

		const result = await engine.hull(contour1, contour2, contour3)

		expect(result).toBeInstanceOf(Contour)
		expect(result.flatPolygons.length).toBeGreaterThan(0)
	})

	it('should handle empty contours array in hull', async () => {
		const result = await engine.hull()

		expect(result).toBeInstanceOf(Contour)
		expect(result.flatPolygons.length).toBeGreaterThan(0)
	})

	it('should handle single contour in union', async () => {
		const contour1 = createTestContour()

		const result = await engine.union(contour1)

		expect(result).toBeInstanceOf(Contour)
		expect(result.flatPolygons.length).toBeGreaterThan(0)
	})

	it('should handle single contour in intersect', async () => {
		const contour1 = createTestContour()

		const result = await engine.intersect(contour1)

		expect(result).toBeInstanceOf(Contour)
		expect(result.flatPolygons.length).toBeGreaterThan(0)
	})

	it('should handle single contour in hull', async () => {
		const contour1 = createTestContour()

		const result = await engine.hull(contour1)

		expect(result).toBeInstanceOf(Contour)
		expect(result.flatPolygons.length).toBeGreaterThan(0)
	})

	it('should reproduce subtractionExample case - square minus circle', async () => {
		// Create a square contour (similar to square({ size: 1 }))
		const squareVertices = [v2(-0.5, -0.5), v2(0.5, -0.5), v2(0.5, 0.5), v2(-0.5, 0.5)]
		const squareContour = Contour.from(squareVertices)

		// Create a circle contour (similar to circle({ radius: 0.5 }))
		// Approximate circle with 32 segments
		const circleVertices: any[] = []
		for (let i = 0; i < 8; i++) {
			const angle = (i / 8) * 2 * Math.PI
			circleVertices.push(v2(Math.cos(angle) * 0.5, Math.sin(angle) * 0.5))
		}
		const circleContour = Contour.from(circleVertices)

		// Perform subtraction: square - circle
		const result = await engine.subtract(squareContour, circleContour)

		expect(result).toBeInstanceOf(Contour)
		expect(result.flatPolygons.length).toBeGreaterThan(0)
	})
})
