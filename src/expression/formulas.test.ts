import { describe, expect, it } from 'vitest'
import { vector } from '.'
import { equals, normalize } from '../cpu/vector'
import { v2, v3 } from '../types/builders'

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
			const input = v3(3, 0, 0)
			const result = normalize(input)
			expect(result[0]).toBeCloseTo(1)
			expect(result[1]).toBeCloseTo(0)
			expect(result[2]).toBeCloseTo(0)
		})

		it('should handle zero vector', () => {
			const input = v3(0, 0, 0)
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

	describe('vector template tag', () => {
		it('should handle simple addition', () => {
			const a = v3(1, 0, 0)
			const b = v3(0, 1, 0)
			const result = vector`${a} + ${b}`
			expect(result).toEqual([1, 1, 0])
		})

		it('should handle scaling', () => {
			const a = v3(1, 1, 1)
			const result = vector`2 * ${a}`
			expect(result).toEqual([2, 2, 2])
		})

		it('should handle subtraction', () => {
			const a = v3(1, 1, 1)
			const b = v3(0, 1, 2)
			const result = vector`${a} - ${b}`
			expect(result).toEqual([1, 0, -1])
		})

		it('should handle complex expressions', () => {
			const a = v3(1, 0, 0)
			const b = v3(0, 1, 0)
			const c = v3(0, 0, 1)
			const result = vector`2${a} - 0.5 ${b} + ${c}`
			expect(result).toEqual([2, -0.5, 1])
		})

		it('should handle parametric expressions', () => {
			const a = v3(1, 0, 0)
			const b = v3(0, 1, 0)
			const c = v3(0, 0, 1)
			const d = 2

			const result = vector`2 * ${a} - ${d} * ${b} + ${c}`
			expect(result).toEqual([2, -2, 1])
		})

		it('should throw on invalid expressions', () => {
			const a = v3(1, 0, 0)
			expect(() => vector`invalid ${a}`).toThrow()
		})
	})
})
