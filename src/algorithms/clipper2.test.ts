import { Contour, Polygon, Shape } from '@tsculpt/types'
import { v2 } from '@tsculpt/types/builders'
import { beforeAll, describe, expect, it } from 'vitest'
import factory from './clipper2'
import { Resolved } from '@tsculpt/ts/maybe'

// Helper function to create a simple test contour
function createTestContour(): Contour {
	const vertices = [v2(0, 0), v2(1, 0), v2(0, 1)]
	const polygon = new Polygon(...vertices)
	const shape = new Shape(polygon)
	return new Contour(shape)
}

describe('Clipper2Engine', () => {
	let engine: Resolved<ReturnType<typeof factory>>
	beforeAll(async () => {
		engine = await factory()
	})
	it('should perform union operations', () => {
		const contour1 = createTestContour()
		const contour2 = createTestContour()

		const result = engine.union2(contour1, contour2)

		expect(result).toBeInstanceOf(Contour)
		expect(result.flatPolygons.length).toBeGreaterThan(0)
	})

	it('should perform union operations with multiple contours', () => {
		const contour1 = createTestContour()
		const contour2 = createTestContour()
		const contour3 = createTestContour()

		const result = engine.union2(contour1, contour2, contour3)

		expect(result).toBeInstanceOf(Contour)
		expect(result.flatPolygons.length).toBeGreaterThan(0)
	})

	it('should perform intersection operations', () => {
		const contour1 = createTestContour()
		const contour2 = createTestContour()

		const result = engine.intersect2(contour1, contour2)

		expect(result).toBeInstanceOf(Contour)
		expect(result.flatPolygons.length).toBeGreaterThan(0)
	})

	it('should perform intersection operations with multiple contours', () => {
		const contour1 = createTestContour()
		const contour2 = createTestContour()
		const contour3 = createTestContour()

		const result = engine.intersect2(contour1, contour2, contour3)

		expect(result).toBeInstanceOf(Contour)
		expect(result.flatPolygons.length).toBeGreaterThan(0)
	})

	it('should perform subtraction operations', () => {
		const contour1 = createTestContour()
		const contour2 = createTestContour()

		const result = engine.subtract2(contour1, contour2)

		expect(result).toBeInstanceOf(Contour)
		expect(result.flatPolygons.length).toBeGreaterThan(0)
	})

	it('should perform hull operations', () => {
		const contour1 = createTestContour()
		const contour2 = createTestContour()

		const result = engine.hull2(contour1, contour2)

		expect(result).toBeInstanceOf(Contour)
		expect(result.flatPolygons.length).toBeGreaterThan(0)
	})

	it('should handle multiple contours in hull', () => {
		const contour1 = createTestContour()
		const contour2 = createTestContour()
		const contour3 = createTestContour()

		const result = engine.hull2(contour1, contour2, contour3)

		expect(result).toBeInstanceOf(Contour)
		expect(result.flatPolygons.length).toBeGreaterThan(0)
	})

	it('should handle single contour in union', () => {
		const contour1 = createTestContour()

		const result = engine.union2(contour1)

		expect(result).toBeInstanceOf(Contour)
		expect(result.flatPolygons.length).toBeGreaterThan(0)
	})

	it('should handle single contour in intersect', () => {
		const contour1 = createTestContour()

		const result = engine.intersect2(contour1)

		expect(result).toBeInstanceOf(Contour)
		expect(result.flatPolygons.length).toBeGreaterThan(0)
	})

	it('should handle single contour in hull', () => {
		const contour1 = createTestContour()

		const result = engine.hull2(contour1)

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
		const result = engine.subtract2(squareContour, circleContour)

		expect(result).toBeInstanceOf(Contour)
		expect(result.flatPolygons.length).toBeGreaterThan(0)
	})
})
