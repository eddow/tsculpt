import { describe, expect, it } from 'vitest'
import { computed } from './decorators'
import { computedClass, lift } from './factories'
import { createComputation } from './base'
import { computedRegistry } from './registry'

class CounterBase {
	public constructor(readonly value: number) {}

	@computed({ returns: 'self' })
	public add(step: number): CounterBase {
		return new CounterBase(this.value + step)
	}

	@computed()
	public multiply(factor: number): CounterBase {
		return new CounterBase(this.value * factor)
	}

	@computed({ returns: 'value' })
	public valuePlus(step: number): number {
		return this.value + step
	}

	public hidden(step: number): CounterBase {
		return new CounterBase(this.value - step)
	}
}

class DerivedCounterBase extends CounterBase {}

class CounterHolderBase {
	public constructor(readonly value: number) {}

	@computed()
	public makeCounter(step: number): CounterBase {
		return new CounterBase(this.value + step)
	}
}

describe('computed runtime', () => {
	it('exposes decorated methods and hides undecorated ones', async () => {
		const Counter = computedClass(CounterBase)
		const counter = new Counter(2)

		expect('add' in counter).toBe(true)
		expect('multiply' in counter).toBe(true)
		expect('valuePlus' in counter).toBe(true)
		expect('hidden' in counter).toBe(false)

		const next = counter.multiply(3).add(1)
		const resolved = await next.compute()

		expect(resolved).toBeInstanceOf(CounterBase)
		expect(resolved.value).toBe(7)
		expect(await counter.valuePlus(5).compute()).toBe(7)
	})

	it('reuses cached computations until invalidated', async () => {
		let sourceCalls = 0
		let derivedCalls = 0

		const source = computedRegistry.wrap(
			createComputation(() => {
				sourceCalls += 1
				return 2
			})
		)

		const plusOne = lift((value: number) => {
			derivedCalls += 1
			return value + 1
		})(source)

		const firstPromise = plusOne.compute()
		const secondPromise = plusOne.compute()

		expect(firstPromise).toBe(secondPromise)
		expect(await firstPromise).toBe(3)
		expect(sourceCalls).toBe(1)
		expect(derivedCalls).toBe(1)

		source.invalidate()

		expect(await plusOne.compute()).toBe(3)
		expect(sourceCalls).toBe(2)
		expect(derivedCalls).toBe(2)
	})

	it('supports lifted functions that return base objects', async () => {
		const makeCounter = lift((value: number) => new CounterBase(value))
		const result = makeCounter(4).add(3).multiply(2)
		const resolved = await result.compute()

		expect(resolved).toBeInstanceOf(CounterBase)
		expect(resolved.value).toBe(14)
	})

	it('promotes lifted computations to the registered facade', async () => {
		const makeCounter = lift(async (value: number) => new CounterBase(value))
		const counter = makeCounter(4)

		expect(await counter.add(2).compute()).toMatchObject({ value: 6 })
		await expect(counter.hidden(1).compute()).rejects.toThrow(
			'not exposed by the registered computed facade'
		)
	})

	it('promotes cross-class returns through the registry', async () => {
		const Holder = computedClass(CounterHolderBase)
		const holder = new Holder(3)

		expect(await holder.makeCounter(4).multiply(2).compute()).toMatchObject({ value: 14 })
		await expect(holder.makeCounter(4).hidden(1).compute()).rejects.toThrow(
			'not exposed by the registered computed facade'
		)
	})

	it('finds registered computed classes through the prototype chain', () => {
		const Counter = computedClass(CounterBase)
		expect(computedRegistry.find(new DerivedCounterBase(1))).toBe(Counter)
	})
})
