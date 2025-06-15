export type Vector2 = readonly [number, number]
export type Vector3 = readonly [number, number, number]

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
