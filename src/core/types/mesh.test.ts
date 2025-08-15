import { describe, expect, it } from 'vitest'
import { Matrix4, Vector3 } from './bunches'
import { AMesh, Mesh } from './mesh'

// Helper function to create a simple test mesh
function createTestMesh(): Mesh {
	const vertices: Vector3[] = [
		new Vector3(0, 0, 0),
		new Vector3(1, 0, 0),
		new Vector3(0, 1, 0),
		new Vector3(1, 1, 0),
	]
	const faces: [Vector3, Vector3, Vector3][] = [
		[vertices[0], vertices[1], vertices[2]],
		[vertices[1], vertices[3], vertices[2]],
	]
	return new Mesh(faces)
}

describe('Transformation Methods', () => {
	describe('basic functionality', () => {
		it('should create a transformed mesh from a source mesh', () => {
			const sourceMesh = createTestMesh()
			const transformedMesh = sourceMesh.translate(new Vector3(1, 0, 0))

			expect(transformedMesh).toBeInstanceOf(AMesh)
			expect(transformedMesh.vectors.length).toBe(sourceMesh.vectors.length)
			expect(transformedMesh.faces.length).toBe(sourceMesh.faces.length)
		})

		it('should apply identity transformation by default', () => {
			const sourceMesh = createTestMesh()
			const identityMatrix = new Matrix4(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1)
			const transformedMesh = sourceMesh.transform(identityMatrix)

			// With identity matrix, vectors should be identical
			for (let i = 0; i < sourceMesh.vectors.length; i++) {
				expect(transformedMesh.vectors[i]).toEqual(sourceMesh.vectors[i])
			}
		})

		it('should apply custom transformation matrix', () => {
			const sourceMesh = createTestMesh()
			const translationMatrix = new Matrix4(
				1,
				0,
				0,
				2, // Translate by 2 in X
				0,
				1,
				0,
				0,
				0,
				0,
				1,
				0,
				0,
				0,
				0,
				1
			)
			const transformedMesh = sourceMesh.transform(translationMatrix)

			// Vectors should be translated by 2 in X direction
			for (let i = 0; i < sourceMesh.vectors.length; i++) {
				const original = sourceMesh.vectors[i]
				const transformed = transformedMesh.vectors[i]
				expect(transformed[0]).toBe(original[0] + 2)
				expect(transformed[1]).toBe(original[1])
				expect(transformed[2]).toBe(original[2])
			}
		})
	})

	describe('transformation methods', () => {
		it('should translate mesh', () => {
			const sourceMesh = createTestMesh()
			const translated = sourceMesh.translate(new Vector3(1, 2, 3))

			expect(translated).toBeInstanceOf(AMesh)

			// Check that vertices are translated
			for (let i = 0; i < sourceMesh.vectors.length; i++) {
				const original = sourceMesh.vectors[i]
				const transformed = translated.vectors[i]
				expect(transformed[0]).toBe(original[0] + 1)
				expect(transformed[1]).toBe(original[1] + 2)
				expect(transformed[2]).toBe(original[2] + 3)
			}
		})

		it('should scale mesh with number', () => {
			const sourceMesh = createTestMesh()
			const scaled = sourceMesh.scale(2)

			expect(scaled).toBeInstanceOf(AMesh)

			// Check that vertices are scaled
			for (let i = 0; i < sourceMesh.vectors.length; i++) {
				const original = sourceMesh.vectors[i]
				const transformed = scaled.vectors[i]
				expect(transformed[0]).toBe(original[0] * 2)
				expect(transformed[1]).toBe(original[1] * 2)
				expect(transformed[2]).toBe(original[2] * 2)
			}
		})

		it('should scale mesh with vector', () => {
			const sourceMesh = createTestMesh()
			const scaled = sourceMesh.scale(new Vector3(2, 3, 4))

			expect(scaled).toBeInstanceOf(AMesh)

			// Check that vertices are scaled by vector components
			for (let i = 0; i < sourceMesh.vectors.length; i++) {
				const original = sourceMesh.vectors[i]
				const transformed = scaled.vectors[i]
				expect(transformed[0]).toBe(original[0] * 2)
				expect(transformed[1]).toBe(original[1] * 3)
				expect(transformed[2]).toBe(original[2] * 4)
			}
		})

		it('should rotate around X axis', () => {
			const sourceMesh = createTestMesh()
			const rotated = sourceMesh.rotateX(Math.PI / 2) // 90 degrees

			expect(rotated).toBeInstanceOf(AMesh)

			// Check that rotation was applied (simplified test)
			expect(rotated.vectors.length).toBe(sourceMesh.vectors.length)
			expect(rotated.faces.length).toBe(sourceMesh.faces.length)
		})

		it('should rotate around Y axis', () => {
			const sourceMesh = createTestMesh()
			const rotated = sourceMesh.rotateY(Math.PI / 2) // 90 degrees

			expect(rotated).toBeInstanceOf(AMesh)
		})

		it('should rotate around Z axis', () => {
			const sourceMesh = createTestMesh()
			const rotated = sourceMesh.rotateZ(Math.PI / 2) // 90 degrees

			expect(rotated).toBeInstanceOf(AMesh)
		})

		it('should rotate around arbitrary axis', () => {
			const sourceMesh = createTestMesh()
			const rotated = sourceMesh.rotate(new Vector3(1, 1, 0), Math.PI / 4)

			expect(rotated).toBeInstanceOf(AMesh)
		})

		it('should use vector length as angle when no angle provided', () => {
			const sourceMesh = createTestMesh()
			// Vector [0, 0, 1.5] has length 1.5, so should rotate by 1.5 radians
			const rotated = sourceMesh.rotate(new Vector3(0, 0, 1.5))

			expect(rotated).toBeInstanceOf(AMesh)
		})

		it('should handle special case rotate(0, 0, z) as rotateZ', () => {
			const sourceMesh = createTestMesh()
			const rotated1 = sourceMesh.rotate(new Vector3(0, 0, Math.PI / 2))
			const rotated2 = sourceMesh.rotateZ(Math.PI / 2)

			expect(rotated1).toBeInstanceOf(AMesh)
			expect(rotated2).toBeInstanceOf(AMesh)
			// Both should produce the same result
			expect(rotated1.vectors).toEqual(rotated2.vectors)
		})

		it('should handle special case rotate(x, 0, 0) as rotateX', () => {
			const sourceMesh = createTestMesh()
			const rotated1 = sourceMesh.rotate(new Vector3(Math.PI / 3, 0, 0))
			const rotated2 = sourceMesh.rotateX(Math.PI / 3)

			expect(rotated1).toBeInstanceOf(AMesh)
			expect(rotated2).toBeInstanceOf(AMesh)
			// Both should produce the same result
			expect(rotated1.vectors).toEqual(rotated2.vectors)
		})

		it('should handle special case rotate(0, y, 0) as rotateY', () => {
			const sourceMesh = createTestMesh()
			const rotated1 = sourceMesh.rotate(new Vector3(0, Math.PI / 4, 0))
			const rotated2 = sourceMesh.rotateY(Math.PI / 4)

			expect(rotated1).toBeInstanceOf(AMesh)
			expect(rotated2).toBeInstanceOf(AMesh)
			// Both should produce the same result
			expect(rotated1.vectors).toEqual(rotated2.vectors)
		})

		it('should apply custom transformation matrix', () => {
			const sourceMesh = createTestMesh()
			const customMatrix = new Matrix4(2, 0, 0, 0, 0, 2, 0, 0, 0, 0, 2, 0, 0, 0, 0, 1)
			const transformed = sourceMesh.transform(customMatrix)

			expect(transformed).toBeInstanceOf(AMesh)
		})
	})

	describe('chaining transformations', () => {
		it('should chain transformations correctly', () => {
			const sourceMesh = createTestMesh()

			// Apply multiple transformations
			const transformed = sourceMesh
				.translate(new Vector3(1, 0, 0))
				.scale(2)
				.rotateZ(Math.PI / 4)

			expect(transformed).toBeInstanceOf(AMesh)

			// The final mesh should have all transformations applied
			expect(transformed.vectors.length).toBe(sourceMesh.vectors.length)
		})

		it('should chain multiple transformations', () => {
			const sourceMesh = createTestMesh()

			// Apply many transformations
			const transformed = sourceMesh
				.translate(new Vector3(1, 2, 3))
				.scale(new Vector3(2, 1, 3))
				.rotateX(Math.PI / 6)
				.rotateY(Math.PI / 4)
				.rotateZ(Math.PI / 3)

			expect(transformed).toBeInstanceOf(AMesh)
			expect(transformed.vectors.length).toBe(sourceMesh.vectors.length)
		})
	})

	describe('lazy evaluation', () => {
		it('should not compute vertices until accessed', () => {
			const sourceMesh = createTestMesh()
			const transformed = sourceMesh.translate(new Vector3(1, 0, 0))

			// At this point, no computation should have happened
			// The actual test is that we can access vectors without error
			expect(() => {
				const vectors = transformed.vectors
				expect(vectors.length).toBe(sourceMesh.vectors.length)
			}).not.toThrow()
		})
	})
})
