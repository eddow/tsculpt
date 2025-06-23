import { describe, expect, it } from 'vitest'
import { equals, linear, normalize, rotate3, scale, translate, vector } from './cpu/vectors'
import { type Vector3 } from './types/vectors'

describe('Vector operations', () => {
	describe('equals', () => {
		it('should compare vectors of same length', () => {
			expect(equals([1, 2, 3], [1, 2, 3])).toBe(true)
			expect(equals([1, 2, 3], [1, 2, 4])).toBe(false)
		})

		it('should handle empty vectors', () => {
			expect(equals([], [])).toBe(true)
		})

		it('should handle vectors of different lengths', () => {
			expect(equals([1, 2], [1, 2, 3])).toBe(false)
		})
	})

	describe('normalize', () => {
		it('should normalize 3D vectors', () => {
			const input: Vector3 = [3, 0, 0]
			const result = normalize(input)
			expect(result[0]).toBeCloseTo(1)
			expect(result[1]).toBeCloseTo(0)
			expect(result[2]).toBeCloseTo(0)
		})

		it('should handle zero vector', () => {
			const input: Vector3 = [0, 0, 0]
			const result = normalize(input)
			expect(result.every((x) => Number.isNaN(x))).toBe(true)
		})

		it('should work with vectors of any dimension', () => {
			const input = [1, 1, 1, 1]
			const result = normalize(input)
			const expectedLength = 0.5
			for (const x of result) expect(x).toBeCloseTo(expectedLength)
		})
	})

	describe('linear', () => {
		it('should handle single vector scaling', () => {
			const result = linear([2, [1, 2, 3] as Vector3])
			expect(result).toEqual([2, 4, 6])
		})

		it('should add multiple scaled vectors', () => {
			const result = linear([1, [1, 0, 0] as Vector3], [2, [0, 1, 0] as Vector3])
			expect(result).toEqual([1, 2, 0])
		})

		it('should handle vectors of different lengths', () => {
			const result = linear([1, [1, 2]], [1, [3, 4, 5]])
			expect(result).toEqual([4, 6, 5])
		})
	})

	describe('vector template tag', () => {
		it('should handle simple addition', () => {
			const a: Vector3 = [1, 0, 0]
			const b: Vector3 = [0, 1, 0]
			const result = vector`${a} + ${b}`
			expect(result).toEqual([1, 1, 0])
		})

		it('should handle scaling', () => {
			const a: Vector3 = [1, 1, 1]
			const result = vector`2 * ${a}`
			expect(result).toEqual([2, 2, 2])
		})

		it('should handle subtraction', () => {
			const a: Vector3 = [1, 1, 1]
			const b: Vector3 = [0, 1, 2]
			const result = vector`${a} - ${b}`
			expect(result).toEqual([1, 0, -1])
		})

		it('should handle complex expressions', () => {
			const a: Vector3 = [1, 0, 0]
			const b: Vector3 = [0, 1, 0]
			const c: Vector3 = [0, 0, 1]
			const result = vector`2${a} - 0.5 ${b} + ${c}`
			expect(result).toEqual([2, -0.5, 1])
		})

		it('should handle parametric expressions', () => {
			const a = [1, 0, 0] as Vector3
			const b = [0, 1, 0] as Vector3
			const c = [0, 0, 1] as Vector3
			const d = 2

			const result = vector`2 * ${a} - ${d} * ${b} + ${c}`
			expect(result).toEqual([2, -2, 1])
		})

		it('should throw on invalid expressions', () => {
			const a: Vector3 = [1, 0, 0]
			expect(() => vector`invalid ${a}`).toThrow()
		})
	})
})

describe('Vertices operations', () => {
	const vertices = [
		[0, 0, 0],
		[1, 0, 0],
		[1, 1, 0],
		[0, 1, 0],
		[0, 0, 1],
		[1, 0, 1],
		[1, 1, 1],
		[0, 1, 1],
	] as Vector3[]

	describe('translate', () => {
		it('should translate vertices', () => {
			const offset: Vector3 = [1, 2, 3]
			const result = translate(vertices, offset)
			const firstVertex = result[0]
			expect(firstVertex).toEqual([1, 2, 3])
		})

		it('should not modify original vertices', () => {
			const original = vertices[0]
			translate(vertices, [1, 1, 1])
			expect(vertices[0]).toEqual(original)
		})

		it('should handle zero translation', () => {
			const result = translate(vertices, [0, 0, 0])
			expect(result).toEqual(vertices)
		})
	})

	describe('scale', () => {
		it('should scale vertices uniformly', () => {
			const result = scale(vertices, 2)
			const firstVertex = result[0]
			expect(firstVertex).toEqual([0, 0, 0])
			expect(result[1]).toEqual([2, 0, 0])
		})

		it('should not modify original vertices', () => {
			const original = [...vertices]
			scale(vertices, 2)
			expect(vertices).toEqual(original)
		})

		it('should handle unit scale', () => {
			const result = scale(vertices, 1)
			expect(result).toEqual(vertices)
		})
	})

	describe('rotate3', () => {
		it('should rotate around X axis', () => {
			const result = rotate3(vertices, Math.PI / 2, [1, 0, 0])
			// Check that [0,1,0] rotates to approximately [0,0,1]
			const rotatedY = result[3]
			expect(rotatedY[1]).toBeCloseTo(0)
			expect(rotatedY[2]).toBeCloseTo(1)
		})

		it('should not modify original vertices', () => {
			const original = [...vertices]
			rotate3(vertices, Math.PI / 2, [1, 0, 0])
			expect(vertices).toEqual(original)
		})

		it('should handle zero rotation', () => {
			const result = rotate3(vertices, 0, [1, 0, 0])
			expect(result).toEqual(vertices)
		})

		it('should handle zero axis', () => {
			const result = rotate3(vertices, Math.PI / 2, [0, 0, 0])
			expect(result).toEqual(vertices)
		})
	})
})
