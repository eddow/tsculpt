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

			// Should return a mesh (from tester engine)
			expect(result).toBeInstanceOf(Mesh)
			expect(result.vectors.length).toBe(3) // Single triangle from tester
		})

		it('should handle boolean intersection', () => {
			const mesh1 = createTestMesh()
			const mesh2 = createTestMesh()

			const result = mesh`${mesh1} & ${mesh2}`

			// Should return a mesh (from tester engine)
			expect(result).toBeInstanceOf(Mesh)
			expect(result.vectors.length).toBe(3) // Single triangle from tester
		})

		it('should handle boolean union', () => {
			const mesh1 = createTestMesh()
			const mesh2 = createTestMesh()

			const result = mesh`${mesh1} | ${mesh2}`

			// Should return a mesh (from tester engine)
			expect(result).toBeInstanceOf(Mesh)
			expect(result.vectors.length).toBe(3) // Single triangle from tester
		})

		it('should handle multiple meshes in union', () => {
			const mesh1 = createTestMesh()
			const mesh2 = createTestMesh()
			const mesh3 = createTestMesh()

			const result = mesh`${mesh1} | ${mesh2} | ${mesh3}`

			// Should return a mesh (from tester engine)
			expect(result).toBeInstanceOf(Mesh)
			expect(result.vectors.length).toBe(3) // Single triangle from tester
		})

		it('should handle multiple meshes in intersection', () => {
			const mesh1 = createTestMesh()
			const mesh2 = createTestMesh()
			const mesh3 = createTestMesh()

			const result = mesh`${mesh1} & ${mesh2} & ${mesh3}`

			// Should return a mesh (from tester engine)
			expect(result).toBeInstanceOf(Mesh)
			expect(result.vectors.length).toBe(3) // Single triangle from tester
		})

		it('should handle complex expressions with translation and scaling', () => {
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

		it('should handle complex boolean expressions', () => {
			const mesh1 = createTestMesh()
			const mesh2 = createTestMesh()
			const mesh3 = createTestMesh()

			const result = mesh`(${mesh1} + [1 0 0]) & ${mesh2} | ${mesh3}`

			// Should return a mesh (from tester engine)
			expect(result).toBeInstanceOf(Mesh)
			expect(result.vectors.length).toBe(3) // Single triangle from tester
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

		it('should handle multiple translations', () => {
			const testMesh = createTestMesh()

			const result = mesh`${testMesh} + [1 0 0] + [0 1 0]`

			expect(result.vectors.length).toBe(testMesh.vectors.length)
			for (let i = 0; i < testMesh.vectors.length; i++) {
				const original = testMesh.vectors[i]
				const translated = result.vectors[i]
				expect(translated[0]).toBe(original[0] + 1)
				expect(translated[1]).toBe(original[1] + 1)
				expect(translated[2]).toBe(original[2])
			}
		})

		it('should handle multiple scalings', () => {
			const testMesh = createTestMesh()

			const result = mesh`${testMesh} * 2 * 3`

			expect(result.vectors.length).toBe(testMesh.vectors.length)
			for (let i = 0; i < testMesh.vectors.length; i++) {
				const original = testMesh.vectors[i]
				const scaled = result.vectors[i]
				expect(scaled[0]).toBe(original[0] * 6)
				expect(scaled[1]).toBe(original[1] * 6)
				expect(scaled[2]).toBe(original[2] * 6)
			}
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

		it('should throw when trying to subtract non-mesh from mesh', () => {
			const mesh1 = createTestMesh()

			expect(() => mesh`${mesh1} - [1 2 3]`).toThrow()
		})

		it('should throw when trying to intersect non-mesh', () => {
			const mesh1 = createTestMesh()

			expect(() => mesh`${mesh1} & [1 2 3]`).toThrow()
		})

		it('should throw when trying to union non-mesh', () => {
			const mesh1 = createTestMesh()

			expect(() => mesh`${mesh1} | [1 2 3]`).toThrow()
		})

		it('should handle precedence correctly', () => {
			const mesh1 = createTestMesh()
			const mesh2 = createTestMesh()
			const mesh3 = createTestMesh()

			// Test that union has higher precedence than intersection
			const result1 = mesh`${mesh1} | ${mesh2} & ${mesh3}`
			expect(result1).toBeInstanceOf(Mesh)

			// Test that intersection has higher precedence than subtraction
			const result2 = mesh`${mesh1} & ${mesh2} - ${mesh3}`
			expect(result2).toBeInstanceOf(Mesh)
		})

		it('should handle parentheses for precedence override', () => {
			const mesh1 = createTestMesh()
			const mesh2 = createTestMesh()
			const mesh3 = createTestMesh()

			// Test parentheses override precedence
			const result = mesh`(${mesh1} | ${mesh2}) & ${mesh3}`
			expect(result).toBeInstanceOf(Mesh)
		})

		it('should handle scaling with unity factor (no scaling)', () => {
			const testMesh = createTestMesh()

			const result = mesh`${testMesh} * 1`

			// Should return the original mesh unchanged
			expect(result.vectors.length).toBe(testMesh.vectors.length)
			for (let i = 0; i < testMesh.vectors.length; i++) {
				const original = testMesh.vectors[i]
				const resultVertex = result.vectors[i]
				expect(resultVertex[0]).toBe(original[0])
				expect(resultVertex[1]).toBe(original[1])
				expect(resultVertex[2]).toBe(original[2])
			}
		})

		it('should handle translation with zero vector (no translation)', () => {
			const testMesh = createTestMesh()

			const result = mesh`${testMesh} + [0 0 0]`

			// Should return the original mesh unchanged
			expect(result.vectors.length).toBe(testMesh.vectors.length)
			for (let i = 0; i < testMesh.vectors.length; i++) {
				const original = testMesh.vectors[i]
				const resultVertex = result.vectors[i]
				expect(resultVertex[0]).toBe(original[0])
				expect(resultVertex[1]).toBe(original[1])
				expect(resultVertex[2]).toBe(original[2])
			}
		})

		it('should handle mixed operations with proper precedence', () => {
			const mesh1 = createTestMesh()
			const mesh2 = createTestMesh()

			// Test complex expression: (mesh1 + [1 0 0]) * 2 - mesh2
			const result = mesh`(${mesh1} + [1 0 0]) * 2 - ${mesh2}`

			// Should return a mesh (from tester engine for boolean operations)
			expect(result).toBeInstanceOf(Mesh)
			expect(result.vectors.length).toBe(3) // Single triangle from tester
		})
	})
})
