import { describe, expect, it } from 'vitest'
import { v3 } from '../types/builders'

describe('Vector operations', () => {
	describe('v3 template tag', () => {
		it('should handle simple addition', () => {
			const a = v3(1, 0, 0)
			const b = v3(0, 1, 0)
			const result = v3`${a} + ${b}`
			expect(result).toEqual([1, 1, 0])
		})

		it('should hardcode vectors', () => {
			const a = v3(1, 0, 0)
			const result = v3`${a} + [0 1 0]`
			expect(result).toEqual([1, 1, 0])
		})

		it('should handle scaling', () => {
			const a = v3(1, 1, 1)
			const result = v3`2 * ${a}`
			expect(result).toEqual([2, 2, 2])
		})

		it('should handle subtraction', () => {
			const a = v3(1, 1, 1)
			const b = v3(0, 1, 2)
			const result = v3`${a} - ${b}`
			expect(result).toEqual([1, 0, -1])
		})

		it('should handle complex expressions', () => {
			const a = v3(1, 0, 0)
			const b = v3(0, 1, 0)
			const c = v3(0, 0, 1)
			const result = v3`2${a} - 0.5 ${b} + ${c}`
			expect(result).toEqual([2, -0.5, 1])
		})

		it('should handle parametric expressions', () => {
			const a = v3(1, 0, 0)
			const b = v3(0, 1, 0)
			const c = v3(0, 0, 1)
			const d = 2

			const result = v3`2 * ${a} - ${d} * ${b} + ${c}`
			expect(result).toEqual([2, -2, 1])
		})

		it('should throw on invalid expressions', () => {
			const a = v3(1, 0, 0)
			expect(() => v3`invalid ${a}`).toThrow()
		})
	})
})
