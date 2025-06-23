import type { VectorD } from './types/vectors'

const epsilon = 1e-6
export class VectorMap<Vector extends VectorD> {
	private map = new Map<string, number>()
	private stereotypes = [] as Vector[]

	constructor() {}

	// Quantize coordinates to a grid of size epsilon
	private key(v: Vector): string {
		const q = v.map((n) => Math.round(n / epsilon))
		return q.join(',')
	}

	index(v: Vector): number {
		const k = this.key(v)
		if (!this.map.has(k)) {
			this.map.set(k, this.stereotypes.length)
			// @ts-expect-error number[] -> Vector
			this.stereotypes.push(v.map((n) => Math.round(n / epsilon) * epsilon))
		}
		return this.map.get(k)!
	}
	stereotype(v: Vector): Vector {
		return this.stereotypes[this.index(v)]
	}
	get vectors(): readonly Vector[] {
		return this.stereotypes
	}
	size(): number {
		return this.map.size
	}
	[index: number]: Vector
}
