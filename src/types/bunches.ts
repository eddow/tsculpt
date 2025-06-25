// Type for vectors of any dimension
export function zeroedArray(length: number, org: readonly number[]): number[] {
	return new Array(length).fill(0).map((_, i) => org[i] ?? 0)
}
export class Vector extends Array<number> {
	static from(v: readonly number[]): Vector {
		return v.length === 2 ? new Vector2(...v) :
			v.length === 3 ? new Vector3(...v) :
			v.length === 4 ? new Vector4(...v) :
			new Vector(...v)
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
}
export class Vector2 extends Vector {
	constructor(...v: readonly number[]) {
		super(...zeroedArray(2, v))
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
		super(...zeroedArray(3, v))
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
		super(...zeroedArray(4, v))
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

export class Matrix extends Array<number> {
	static from(v: readonly number[]): Matrix {
		return v.length === 4 ? new Matrix2(...v) :
			v.length === 9 ? new Matrix3(...v) :
			v.length === 16 ? new Matrix4(...v) :
			new Matrix(...v)
	}
}

export class Matrix2 extends Matrix {
	constructor(...v: readonly number[]) {
		super(...zeroedArray(4, v))
	}
	override get length() {
		return 4
	}
}

export class Matrix3 extends Matrix {
	constructor(...v: readonly number[]) {
		super(...zeroedArray(9, v))
	}
	override get length() {
		return 9
	}
}

export class Matrix4 extends Matrix {
	constructor(...v: readonly number[]) {
		super(...zeroedArray(16, v))
	}
	override get length() {
		return 16
	}
}

export type NumberBunch = number | Vector | Matrix
