import { vector } from '../expression/linear'
import { Vector, Vector2, Vector3 } from './bunches'

function isTemplateStringsArray(v: unknown): v is TemplateStringsArray {
	return typeof v === 'object' && !!v && 'raw' in v
}

function expectDimension(v: Vector|Promise<Vector>, dim: number) {
	if(v instanceof Promise) throw new Error('Expected resolved vector, got promise')
	if (v.length !== dim) {
		throw new Error(`Expected vector of dimension ${dim}, got ${v.length}`)
	}
	return v
}

export function v2(x: number, y: number): Vector2
export function v2(v: readonly number[]): Vector2
export function v2(expr: TemplateStringsArray, ...values: readonly (number | Vector2)[]): Vector2
export function v2(coord: { x: number; y: number }): Vector2
export function v2(
	v: readonly number[] | number | TemplateStringsArray | { x: number; y: number },
	...rest: readonly (number | Vector2)[]
): Vector2 {
	const array = isTemplateStringsArray(v)
		? expectDimension(vector(v, ...rest), 2)
		: typeof v === 'object' && 'x' in v && 'y' in v
			? ([v.x, v.y] as Vector2)
			: typeof v === 'number'
				? [v, ...(rest as number[])]
				: Array.from(v)
	return new Vector2(...array)
}

export function v3(x: number, y: number, z: number): Vector3
export function v3(v: readonly number[]): Vector3
export function v3(expr: TemplateStringsArray, ...values: readonly (number | Vector3)[]): Vector3
export function v3(coord: { x: number; y: number; z: number }): Vector3
export function v3(
	v: readonly number[] | number | TemplateStringsArray | { x: number; y: number; z: number },
	...rest: readonly (number | Vector3)[]
): Vector3 {
	const array = isTemplateStringsArray(v)
		? expectDimension(vector(v, ...rest), 3)
		: typeof v === 'object' && 'x' in v && 'y' in v && 'z' in v
			? ([v.x, v.y, v.z] as Vector3)
			: typeof v === 'number'
				? [v, ...(rest as number[])]
				: Array.from(v)
	return new Vector3(...array)
}
