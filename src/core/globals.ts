import { MaybePromise } from './ts/maybe'
import { Semaphore } from './ts/semaphore'
import { ParametersConfig } from './types/parameters'
export type GenerationParameters = {
	/**
	 * The grain of the generated geometry.
	 * Curves are approximated by smallest straight lines bigger than this value.
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

const globalUsage = new Semaphore()
function useGlobals(usedGlobals: GenerationParameters) {
	for (const key of Object.keys(generation)) delete generation[key]
	Object.assign(generation, usedGlobals)
}
export async function withGlobals<T>(
	fn: () => MaybePromise<T>,
	usedGlobals: GenerationParameters
): Promise<T> {
	return globalUsage.execute(() => {
		useGlobals(usedGlobals)
		return fn()
	})
}
