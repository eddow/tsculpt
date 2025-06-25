import { SemanticError, matrix, vector } from '../expression'
import {
	Matrix,
	Matrix2,
	Matrix3,
	Matrix4,
	NumberBunch,
	Vector,
	Vector2,
	Vector3,
	Vector4,
} from './bunches'

export function v2(x: number, y: number): Vector2
export function v2(v: readonly number[]): Vector2
export function v2(
	v: readonly number[] | number | TemplateStringsArray,
	...rest: readonly (number | Vector)[]
): Vector2 {
	if (typeof v === 'object' && 'raw' in v) {
		const result = vector(v, ...rest)
		if (result.length !== 2) throw new SemanticError(`Bad vector size: ${result.length}`)
		return result as Vector2
	}
	const array = typeof v === 'number' ? [v, ...(rest as number[])] : Array.from(v)
	return new Vector2(...array)
}

export function v3(x: number, y: number, z: number): Vector3
export function v3(v: readonly number[]): Vector3
export function v3(expr: TemplateStringsArray, ...values: readonly (number | Vector3)[]): Vector3
export function v3(
	v: readonly number[] | number | TemplateStringsArray,
	...rest: readonly (number | Vector)[]
): Vector3 {
	if (typeof v === 'object' && 'raw' in v) {
		const result = vector(v, ...rest)
		if (result.length !== 3) throw new SemanticError(`Bad vector size: ${result.length}`)
		return result as Vector3
	}
	const array = typeof v === 'number' ? [v, ...(rest as number[])] : Array.from(v)
	return new Vector3(...array)
}

export function v4(x: number, y: number, z: number, w: number): Vector4
export function v4(v: readonly number[]): Vector4
export function v4(expr: TemplateStringsArray, ...values: readonly (number | Vector4)[]): Vector4
export function v4(
	v: readonly number[] | number | TemplateStringsArray,
	...rest: readonly (number | Vector)[]
): Vector4 {
	if (typeof v === 'object' && 'raw' in v) {
		const result = vector(v, ...rest)
		if (result.length !== 4) throw new SemanticError(`Bad vector size: ${result.length}`)
		return result as Vector4
	}
	const array = typeof v === 'number' ? [v, ...(rest as number[])] : Array.from(v)
	return new Vector4(...array)
}

export function m2(v: readonly number[]): Matrix2
export function m2(
	v: readonly number[] | TemplateStringsArray,
	...rest: readonly (number | NumberBunch)[]
): Matrix {
	if (typeof v === 'object' && 'raw' in v) {
		const result = matrix(v, ...rest)
		if (result.length !== 4) throw new SemanticError(`Bad matrix size: ${result.length}`)
		return result as Matrix2
	}
	const array = typeof v === 'number' ? [v, ...(rest as number[])] : Array.from(v)
	return new Matrix2(...array)
}

export function m3(v: readonly number[]): Matrix3
export function m3(
	v: readonly number[] | TemplateStringsArray,
	...rest: readonly (number | NumberBunch)[]
): Matrix {
	if (typeof v === 'object' && 'raw' in v) {
		const result = matrix(v, ...rest)
		if (result.length !== 9) throw new SemanticError(`Bad matrix size: ${result.length}`)
		return result as Matrix3
	}
	const array = typeof v === 'number' ? [v, ...(rest as number[])] : Array.from(v)

	return new Matrix3(...array)
}

export function m4(v: readonly number[]): Matrix4
export function m4(
	v: readonly number[] | TemplateStringsArray,
	...rest: readonly (number | NumberBunch)[]
): Matrix {
	if (typeof v === 'object' && 'raw' in v) {
		const result = matrix(v, ...rest)
		if (result.length !== 16) throw new SemanticError(`Bad matrix size: ${result.length}`)
		return result as Matrix4
	}
	const array = typeof v === 'number' ? [v, ...(rest as number[])] : Array.from(v)
	return new Matrix4(...array)
}
