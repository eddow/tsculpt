import type { Computable, Computation, Computed, InvalidationListener, MaybeAsync } from './types'

const computedFacadeMarker = Symbol('computedFacadeMarker')
const forbiddenSyntheticMethods = new Set(['then', 'catch', 'finally'])

export interface ComputedProxyOptions {
	getMethod?: (property: string) => ((...args: readonly unknown[]) => unknown) | undefined
}

export function isPromiseLike<T>(value: unknown): value is PromiseLike<T> {
	return (
		(typeof value === 'object' || typeof value === 'function') &&
		value !== null &&
		'then' in value &&
		typeof value.then === 'function'
	)
}

function uniqueComputations(
	dependencies: readonly Computation<unknown>[]
): readonly Computation<unknown>[] {
	return Array.from(new Set(dependencies))
}

export function isComputation(value: unknown): value is Computation<unknown> {
	return (
		typeof value === 'object' &&
		value !== null &&
		'compute' in value &&
		'invalidate' in value &&
		'onInvalidate' in value &&
		typeof value.compute === 'function' &&
		typeof value.invalidate === 'function' &&
		typeof value.onInvalidate === 'function'
	)
}

export function isComputed(value: unknown): value is Computed<unknown> {
	return (
		isComputation(value) &&
		(typeof value === 'object' || typeof value === 'function') &&
		value !== null &&
		computedFacadeMarker in value
	)
}

export function resolveComputable<T>(value: Computable<T>): Promise<Awaited<T>> {
	if (isComputation(value)) {
		return value.compute() as Promise<Awaited<T>>
	}

	return Promise.resolve(value) as Promise<Awaited<T>>
}

export function resolveInputs(inputs: readonly unknown[]): Promise<readonly unknown[]> {
	return Promise.all(
		inputs.map((input) =>
			isComputation(input) || isPromiseLike(input)
				? Promise.resolve(resolveComputable(input))
				: input
		)
	)
}

export function collectComputations(inputs: readonly unknown[]): readonly Computation<unknown>[] {
	const dependencies: Computation<unknown>[] = []

	for (const input of inputs) {
		if (isComputation(input)) {
			dependencies.push(input)
		}
	}

	return uniqueComputations(dependencies)
}

function createComputedProxy<T>(
	target: ComputedValue<T>,
	options: ComputedProxyOptions
): Computed<T> {
	const methodCache = new Map<string, unknown>()

	Object.defineProperty(target, computedFacadeMarker, {
		value: true,
		enumerable: false,
		configurable: false,
	})

	return new Proxy(target, {
		get(original, property, receiver) {
			if (property === computedFacadeMarker) {
				return true
			}

			const existing = Reflect.get(original, property, receiver)
			if (existing !== undefined || typeof property !== 'string') {
				return typeof existing === 'function' ? existing.bind(original) : existing
			}

			if (forbiddenSyntheticMethods.has(property)) {
				return undefined
			}

			const cached = methodCache.get(property)
			if (cached !== undefined) {
				return cached
			}

			const method = options.getMethod?.(property)
			if (!method) {
				return undefined
			}

			const wrappedMethod = (...args: readonly unknown[]) => method(...args)
			methodCache.set(property, wrappedMethod)
			return wrappedMethod
		},
		has(original, property) {
			if (Reflect.has(original, property)) {
				return true
			}

			if (typeof property !== 'string' || forbiddenSyntheticMethods.has(property)) {
				return false
			}

			return options.getMethod?.(property) !== undefined
		},
	}) as unknown as Computed<T>
}

export abstract class AbstractComputation<T> implements Computation<T> {
	public abstract compute(): Promise<T>
	public abstract invalidate(): void
	public abstract onInvalidate(listener: InvalidationListener): () => void
}

export class RuntimeComputation<T> extends AbstractComputation<T> {
	readonly #computer: () => MaybeAsync<T>
	readonly #dependencies: readonly Computation<unknown>[]
	readonly #dependencySubscriptions: readonly (() => void)[]
	readonly #listeners = new Set<InvalidationListener>()

	#version = 0
	#cacheVersion = -1
	#currentPromise: Promise<T> | undefined

	public constructor(
		computer: () => MaybeAsync<T>,
		dependencies: readonly Computation<unknown>[] = []
	) {
		super()
		this.#computer = computer
		this.#dependencies = uniqueComputations(dependencies)
		this.#dependencySubscriptions = this.#dependencies.map((dependency) =>
			dependency.onInvalidate(() => {
				this.invalidate()
			})
		)
	}

	public compute(): Promise<T> {
		if (this.#currentPromise && this.#cacheVersion === this.#version) {
			return this.#currentPromise
		}

		const runVersion = this.#version
		const promise = Promise.resolve()
			.then(() => this.#computer())
			.then(
				(value) => {
					if (this.#version === runVersion) {
						this.#currentPromise = promise
						this.#cacheVersion = runVersion
					}
					return value
				},
				(error: unknown) => {
					if (this.#version === runVersion) {
						this.#currentPromise = undefined
						this.#cacheVersion = -1
					}
					throw error
				}
			)

		this.#currentPromise = promise
		this.#cacheVersion = runVersion
		return promise
	}

	public invalidate(): void {
		this.#version += 1
		this.#currentPromise = undefined
		this.#cacheVersion = -1

		for (const listener of this.#listeners) {
			listener()
		}
	}

	public onInvalidate(listener: InvalidationListener): () => void {
		this.#listeners.add(listener)
		return () => {
			this.#listeners.delete(listener)
		}
	}

	public get dependencySubscriptions(): readonly (() => void)[] {
		return this.#dependencySubscriptions
	}
}

export function createComputation<T>(
	computer: () => MaybeAsync<T>,
	dependencies: readonly unknown[] = []
): Computation<T> {
	return new RuntimeComputation(computer, collectComputations(dependencies))
}

export function createDerivedComputation<T>(
	inputs: readonly unknown[],
	computer: (resolvedInputs: readonly unknown[]) => MaybeAsync<T>
): Computation<T> {
	return createComputation(async () => computer(await resolveInputs(inputs)), inputs)
}

export abstract class AbstractComputed<T> extends AbstractComputation<T> {}

export class ComputedValue<T> extends AbstractComputed<T> {
	protected readonly computation: Computation<T>

	public constructor(computation: Computation<T>, options: ComputedProxyOptions = {}) {
		super()
		this.computation = computation

		if (options.getMethod) {
			return createComputedProxy(this, options) as unknown as ComputedValue<T>
		}
	}

	public compute(): Promise<T> {
		return this.computation.compute()
	}

	public invalidate(): void {
		this.computation.invalidate()
	}

	public onInvalidate(listener: InvalidationListener): () => void {
		return this.computation.onInvalidate(listener)
	}
}

export class ComputedObject<T extends object> extends ComputedValue<T> {}
