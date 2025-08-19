import { epsilon } from './math'
import type { Vector } from './types/bunches'
export class VectorMap<V extends Vector> {
	private mapped = new Map<string, number>()
	public readonly vectors = [] as V[]

	// Quantize coordinates to a grid of size epsilon
	private key(v: V): string {
		const q = v.map((n) => Math.round(n / epsilon))
		return q.join(',')
	}

	index(v: V): number {
		const k = this.key(v)
		if (!this.mapped.has(k)) {
			this.mapped.set(k, this.vectors.length)
			// @ts-expect-error number[] -> Vector
			this.vectors.push(v.map((n) => Math.round(n / epsilon) * epsilon))
		}
		return this.mapped.get(k)!
	}
	face(a: V, b: V, c: V): [number, number, number] {
		return [this.index(a), this.index(b), this.index(c)]
	}
	size(): number {
		return this.mapped.size
	}
}

export function dicotomic<T>(
	items: T[],
	item: T,
	isASmallerThanB: (a: T, b: T) => boolean = (a, b) => a < b
): number {
	// Find the largest index i such that items[i] <= item, according to comparator
	let lo = 0
	let hi = items.length - 1
	while (lo <= hi) {
		const mid = (lo + hi) >> 1
		// items[mid] <= item  <=>  !(item < items[mid])
		if (!isASmallerThanB(item, items[mid])) {
			lo = mid + 1
		} else {
			hi = mid - 1
		}
	}
	// hi is now the last index where items[hi] <= item; may be -1 if all items > item
	return hi
}
