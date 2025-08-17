import { Contour, Polygon, Shape, Vector2 } from '@tsculpt/types'
import { v2 } from '@tsculpt/types/builders'
import { beforeEach, describe, expect, it } from 'vitest'
import engine from './tester'

// Helper function to create a simple test contour
function createTestContour(): Contour {
	const vertices: Vector2[] = [v2(0, 0), v2(1, 0), v2(0, 1)]
	const polygon = new Polygon(...vertices)
	const shape = new Shape(polygon)
	return new Contour(shape)
}

describe('Op2TesterEngine', () => {
	beforeEach(() => {
		engine.resetOperationCount()
	})

	it('should perform union operations', () => {
		const contour1 = createTestContour()
		const contour2 = createTestContour()

		const result = engine.union(contour1, contour2)

		expect(result).toBeInstanceOf(Contour)
		expect(result.flatPolygons.length).toBeGreaterThan(0)
		expect(engine.getOperationCount()).toBe(1)
	})

	it('should perform intersection operations', () => {
		const contour1 = createTestContour()
		const contour2 = createTestContour()

		const result = engine.intersect(contour1, contour2)

		expect(result).toBeInstanceOf(Contour)
		expect(result.flatPolygons.length).toBeGreaterThan(0)
		expect(engine.getOperationCount()).toBe(1)
	})

	it('should perform subtraction operations', () => {
		const contour1 = createTestContour()
		const contour2 = createTestContour()

		const result = engine.subtract(contour1, contour2)

		expect(result).toBeInstanceOf(Contour)
		expect(result.flatPolygons.length).toBeGreaterThan(0)
		expect(engine.getOperationCount()).toBe(1)
	})

	it('should perform hull operations', () => {
		const contour1 = createTestContour()
		const contour2 = createTestContour()

		const result = engine.hull([contour1, contour2])

		expect(result).toBeInstanceOf(Contour)
		expect(result.flatPolygons.length).toBeGreaterThan(0)
		expect(engine.getOperationCount()).toBe(1)
	})

	it('should handle multiple contours in hull', () => {
		const contour1 = createTestContour()
		const contour2 = createTestContour()
		const contour3 = createTestContour()

		const result = engine.hull([contour1, contour2, contour3])

		expect(result).toBeInstanceOf(Contour)
		expect(result.flatPolygons.length).toBeGreaterThan(0)
		expect(engine.getOperationCount()).toBe(1)
	})

	it('should track operation count correctly', () => {
		const contour1 = createTestContour()
		const contour2 = createTestContour()

		expect(engine.getOperationCount()).toBe(0)

		engine.union(contour1, contour2)
		expect(engine.getOperationCount()).toBe(1)

		engine.intersect(contour1, contour2)
		expect(engine.getOperationCount()).toBe(2)

		engine.subtract(contour1, contour2)
		expect(engine.getOperationCount()).toBe(3)

		engine.hull([contour1, contour2])
		expect(engine.getOperationCount()).toBe(4)
	})

	it('should reset operation count', () => {
		const contour1 = createTestContour()
		const contour2 = createTestContour()

		engine.union(contour1, contour2)
		expect(engine.getOperationCount()).toBe(1)

		engine.resetOperationCount()
		expect(engine.getOperationCount()).toBe(0)
	})

	it('should return fake contours with descriptive IDs', () => {
		const contour1 = createTestContour()
		const contour2 = createTestContour()

		const unionResult = engine.union(contour1, contour2) as any
		expect(unionResult.id).toContain('union')
		expect(unionResult.id).toContain('contour1_contour2')

		const hullResult = engine.hull([contour1, contour2]) as any
		expect(hullResult.id).toContain('hull')
		expect(hullResult.id).toContain('2_contours')
	})
})
