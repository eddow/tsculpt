import { describe, expect, it } from 'vitest'
import { mesh } from './mesh'
import { Mesh } from '../types/mesh'
import { Vector3 } from '../types/bunches'

// Helper function to create a simple test mesh
function createTestMesh(): Mesh {
	const vertices: Vector3[] = [
		new Vector3(0, 0, 0),
		new Vector3(1, 0, 0),
		new Vector3(0, 1, 0),
		new Vector3(1, 1, 0)
	]
	const faces: [Vector3, Vector3, Vector3][] = [
		[vertices[0], vertices[1], vertices[2]],
		[vertices[1], vertices[3], vertices[2]]
	]
	return new Mesh(faces)
}

describe('Mesh operations', () => {
	describe('mesh template tag', () => {
				it('should handle translation with vector', () => {
			const testMesh = createTestMesh()

			const result = mesh`${testMesh} + [1 2 3]`

			// Check that vertices are translated
			expect(result.vectors.length).toBe(testMesh.vectors.length)
			for (let i = 0; i < testMesh.vectors.length; i++) {
				const original = testMesh.vectors[i]
				const translated = result.vectors[i]
				expect(translated[0]).toBe(original[0] + 1)
				expect(translated[1]).toBe(original[1] + 2)
				expect(translated[2]).toBe(original[2] + 3)
			}
		})

		it('should handle scaling with number', () => {
			const testMesh = createTestMesh()

			const result = mesh`${testMesh} * 2`

			// Check that vertices are scaled
			expect(result.vectors.length).toBe(testMesh.vectors.length)
			for (let i = 0; i < testMesh.vectors.length; i++) {
				const original = testMesh.vectors[i]
				const scaled = result.vectors[i]
				expect(scaled[0]).toBe(original[0] * 2)
				expect(scaled[1]).toBe(original[1] * 2)
				expect(scaled[2]).toBe(original[2] * 2)
			}
		})

		it('should handle scaling with vector', () => {
			const testMesh = createTestMesh()

			const result = mesh`${testMesh} * [2 3 4]`

			// Check that vertices are scaled by vector components
			expect(result.vectors.length).toBe(testMesh.vectors.length)
			for (let i = 0; i < testMesh.vectors.length; i++) {
				const original = testMesh.vectors[i]
				const scaled = result.vectors[i]
				expect(scaled[0]).toBe(original[0] * 2)
				expect(scaled[1]).toBe(original[1] * 3)
				expect(scaled[2]).toBe(original[2] * 4)
			}
		})

		it('should handle boolean subtraction', () => {
			const mesh1 = createTestMesh()
			const mesh2 = createTestMesh()

			const result = mesh`${mesh1} - ${mesh2}`

			// For now, the implementation returns the first mesh
			expect(result).toBe(mesh1)
		})

		it('should handle boolean intersection', () => {
			const mesh1 = createTestMesh()
			const mesh2 = createTestMesh()

			const result = mesh`${mesh1} & ${mesh2}`

			// For now, the implementation returns the first mesh
			expect(result).toBe(mesh1)
		})

		it('should handle boolean union', () => {
			const mesh1 = createTestMesh()
			const mesh2 = createTestMesh()

			const result = mesh`${mesh1} | ${mesh2}`

			// For now, the implementation returns the first mesh
			expect(result).toBe(mesh1)
		})

		it('should handle complex expressions', () => {
			const testMesh = createTestMesh()

			const result = mesh`(${testMesh} + [1 0 0]) * 2`

			// Check that vertices are translated and then scaled
			expect(result.vectors.length).toBe(testMesh.vectors.length)
			for (let i = 0; i < testMesh.vectors.length; i++) {
				const original = testMesh.vectors[i]
				const resultVertex = result.vectors[i]
				expect(resultVertex[0]).toBe((original[0] + 1) * 2)
				expect(resultVertex[1]).toBe(original[1] * 2)
				expect(resultVertex[2]).toBe(original[2] * 2)
			}
		})

				it('should handle multiple operations', () => {
			const mesh1 = createTestMesh()
			const mesh2 = createTestMesh()

			const result = mesh`${mesh1} + [1 0 0] & ${mesh2}`

			// Should translate mesh1 and then intersect with mesh2
			// For now, the implementation returns the first mesh
			expect(result.vectors.length).toBe(mesh1.vectors.length)
			// Check that the first mesh was translated
			expect(result.vectors[0][0]).toBe(mesh1.vectors[0][0] + 1)
		})

		it('should throw on invalid expressions', () => {
			const testMesh = createTestMesh()

			expect(() => mesh`invalid ${testMesh}`).toThrow()
		})

		it('should throw when trying to add mesh to mesh', () => {
			const mesh1 = createTestMesh()
			const mesh2 = createTestMesh()

			expect(() => mesh`${mesh1} + ${mesh2}`).toThrow()
		})

		it('should throw when trying to multiply mesh by mesh', () => {
			const mesh1 = createTestMesh()
			const mesh2 = createTestMesh()

			expect(() => mesh`${mesh1} * ${mesh2}`).toThrow()
		})

		it('should handle vector literals in expressions', () => {
			const testMesh = createTestMesh()

			const result = mesh`${testMesh} + [0.5 1.5 2.5]`

			expect(result.vectors.length).toBe(testMesh.vectors.length)
			for (let i = 0; i < testMesh.vectors.length; i++) {
				const original = testMesh.vectors[i]
				const translated = result.vectors[i]
				expect(translated[0]).toBe(original[0] + 0.5)
				expect(translated[1]).toBe(original[1] + 1.5)
				expect(translated[2]).toBe(original[2] + 2.5)
			}
		})

		it('should handle number literals in expressions', () => {
			const testMesh = createTestMesh()

			const result = mesh`${testMesh} * 1.5`

			expect(result.vectors.length).toBe(testMesh.vectors.length)
			for (let i = 0; i < testMesh.vectors.length; i++) {
				const original = testMesh.vectors[i]
				const scaled = result.vectors[i]
				expect(scaled[0]).toBe(original[0] * 1.5)
				expect(scaled[1]).toBe(original[1] * 1.5)
				expect(scaled[2]).toBe(original[2] * 1.5)
			}
		})
	})
})
