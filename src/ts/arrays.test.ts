import { describe, expect, it } from 'vitest'
import { zip } from './arrays'

describe('zip function', () => {
	it('should zip two arrays', () => {
		const numbers = [1, 2, 3]
		const strings = ['a', 'b', 'c']
		const result = zip(numbers, strings)

		expect(result).toEqual([
			[1, 'a'],
			[2, 'b'],
			[3, 'c']
		])

		// Type check: result should be [number, string][]
		const first: [number, string] = result[0]
		expect(first[0]).toBe(1)
		expect(first[1]).toBe('a')
	})

	it('should zip three arrays', () => {
		const numbers = [1, 2, 3]
		const strings = ['a', 'b', 'c']
		const booleans = [true, false, true]
		const result = zip(numbers, strings, booleans)

		expect(result).toEqual([
			[1, 'a', true],
			[2, 'b', false],
			[3, 'c', true]
		])

		// Type check: result should be [number, string, boolean][]
		const first: [number, string, boolean] = result[0]
		expect(first[0]).toBe(1)
		expect(first[1]).toBe('a')
		expect(first[2]).toBe(true)
	})

	it('should handle arrays of different lengths', () => {
		const numbers = [1, 2, 3, 4]
		const strings = ['a', 'b']
		const result = zip(numbers, strings)

		expect(result).toEqual([
			[1, 'a'],
			[2, 'b']
		])
	})

	it('should handle empty arrays', () => {
		const result = zip([], [], [])
		expect(result).toEqual([])
	})

	it('should handle mixed array types', () => {
		const numbers = [1, 2, 3]
		const strings = ['a', 'b', 'c']
		const objects = [{ id: 1 }, { id: 2 }, { id: 3 }]
		const result = zip(numbers, strings, objects)

		expect(result).toEqual([
			[1, 'a', { id: 1 }],
			[2, 'b', { id: 2 }],
			[3, 'c', { id: 3 }]
		])

		// Type check: result should be [number, string, { id: number }][]
		const first: [number, string, { id: number }] = result[0]
		expect(first[0]).toBe(1)
		expect(first[1]).toBe('a')
		expect(first[2].id).toBe(1)
	})
})
