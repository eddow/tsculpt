export type Vector2 = readonly [number, number]
export type Vector3 = readonly [number, number, number]

export function v2(x: number, y: number): Vector2
export function v2(v: number[]): Vector2
export function v2(v: number[] | number, ...rest: number[]): Vector2 {
	const array = typeof v === 'number' ? [v, ...rest] : Array.from(v)
	if (array.length === 2) {
		return array as unknown as Vector2
	}
	return [array[0], array[1]] as Vector2
}

export function v3(x: number, y: number, z: number): Vector3
export function v3(v: number[]): Vector3
export function v3(v: number[] | number, ...rest: number[]): Vector3 {
	const array = typeof v === 'number' ? [v, ...rest] : Array.from(v)
	if (array.length === 3) {
		return array as unknown as Vector3
	}
	return [array[0], array[1], array[2]] as Vector3
}


// @ts-expect-error The type is for reflection purposes only
export type Decimal<Min = typeof Infinity, Max = typeof Infinity> = number
// @ts-expect-error The type is for reflection purposes only
export type Integer<Min = typeof Infinity, Max = typeof Infinity> = number
// @ts-expect-error The type is for reflection purposes only
export type Exponential<Range = 10> = number

export type ParameterConfig = {
	default: any | { raw: string }
	type: string | 'Union' | 'Exponential' | 'Decimal' | 'Integer' | 'Vector2' | 'Vector3' | 'boolean'
	args: any[]
}
export type ParametersConfig = Record<string, ParameterConfig>
