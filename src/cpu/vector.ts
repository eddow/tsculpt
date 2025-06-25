import { Vector } from '../types/bunches'
export function equals(a: readonly number[], b: readonly number[]): boolean {
	return a.length === b.length && a.every((value, index) => value === b[index])
}

export function normalize<V extends Vector>(v: readonly number[]): V {
	const length = Math.sqrt(v.reduce((sum, x) => sum + x * x, 0))
	return Vector.from(v.map((x) => x / length)) as V
}

export function mapped<V extends Vector>(f: (v: V) => V, v: (readonly number[])[]): V[] {
	return v.map((v) => Vector.from(f(Vector.from(v) as V))) as V[]
}
