import { ParametersConfig } from './types/parameters'

type MaybePromise<T> = Promise<T> | T
export type GenerationParameters = {
	/**
	 * The grain of the generated geometry.
	 * Curves are approximated by straight lines smaller than this value.
	 * @default 0.5
	 */
	grain: number
	[key: string]: any
}

export const globalsConfig: ParametersConfig = {
	grain: {
		default: 0.5,
		type: 'Exponential',
		args: [20],
	},
}

export const defaultGlobals: GenerationParameters = {
	grain: 0.5,
}
export const generation: GenerationParameters = { ...defaultGlobals }

let globalUsage: Promise<void> | undefined
function useGlobals(usedGlobals: GenerationParameters) {
	for (const key of Object.keys(generation)) delete generation[key]
	Object.assign(generation, usedGlobals)
}
export function withGlobals<T>(
	fn: () => MaybePromise<T>,
	usedGlobals: GenerationParameters
): Promise<T> {
	if (globalUsage) return globalUsage.then(() => withGlobals(fn, usedGlobals))
	useGlobals(usedGlobals)
	const call = fn()
	if (!(call instanceof Promise)) return Promise.resolve(call)
	globalUsage = call.then(() => {
		useGlobals(defaultGlobals)
		globalUsage = undefined
	})
	return call
}
