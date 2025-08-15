import { describe, expect, it } from 'vitest'
import { circle, square } from '../contours'
import { linearExtrude, rotateExtrude } from '../extrusions'
import { Vector2 } from './bunches'
import { Contour } from './contour'

describe('Contour', () => {
	it('should create a contour from a circle', () => {
		const contour = circle({ radius: 2 })

		expect(contour).toBeInstanceOf(Contour)
		expect(contour.vectors.length).toBeGreaterThan(8)

		// All vertices should be Vector2 (no z component)
		expect(contour.vectors.every((v) => v instanceof Vector2)).toBe(true)
	})

	it('should create a contour from a square', () => {
		const contour = square({ size: 2 })

		expect(contour).toBeInstanceOf(Contour)
		expect(contour.vectors.length).toBe(4)

		// All vertices should be Vector2 (no z component)
		expect(contour.vectors.every((v) => v instanceof Vector2)).toBe(true)
	})

	it('should create a contour from polygon vertices', () => {
		const vertices = [new Vector2(0, 0), new Vector2(1, 0), new Vector2(1, 1), new Vector2(0, 1)]

		const contour = Contour.polygon(vertices)

		expect(contour).toBeInstanceOf(Contour)
		expect(contour.vectors.length).toBe(4)
		expect(contour.edges.length).toBe(4) // Square has 4 edges
	})

	it('should work with extrusion functions', () => {
		const contour = circle({ radius: 1 })

		// Should work without errors
		const extruded = linearExtrude(contour, { height: 2 })
		const rotated = rotateExtrude(contour, {})

		expect(extruded).toBeDefined()
		expect(rotated).toBeDefined()
	})
})
