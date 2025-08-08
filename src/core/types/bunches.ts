import { zip } from '@tsculpt/ts/arrays'
import { cached } from '@tsculpt/ts/decorators'

// Type for vectors of any dimension
export function zeroedArray(length: number, org: readonly number[], ones: number[]): number[] {
	return new Array(length).fill(0).map((_, i) => org[i] ?? (ones.includes(i) ? 1 : 0))
}
function error<T>(message: string): T {
	throw new Error(message)
}

export function vecProd(
	a: number | readonly number[],
	b: number | readonly number[]
): number | readonly number[] {
	if (typeof a === 'number') return typeof b === 'number' ? a * b : b.map((v) => v * a)
	return typeof b === 'number' ? a.map((v) => v * b) : zip(a, b).map(([a, b]) => a * b)
}
export function vecSum(
	a: number | readonly number[],
	b: number | readonly number[]
): number | readonly number[] {
	if (typeof a === 'number') return typeof b === 'number' ? a + b : b.map((v) => v + a)
	return typeof b === 'number' ? a.map((v) => v + b) : zip(a, b).map(([a, b]) => a + b)
}

export function isUnity(factor: number | readonly number[]): boolean {
	return Array.isArray(factor) ? factor.every((v) => v === 1) : factor === 1
}

function coordMap(a: number[], b: number[], f: (a: number, b: number) => number): number[] {
	return zip(a, b).map(([a, b]) => f(a, b))
}
export class Vector extends Array<number> {
	static from(v: readonly number[]): Vector {
		return v.length === 2
			? new Vector2(...v)
			: v.length === 3
				? new Vector3(...v)
				: v.length === 4
					? new Vector4(...v)
					: error(`Invalid vector size: ${v.length}`)
	}
	override push(): number {
		throw new Error('Immutable vector')
	}
	override pop(): number {
		throw new Error('Immutable vector')
	}
	override shift(): number {
		throw new Error('Immutable vector')
	}
	override unshift(): number {
		throw new Error('Immutable vector')
	}
	override splice(): number[] {
		throw new Error('Immutable vector')
	}
	override sort(): this {
		throw new Error('Immutable vector')
	}
	override reverse(): this {
		throw new Error('Immutable vector')
	}

	@cached
	get size() {
		return Math.sqrt(this.reduce((sum, x) => sum + x * x, 0))
	}

	static min<V extends Vector>(...vs: V[]): V {
		return Vector.from(
			vs.reduce(
				(a, b) => coordMap(a, b, Math.min),
				[Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY]
			)
		) as V
	}
	static max<V extends Vector>(...vs: V[]): V {
		return Vector.from(
			vs.reduce(
				(a, b) => coordMap(a, b, Math.max),
				[Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY]
			)
		) as V
	}
	static normalize<V extends Vector>(v: V): V {
		const size = v.size
		return Vector.from(v.map((x) => x / size)) as V
	}

	static add<V extends Vector>(...v: V[]): V {
		return Vector.from(
			zip(...(v as number[][])).map((coords) =>
				coords.reduce((a: number, b: number) => a + b, 0)
			) as number[]
		) as V
	}
	static sub<V extends Vector>(a: V, b: V): V {
		return Vector.from(zip(a as number[], b as number[]).map(([a, b]) => a - b)) as V
	}
	static prod<V extends Vector>(...vs: (V | number)[]): V {
		const vectors: V[] = []
		let numeric = 1
		for (const v of vs) {
			if (typeof v === 'number') numeric *= v
			else vectors.push(v)
		}
		if (vectors.length === 0) throw new Error('No vector in multiplication')
		return Vector.from(
			zip(...(vectors as number[][])).map((coords) =>
				coords.reduce((a: number, b: number) => a * b, numeric)
			) as number[]
		) as V
	}
}
export class Vector2 extends Vector {
	static array(...vs: readonly [number, number][]): Vector2[] {
		return vs.map((v) => new Vector2(...v))
	}
	constructor(...v: readonly number[]) {
		super(...zeroedArray(2, v, [1]))
	}
	override get length() {
		return 2
	}
	get x() {
		return this[0]
	}
	get y() {
		return this[1]
	}
}

export class Vector3 extends Vector {
	static array(...vs: readonly [number, number, number][]): Vector3[] {
		return vs.map((v) => new Vector3(...v))
	}
	constructor(...v: readonly number[]) {
		super(...zeroedArray(3, v, [2]))
	}
	override get length() {
		return 3
	}
	get x() {
		return this[0]
	}
	get y() {
		return this[1]
	}
	get z() {
		return this[2]
	}
}

export class Vector4 extends Vector {
	static array(...vs: readonly [number, number, number, number][]): Vector4[] {
		return vs.map((v) => new Vector4(...v))
	}
	constructor(...v: readonly number[]) {
		super(...zeroedArray(4, v, [3]))
	}
	override get length() {
		return 4
	}
	get x() {
		return this[0]
	}
	get y() {
		return this[1]
	}
	get z() {
		return this[2]
	}
	get w() {
		return this[3]
	}
}
export abstract class Matrix extends Array<number> {
	static from(v: readonly number[]): Matrix {
		return v.length === 4
			? new Matrix2(...v)
			: v.length === 9
				? new Matrix3(...v)
				: v.length === 16
					? new Matrix4(...v)
					: error(`Invalid matrix size: ${v.length}`)
	}
	abstract m(r: number, c: number): number
}

export class Matrix2 extends Matrix {
	constructor(...v: readonly number[]) {
		super(...zeroedArray(4, v, [0, 3]))
	}
	override get length() {
		return 4
	}
	override m(r: number, c: number): number {
		return this[r * 2 + c]
	}
}

export class Matrix3 extends Matrix {
	constructor(...v: readonly number[]) {
		super(...zeroedArray(9, v, [0, 4, 8]))
	}
	override get length() {
		return 9
	}
	override m(r: number, c: number): number {
		return this[r * 3 + c]
	}
}

export class Matrix4 extends Matrix {
	constructor(...v: readonly number[]) {
		super(...zeroedArray(16, v, [0, 5, 10, 15]))
	}
	override get length() {
		return 16
	}
	override m(r: number, c: number): number {
		return this[r * 4 + c]
	}
}

export type NumberBunch = number | Vector | Matrix
