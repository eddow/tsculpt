import { epsilon } from './math'
import type { Vector } from './types/bunches'
import { Vector3 } from './types/bunches'
export class VectorMap<V extends Vector> {
	private mapped = new Map<number, number>()
	public readonly vectors = [] as V[]

	// Helper to get vector components from either tuple or object format
	private getComponents(v: V): [number, number, number] {
		// Handle object-based vectors (e.g., {x, y, z})
		if (typeof v === 'object' && v !== null && 'x' in v) {
			const obj = v as { x?: number; y?: number; z?: number }
			return [obj.x ?? 0, obj.y ?? 0, obj.z ?? 0]
		}
		// Handle tuple-based vectors (e.g., [x, y, z])
		return [v[0] ?? 0, v[1] ?? 0, v[2] ?? 0]
	}

	// Quantize coordinates to a grid of size epsilon
	// Combine three quantized values into a single integer key
	private key(v: V): number {
		const [x, y, z] = this.getComponents(v)
		const qx = Math.round(x / epsilon)
		const qy = Math.round(y / epsilon)
		const qz = Math.round(z / epsilon)
		// Simple hash: combine using bit shifts
		return (qx << 20) ^ (qy << 10) ^ qz
	}

	index(v: V): number {
		const k = this.key(v)
		if (!this.mapped.has(k)) {
			this.mapped.set(k, this.vectors.length)
			const [x, y, z] = this.getComponents(v)
			const qx = Math.round(x / epsilon) * epsilon
			const qy = Math.round(y / epsilon) * epsilon
			const qz = Math.round(z / epsilon) * epsilon

			// Always create a new Vector3 instance (supports both [i] and .x/.y/.z access)
			this.vectors.push(new Vector3(qx, qy, qz) as unknown as V)
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
