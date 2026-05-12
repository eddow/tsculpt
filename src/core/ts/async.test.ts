import { describe, expect, it } from 'vitest'
import { generation, withGlobals } from '../globals'
import { isComputation, isPromiseLike, maybeAwait, resolveComputable } from './async'

describe('async helpers', () => {
	it('keeps sync object inputs intact in maybeAwait', () => {
		const sum = maybeAwait({ left: 2, right: 3 }, ({ left, right }) => left + right)
		expect(sum).toBe(5)
	})

	it('treats promises as promise-like inputs', async () => {
		const doubled = maybeAwait([Promise.resolve(4)], ([value]) => value * 2)
		expect(isPromiseLike(doubled)).toBe(true)
		await expect(doubled).resolves.toBe(8)
	})

	it('resolves computations after awaiting outer async values', async () => {
		const computation = {
			compute: async () => 7,
			invalidate: () => {},
			onInvalidate: () => () => {},
		}

		expect(isComputation(computation)).toBe(true)
		await expect(resolveComputable(Promise.resolve(computation))).resolves.toBe(7)
	})

	it('lets computed resolution observe globals inside withGlobals', async () => {
		const previousGrain = generation.grain
		const computation = {
			compute: async () => generation.grain,
			invalidate: () => {},
			onInvalidate: () => () => {},
		}

		const grain = await withGlobals(() => resolveComputable(computation), { grain: 0.125 })
		expect(grain).toBe(0.125)
		expect(generation.grain).toBe(0.125)
		generation.grain = previousGrain
	})
})
