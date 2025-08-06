import { vecProd } from '@tsculpt/expression'
import { zip } from '@tsculpt/ts/arrays'

// Type for vectors of any dimension
export function zeroedArray(length: number, org: readonly number[], ones: number[]): number[] {
	return new Array(length).fill(0).map((_, i) => org[i] ?? (ones.includes(i) ? 1 : 0))
}
function error<T>(message: string): T {
	throw new Error(message)
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
	add(v: Vector): Vector {
		return Vector.from(zip(this as number[], v as number[]).map(([a, b]) => a + b))
	}
	sub(v: Vector): Vector {
		return Vector.from(zip(this as number[], v as number[]).map(([a, b]) => a - b))
	}
	prod(v: number | readonly number[]): Vector {
		return Vector.from(vecProd(this as number[], v) as number[])
	}
}
export class Vector2 extends Vector {
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
