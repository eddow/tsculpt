import { describe, it, expect } from 'vitest'
import { dicotomic } from './optimizations'

describe('dicotomic (floor index)', () => {
	it('exact matches in ascending array', () => {
		const items = [0, 0.25, 0.5, 0.75, 1]
		expect(dicotomic(items, 0)).toBe(0)
		expect(dicotomic(items, 0.25)).toBe(1)
		expect(dicotomic(items, 0.5)).toBe(2)
		expect(dicotomic(items, 0.75)).toBe(3)
		expect(dicotomic(items, 1)).toBe(4)
	})

	it('in-between values in ascending array', () => {
		const items = [0, 0.25, 0.5, 0.75, 1]
		expect(dicotomic(items, -0.1)).toBe(-1) // all items > x
		expect(dicotomic(items, 0.1)).toBe(0)
		expect(dicotomic(items, 0.3)).toBe(1)
		expect(dicotomic(items, 0.74)).toBe(2)
		expect(dicotomic(items, 0.76)).toBe(3)
		expect(dicotomic(items, 1.2)).toBe(4) // floor to last index
	})

	it('handles duplicates by returning last duplicate index', () => {
		const items = [0, 0.25, 0.25, 0.25, 0.5, 1]
		expect(dicotomic(items, 0.25)).toBe(3)
		expect(dicotomic(items, 0.26)).toBe(3)
		expect(dicotomic(items, 0.5)).toBe(4)
	})

	it('monotonic property: items[idx] <= x and next is > x (or end)', () => {
		const items = [0, 0.1, 0.2, 0.4, 0.8]
		const queries = [-1, 0, 0.05, 0.15, 0.39, 0.4, 0.79, 0.81, 2]
		for (const x of queries) {
			const idx = dicotomic(items, x)
			if (idx === -1) {
				expect(x).toBeLessThan(items[0])
				continue
			}
			expect(idx).toBeGreaterThanOrEqual(0)
			expect(idx).toBeLessThanOrEqual(items.length - 1)
			expect(items[idx]).toBeLessThanOrEqual(x)
			if (idx < items.length - 1) expect(items[idx + 1]).toBeGreaterThan(x)
		}
	})
})
