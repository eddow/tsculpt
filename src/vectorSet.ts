import type { VectorD } from './types/vectors'

const epsilon = 1e-6
export class VectorMap<Vector extends VectorD> {
	private mapped = new Map<string, number>()
	public readonly vectors = [] as Vector[]

	// Quantize coordinates to a grid of size epsilon
	private key(v: Vector): string {
		const q = v.map((n) => Math.round(n / epsilon))
		return q.join(',')
	}

	index(v: Vector): number {
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
