import type { Vector } from './types/bunches'

const epsilon = 1e-6
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
	size(): number {
		return this.mapped.size
	}
}
