import { epsilon } from '@tsculpt/math'
import { describe, expect, it } from 'vitest'
import { v3 } from '../types/builders'
import { v2 } from '../types/builders'
import { Vector3 } from '../types/bunches'
import { AContour, Contour, Polygon, Shape } from '../types/contour'
import { AMesh, Mesh } from '../types/mesh'
import { contour, mesh, vector } from './linear'

// Helper function to create a simple test mesh
function createTestMesh(): Mesh {
	const vertices: Vector3[] = [v3(0, 0, 0), v3(1, 0, 0), v3(0, 1, 0), v3(1, 1, 0)]
	const faces: [Vector3, Vector3, Vector3][] = [
		[vertices[0], vertices[1], vertices[2]],
		[vertices[1], vertices[3], vertices[2]],
	]
	return new Mesh(faces)
}

// Helper function to create a simple test contour
function createTestContour(): Contour {
	const vertices = [v2(0, 0), v2(1, 0), v2(0, 1)]
	const polygon = new Polygon(...vertices)
	const shape = new Shape(polygon)
	return new Contour(shape)
}

describe('Mesh operations', () => {
	describe('mesh template tag', () => {
		it('should handle translation with vector', async () => {
			const testMesh = createTestMesh()

			const result = await mesh`${testMesh} + (1, 2, 3)`

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

		it('should handle scaling with number', async () => {
			const testMesh = createTestMesh()

			const result = await mesh`${testMesh} * 2`

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

		it('should handle scaling with vector', async () => {
			const testMesh = createTestMesh()

			const result = await mesh`${testMesh} * (2, 3, 4)`

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

		it('should handle boolean subtraction', async () => {
			const mesh1 = createTestMesh()
			const mesh2 = createTestMesh()

			const result = await mesh`${mesh1} - ${mesh2}`

			// Should return a mesh (from tester engine)
			expect(result).toBeInstanceOf(AMesh)
			expect(result.vectors.length).toBe(3) // Single triangle from tester
		})

		it('should handle boolean intersection', async () => {
			const mesh1 = createTestMesh()
			const mesh2 = createTestMesh()

			const result = await mesh`${mesh1} & ${mesh2}`

			// Should return a mesh (from tester engine)
			expect(result).toBeInstanceOf(AMesh)
			expect(result.vectors.length).toBe(3) // Single triangle from tester
		})

		it('should handle boolean union', async () => {
			const mesh1 = createTestMesh()
			const mesh2 = createTestMesh()

			const result = await mesh`${mesh1} | ${mesh2}`

			// Should return a mesh (from tester engine)
			expect(result).toBeInstanceOf(AMesh)
			expect(result.vectors.length).toBe(3) // Single triangle from tester
		})

		it('should handle multiple meshes in union', async () => {
			const mesh1 = createTestMesh()
			const mesh2 = createTestMesh()
			const mesh3 = createTestMesh()

			const result = await mesh`${mesh1} | ${mesh2} | ${mesh3}`

			// Should return a mesh (from tester engine)
			expect(result).toBeInstanceOf(AMesh)
			expect(result.vectors.length).toBe(3) // Single triangle from tester
		})

		it('should handle multiple meshes in intersection', async () => {
			const mesh1 = createTestMesh()
			const mesh2 = createTestMesh()
			const mesh3 = createTestMesh()

			const result = await mesh`${mesh1} & ${mesh2} & ${mesh3}`

			// Should return a mesh (from tester engine)
			expect(result).toBeInstanceOf(AMesh)
			expect(result.vectors.length).toBe(3) // Single triangle from tester
		})

		it('should handle complex expressions with translation and scaling', async () => {
			const testMesh = createTestMesh()

			const result = await mesh`(${testMesh} + (1, 0, 0)) * 2`

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

		it('should handle complex boolean expressions', async () => {
			const mesh1 = createTestMesh()
			const mesh2 = createTestMesh()
			const mesh3 = createTestMesh()

			const result = await mesh`${mesh1} + (1, 0, 0) & ${mesh2} | ${mesh3}`

			// Should return a mesh (from tester engine)
			expect(result).toBeInstanceOf(AMesh)
			expect(result.vectors.length).toBe(3) // Single triangle from tester
		})

		it('should handle vector literals in expressions', async () => {
			const testMesh = createTestMesh()

			const result = await mesh`${testMesh} + (0.5, 1.5, 2.5)`

			expect(result.vectors.length).toBe(testMesh.vectors.length)
			for (let i = 0; i < testMesh.vectors.length; i++) {
				const original = testMesh.vectors[i]
				const translated = result.vectors[i]
				expect(translated[0]).toBe(original[0] + 0.5)
				expect(translated[1]).toBe(original[1] + 1.5)
				expect(translated[2]).toBe(original[2] + 2.5)
			}
		})

		it('should handle number literals in expressions', async () => {
			const testMesh = createTestMesh()

			const result = await mesh`${testMesh} * 1.5`

			expect(result.vectors.length).toBe(testMesh.vectors.length)
			for (let i = 0; i < testMesh.vectors.length; i++) {
				const original = testMesh.vectors[i]
				const scaled = result.vectors[i]
				expect(scaled[0]).toBe(original[0] * 1.5)
				expect(scaled[1]).toBe(original[1] * 1.5)
				expect(scaled[2]).toBe(original[2] * 1.5)
			}
		})

		it('should handle multiple translations', async () => {
			const testMesh = createTestMesh()

			const result = await mesh`${testMesh} + (1, 0, 0) + (0, 1, 0)`

			expect(result.vectors.length).toBe(testMesh.vectors.length)
			for (let i = 0; i < testMesh.vectors.length; i++) {
				const original = testMesh.vectors[i]
				const translated = result.vectors[i]
				expect(translated[0]).toBe(original[0] + 1)
				expect(translated[1]).toBe(original[1] + 1)
				expect(translated[2]).toBe(original[2])
			}
		})

		it('should handle multiple scalings', async () => {
			const testMesh = createTestMesh()

			const result = await mesh`${testMesh} * 2 * 3`

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

			expect(() => mesh`${mesh1} - (1, 2, 3)`).toThrow()
		})

		it('should throw when trying to intersect non-mesh', () => {
			const mesh1 = createTestMesh()

			expect(() => mesh`${mesh1} & (1, 2, 3)`).toThrow()
		})

		it('should throw when trying to union non-mesh', () => {
			const mesh1 = createTestMesh()

			expect(() => mesh`${mesh1} | (1, 2, 3)`).toThrow()
		})

		it('should handle precedence correctly', async () => {
			const mesh1 = createTestMesh()
			const mesh2 = createTestMesh()
			const mesh3 = createTestMesh()

			// Test that union has higher precedence than intersection
			const result1 = await mesh`${mesh1} | ${mesh2} & ${mesh3}`
			expect(result1).toBeInstanceOf(AMesh)

			// Test that intersection has higher precedence than subtraction
			const result2 = await mesh`${mesh1} & ${mesh2} - ${mesh3}`
			expect(result2).toBeInstanceOf(AMesh)
		})

		it('should handle parentheses for precedence override', async () => {
			const mesh1 = createTestMesh()
			const mesh2 = createTestMesh()
			const mesh3 = createTestMesh()

			// Test parentheses override precedence
			const result = await mesh`(${mesh1} | ${mesh2}) & ${mesh3}`
			expect(result).toBeInstanceOf(AMesh)
		})

		it('should handle scaling with unity factor (no scaling)', async () => {
			const testMesh = createTestMesh()

			const result = await mesh`${testMesh} * 1`

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

		it('should handle translation with zero vector (no translation)', async () => {
			const testMesh = createTestMesh()

			const result = await mesh`${testMesh} + (0, 0, 0)`

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

		it('should handle mixed operations with proper precedence', async () => {
			const mesh1 = createTestMesh()
			const mesh2 = createTestMesh()

			// Test complex expression: (mesh1 + (1, 0, 0)) * 2 - mesh2
			const result = await mesh`(${mesh1} + (1, 0, 0)) * 2 - ${mesh2}`

			// Should return a mesh (from tester engine for boolean operations)
			expect(result).toBeInstanceOf(AMesh)
			expect(result.vectors.length).toBe(3) // Single triangle from tester
		})

		it('should handle rotation with ^ operator', async () => {
			const testMesh = createTestMesh()

			const result = await mesh`${testMesh} ^ (0, 0, 1.5)`

			expect(result).toBeInstanceOf(AMesh)
			expect(result.vectors.length).toBe(testMesh.vectors.length)
		})

		it('should rotate a cube and verify the result', async () => {
			// Create a simple cube mesh
			const vertices = [
				v3(0, 0, 0),
				v3(1, 0, 0),
				v3(1, 1, 0),
				v3(0, 1, 0),
				v3(0, 0, 1),
				v3(1, 0, 1),
				v3(1, 1, 1),
				v3(0, 1, 1),
			]

			const faces: [Vector3, Vector3, Vector3][] = [
				// Bottom face
				[vertices[0], vertices[1], vertices[2]],
				[vertices[0], vertices[2], vertices[3]],
				// Top face
				[vertices[4], vertices[6], vertices[5]],
				[vertices[4], vertices[7], vertices[6]],
				// Front face
				[vertices[0], vertices[4], vertices[5]],
				[vertices[0], vertices[5], vertices[1]],
				// Back face
				[vertices[2], vertices[6], vertices[7]],
				[vertices[2], vertices[7], vertices[3]],
				// Left face
				[vertices[0], vertices[3], vertices[7]],
				[vertices[0], vertices[7], vertices[4]],
				// Right face
				[vertices[1], vertices[5], vertices[6]],
				[vertices[1], vertices[6], vertices[2]],
			]

			const cube = new Mesh(faces)

			// Rotate the cube around Z axis by π/2 radians (90 degrees)
			const rotatedCube = await mesh`${cube} ^ (0, 0, 1.5708)`

			expect(rotatedCube).toBeInstanceOf(AMesh)
			expect(rotatedCube.vectors.length).toBe(cube.vectors.length)

			// Verify that the rotation actually changed the mesh
			// (the vectors should be different after rotation)
			const originalVectors = cube.vectors
			const rotatedVectors = rotatedCube.vectors

			// Check that at least some vectors are different (indicating rotation occurred)
			let hasChanges = false
			for (let i = 0; i < originalVectors.length; i++) {
				const original = originalVectors[i]
				const rotated = rotatedVectors[i]
				if (
					Math.abs(original.x - rotated.x) > 0.001 ||
					Math.abs(original.y - rotated.y) > 0.001 ||
					Math.abs(original.z - rotated.z) > 0.001
				) {
					hasChanges = true
					break
				}
			}

			expect(hasChanges).toBe(true)
		})

		it('should handle vector literals with parameters in z', async () => {
			const zValue = 5.5

			const result = await mesh`${createTestMesh()} + (0, 0, ${zValue})`

			expect(result).toBeInstanceOf(AMesh)
			expect(result.vectors.length).toBe(createTestMesh().vectors.length)

			// Check that the translation was applied correctly
			const originalVectors = createTestMesh().vectors
			const translatedVectors = result.vectors

			for (let i = 0; i < originalVectors.length; i++) {
				const original = originalVectors[i]
				const translated = translatedVectors[i]
				expect(translated.x).toBe(original.x + 0)
				expect(translated.y).toBe(original.y + 0)
				expect(translated.z).toBe(original.z + zValue)
			}
		})

		it('should handle vector literals with parameters in y', async () => {
			const yValue = 5.5

			const result = await mesh`${createTestMesh()} + (0, ${yValue}, 0)`

			expect(result).toBeInstanceOf(AMesh)
			expect(result.vectors.length).toBe(createTestMesh().vectors.length)

			// Check that the translation was applied correctly
			const originalVectors = createTestMesh().vectors
			const translatedVectors = result.vectors

			for (let i = 0; i < originalVectors.length; i++) {
				const original = originalVectors[i]
				const translated = translatedVectors[i]
				expect(translated.x).toBe(original.x + 0)
				expect(translated.y).toBe(original.y + yValue)
				expect(translated.z).toBe(original.z + 0)
			}
		})
	})
})

describe('Vector operations', () => {
	describe('v3 template tag', () => {
		it('should handle simple addition', async () => {
			const a = v3(1, 0, 0)
			const b = v3(0, 1, 0)
			const result = await v3`${a} + ${b}`
			expect(result).toEqual([1, 1, 0])
		})

		it('should hardcode vectors', async () => {
			const a = v3(1, 0, 0)
			const result = await v3`${a} + (0, 1, 0)`
			expect(result).toEqual([1, 1, 0])
		})

		it('should handle scaling', async () => {
			const a = v3(1, 1, 1)
			const result = await v3`2 * ${a}`
			expect(result).toEqual([2, 2, 2])
		})

		it('should scale vectors', async () => {
			const a = v3(1, 2, 3)
			const result = await v3`(2, 3, 4) * ${a}`
			expect(result).toEqual([2, 6, 12])
		})

		it('should handle subtraction', async () => {
			const a = v3(1, 1, 1)
			const b = v3(0, 1, 2)
			const result = await v3`${a} - ${b}`
			expect(result).toEqual([1, 0, -1])
		})

		it('should handle complex expressions', async () => {
			const a = v3(1, 0, 0)
			const b = v3(0, 1, 0)
			const c = v3(0, 0, 1)
			const result = await v3`2${a} - 0.5 ${b} + ${c}`
			expect(result).toEqual([2, -0.5, 1])
		})

		it('should handle parametric expressions', async () => {
			const a = v3(1, 0, 0)
			const b = v3(0, 1, 0)
			const c = v3(0, 0, 1)
			const d = 2

			const result = await v3`2 * ${a} - ${d} * ${b} + ${c}`
			expect(result).toEqual([2, -2, 1])
		})

		it('should throw on invalid expressions', async () => {
			const a = v3(1, 0, 0)
			expect(() => v3`invalid ${a}`).toThrow()
		})
	})
})

describe('Contour operations', () => {
	describe('contour template tag', () => {
		it('should handle contour rotation with degrees', async () => {
			const testContour = createTestContour()

			// Rotate by 90 degrees
			const result = await contour`${testContour} ^ 90`

			expect(result).toBeInstanceOf(AContour)
			expect(result.array.length).toBe(testContour.array.length)

			// Verify that the rotation actually changed the contour
			// The vertices should be different after rotation
			const originalVertices = testContour.array[0].polygon.array
			const rotatedVertices = result.array[0].polygon.array

			// Check that at least some vertices are different (indicating rotation occurred)
			let hasChanges = false
			for (let i = 0; i < originalVertices.length; i++) {
				const original = originalVertices[i]
				const rotated = rotatedVertices[i]
				if (Math.abs(original.x - rotated.x) > 0.001 || Math.abs(original.y - rotated.y) > 0.001) {
					hasChanges = true
					break
				}
			}

			expect(hasChanges).toBe(true)
		})

		it('should handle contour rotation with 45 degrees', async () => {
			const testContour = createTestContour()

			// Rotate by 45 degrees
			const result = await contour`${testContour} ^ 45`

			expect(result).toBeInstanceOf(AContour)
			expect(result.array.length).toBe(testContour.array.length)
		})

		it('should handle contour translation', async () => {
			const testContour = createTestContour()

			const result = await contour`${testContour} + ${v2(1, 2)}`

			expect(result).toBeInstanceOf(AContour)
			expect(result.array.length).toBe(testContour.array.length)
		})

		it('should handle contour scaling', async () => {
			const testContour = createTestContour()

			const result = await contour`${testContour} * 2`

			expect(result).toBeInstanceOf(AContour)
			expect(result.array.length).toBe(testContour.array.length)
		})

		it('should handle contour boolean operations', async () => {
			const contour1 = createTestContour()
			const contour2 = createTestContour()

			const unionResult = await contour`${contour1} | ${contour2}`
			const intersectionResult = await contour`${contour1} & ${contour2}`
			const subtractionResult = await contour`${contour1} - ${contour2}`

			expect(unionResult).toBeInstanceOf(AContour)
			expect(intersectionResult).toBeInstanceOf(AContour)
			expect(subtractionResult).toBeInstanceOf(AContour)
		})
	})
})

describe('Mathematical expressions', () => {
	describe('π parsing', () => {
		it('should parse π (Unicode) as Math.PI', async () => {
			const testContour = createTestContour()
			const result = await contour`${testContour} ^ π`

			expect(result).toBeInstanceOf(AContour)
			// π should be parsed as Math.PI (approximately 3.14159)
			// The rotation should be applied
			expect(result.array.length).toBe(testContour.array.length)
		})

		it('should parse π (ASCII) as Math.PI', async () => {
			const testContour = createTestContour()
			const result = await contour`${testContour} ^ π`

			expect(result).toBeInstanceOf(AContour)
			expect(result.array.length).toBe(testContour.array.length)
		})

		it('should parse pi (case-insensitive) as Math.PI', async () => {
			const testContour = createTestContour()
			const result = await contour`${testContour} ^ pi`

			expect(result).toBeInstanceOf(AContour)
			expect(result.array.length).toBe(testContour.array.length)
		})

		it('should parse Pi (mixed case) as Math.PI', async () => {
			const testContour = createTestContour()
			const result = await contour`${testContour} ^ Pi`

			expect(result).toBeInstanceOf(AContour)
			expect(result.array.length).toBe(testContour.array.length)
		})

		it('should parse PI (uppercase) as Math.PI', async () => {
			const testContour = createTestContour()
			const result = await contour`${testContour} ^ PI`

			expect(result).toBeInstanceOf(AContour)
			expect(result.array.length).toBe(testContour.array.length)
		})
	})

	describe('Vector2 rotation with mathematical expressions', () => {
		it('should rotate Vector2 by π/4 radians', () => {
			const vec = v2(1, 0)
			const result = v2`${vec} ^ π/4`

			// π/4 = 45 degrees, so (1,0) rotated should be approximately (0.707, 0.707)
			expect(Math.abs(result.x - Math.SQRT1_2)).toBeLessThan(epsilon)
			expect(Math.abs(result.y - Math.SQRT1_2)).toBeLessThan(epsilon)
		})

		it('should rotate Vector2 by π/2 radians', () => {
			const vec = v2(1, 0)
			const result = v2`${vec} ^ π/2`

			// π/2 = 90 degrees, so (1,0) rotated should be approximately (0, 1)
			expect(Math.abs(result.x - 0)).toBeLessThan(epsilon)
			expect(Math.abs(result.y - 1)).toBeLessThan(epsilon)
		})

		it('should rotate Vector2 by π radians', () => {
			const vec = v2(1, 0)
			const result = v2`${vec} ^ π`

			// π = 180 degrees, so (1,0) rotated should be approximately (-1, 0)
			expect(Math.abs(result.x - -1)).toBeLessThan(epsilon)
			expect(Math.abs(result.y - 0)).toBeLessThan(epsilon)
		})

		it('should rotate Vector2 by 2π radians (full rotation)', () => {
			const vec = v2(1, 0)
			const result = v2`${vec} ^ 2π`

			// 2π = 360 degrees, so (1,0) rotated should be approximately (1, 0) again
			expect(Math.abs(result.x - 1)).toBeLessThan(epsilon)
			expect(Math.abs(result.y - 0)).toBeLessThan(epsilon)
		})

		it('should rotate Vector2 by 3π/4 radians', () => {
			const vec = v2(1, 0)
			const result = v2`${vec} ^ 3π/4`

			// 3π/4 = 135 degrees, so (1,0) rotated should be approximately (-0.707, 0.707)
			expect(Math.abs(result.x + Math.SQRT1_2)).toBeLessThan(epsilon)
			expect(Math.abs(result.y - Math.SQRT1_2)).toBeLessThan(epsilon)
		})
	})

	describe('Contour rotation with mathematical expressions', () => {
		it('should rotate contour by π/4 radians', async () => {
			const testContour = createTestContour()
			const result = await contour`${testContour} ^ π/4`

			expect(result).toBeInstanceOf(AContour)
			expect(result.array.length).toBe(testContour.array.length)

			// Verify rotation occurred by checking vertex positions changed
			const originalVertices = testContour.array[0].polygon.array
			const rotatedVertices = result.array[0].polygon.array

			let hasChanges = false
			for (let i = 0; i < originalVertices.length; i++) {
				const original = originalVertices[i]
				const rotated = rotatedVertices[i]
				if (Math.abs(original.x - rotated.x) > 0.001 || Math.abs(original.y - rotated.y) > 0.001) {
					hasChanges = true
					break
				}
			}
			expect(hasChanges).toBe(true)
		})

		it('should rotate contour by π/2 radians', async () => {
			const testContour = createTestContour()
			const result = await contour`${testContour} ^ π/2`

			expect(result).toBeInstanceOf(AContour)
			expect(result.array.length).toBe(testContour.array.length)
		})

		it('should rotate contour by π radians', async () => {
			const testContour = createTestContour()
			const result = await contour`${testContour} ^ π`

			expect(result).toBeInstanceOf(AContour)
			expect(result.array.length).toBe(testContour.array.length)
		})

		it('should rotate contour by 2π radians (full rotation)', async () => {
			const testContour = createTestContour()
			const result = await contour`${testContour} ^ 2π`

			expect(result).toBeInstanceOf(AContour)
			expect(result.array.length).toBe(testContour.array.length)

			// After full rotation, vertices should be very close to original positions
			const originalVertices = testContour.array[0].polygon.array
			const rotatedVertices = result.array[0].polygon.array

			for (let i = 0; i < originalVertices.length; i++) {
				const original = originalVertices[i]
				const rotated = rotatedVertices[i]
				expect(Math.abs(original.x - rotated.x)).toBeLessThan(0.001)
				expect(Math.abs(original.y - rotated.y)).toBeLessThan(0.001)
			}
		})
	})

	describe('Vector3 rotation with mathematical expressions', () => {
		it('should rotate Vector3 around Z-axis by π/4 radians', () => {
			const vec = v3(1, 0, 0)
			const result = v3`${vec} ^ (0, 0, π/4)`

			// π/4 = 45 degrees around Z-axis, so (1,0,0) rotated should be approximately (0.707, 0.707, 0)
			expect(Math.abs(result.x - Math.SQRT1_2)).toBeLessThan(epsilon)
			expect(Math.abs(result.y - Math.SQRT1_2)).toBeLessThan(epsilon)
			expect(Math.abs(result.z - 0)).toBeLessThan(epsilon)
		})

		it('should rotate Vector3 around Z-axis by π/2 radians', () => {
			const vec = v3(1, 0, 0)
			const result = v3`${vec} ^ (0, 0, π/2)`

			// π/2 = 90 degrees around Z-axis, so (1,0,0) rotated should be approximately (0, 1, 0)
			expect(Math.abs(result.x - 0)).toBeLessThan(epsilon)
			expect(Math.abs(result.y - 1)).toBeLessThan(epsilon)
			expect(Math.abs(result.z - 0)).toBeLessThan(epsilon)
		})

		it('should rotate Vector3 around Z-axis by π radians', () => {
			const vec = v3(1, 0, 0)
			const result = v3`${vec} ^ (0, 0, π)`

			// π = 180 degrees around Z-axis, so (1,0,0) rotated should be approximately (-1, 0, 0)
			expect(Math.abs(result.x - -1)).toBeLessThan(epsilon)
			expect(Math.abs(result.y - 0)).toBeLessThan(epsilon)
			expect(Math.abs(result.z - 0)).toBeLessThan(epsilon)
		})

		it('should rotate Vector3 around Z-axis by 2π radians (full rotation)', () => {
			const vec = v3(1, 0, 0)
			const result = v3`${vec} ^ (0, 0, 2π)`

			// 2π = 360 degrees around Z-axis, so (1,0,0) rotated should be approximately (1, 0, 0) again
			expect(Math.abs(result.x - 1)).toBeLessThan(epsilon)
			expect(Math.abs(result.y - 0)).toBeLessThan(epsilon)
			expect(Math.abs(result.z - 0)).toBeLessThan(epsilon)
		})

		it('should rotate Vector3 around Z-axis by 3π/4 radians', () => {
			const vec = v3(1, 0, 0)
			const result = v3`${vec} ^ (0, 0, 3π/4)`

			// 3π/4 = 135 degrees around Z-axis, so (1,0,0) rotated should be approximately (-0.707, 0.707, 0)
			expect(Math.abs(result.x + Math.SQRT1_2)).toBeLessThan(epsilon)
			expect(Math.abs(result.y - Math.SQRT1_2)).toBeLessThan(epsilon)
			expect(Math.abs(result.z - 0)).toBeLessThan(epsilon)
		})

		it('should rotate Vector3 around X-axis by π/2 radians', () => {
			const vec = v3(0, 1, 0)
			const result = v3`${vec} ^ (π/2, 0, 0)`

			// π/2 = 90 degrees around X-axis, so (0,1,0) rotated should be approximately (0, 0, 1)
			expect(Math.abs(result.x - 0)).toBeLessThan(epsilon)
			expect(Math.abs(result.y - 0)).toBeLessThan(epsilon)
			expect(Math.abs(result.z - 1)).toBeLessThan(epsilon)
		})

		it('should rotate Vector3 around Y-axis by π/2 radians', () => {
			const vec = v3(1, 0, 0)
			const result = v3`${vec} ^ (0, π/2, 0)`

			// π/2 = 90 degrees around Y-axis, so (1,0,0) rotated should be approximately (0, 0, -1)
			expect(Math.abs(result.x - 0)).toBeLessThan(epsilon)
			expect(Math.abs(result.y - 0)).toBeLessThan(epsilon)
			expect(Math.abs(result.z - -1)).toBeLessThan(epsilon)
		})

		it('should handle complex rotation around multiple axes', () => {
			const vec = v3(1, 0, 0)
			const result = v3`${vec} ^ (π/4, π/6, π/3)`

			// Complex rotation around all three axes
			// This tests that the rotation system can handle non-zero components on all axes
			expect(result.x).toBeDefined()
			expect(result.y).toBeDefined()
			expect(result.z).toBeDefined()

			// The result should be a valid 3D vector (not NaN or infinite)
			expect(Number.isFinite(result.x)).toBe(true)
			expect(Number.isFinite(result.y)).toBe(true)
			expect(Number.isFinite(result.z)).toBe(true)
		})

		it('should handle negative coordinates', () => {
			const result = v3`2 * (-π, -1, -0.5)`

			expect(result.x).toBe(-2 * Math.PI)
			expect(result.y).toBe(-2)
			expect(result.z).toBe(-1)
		})

		it('should handle negative vectors', () => {
			const result = v3`2 * -(π, 1, 0.5)`

			expect(result.x).toBe(-2 * Math.PI)
			expect(result.y).toBe(-2)
			expect(result.z).toBe(-1)
		})
	})

	describe('Combined operations with mathematical expressions', () => {
		it('should handle rotation and scaling', async () => {
			const testContour = createTestContour()
			const result = await contour`${testContour} ^ π/4 * 2`

			expect(result).toBeInstanceOf(AContour)
			expect(result.array.length).toBe(testContour.array.length)
		})

		it('should handle rotation and translation', async () => {
			const testContour = createTestContour()
			const result = await contour`${testContour} ^ π/2 + ${v2(1, 1)}`

			expect(result).toBeInstanceOf(AContour)
			expect(result.array.length).toBe(testContour.array.length)
		})

		it('should handle complex boolean operations with mathematical expressions', async () => {
			const contour1 = createTestContour()
			const contour2 = createTestContour()

			const result = await contour`(${contour1} ^ π/4) | (${contour2} ^ π/2)`

			expect(result).toBeInstanceOf(AContour)
			expect(result.array.length).toBeGreaterThan(0)
		})
	})
})
