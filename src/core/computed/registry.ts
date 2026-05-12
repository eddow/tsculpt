import {
	ComputedValue,
	createComputation,
	createDerivedComputation,
	isComputed,
	isComputation,
	isPromiseLike,
} from './base'
import type {
	Computation,
	Computed,
	ComputedClass,
	ComputedInstance,
	Constructor,
	InternalComputedClass,
} from './types'
import { computedClassFactorySymbol } from './types'

export interface ComputedRegistry {
	register<Base extends Constructor>(baseClass: Base, computedClass: ComputedClass<Base>): void
	get<Base extends Constructor>(baseClass: Base): ComputedClass<Base> | undefined
	find(value: object): ComputedClass | undefined
	wrap<T>(value: T | Promise<T> | Computation<Awaited<T>>): Computed<Awaited<T>>
}

const computedClasses = new Map<Constructor, ComputedClass>()

function instantiateComputedClass<Base extends Constructor>(
	computedClass: ComputedClass<Base>,
	computation: Computation<InstanceType<Base>>
): ComputedInstance<Base> {
	const internalComputedClass = computedClass as InternalComputedClass<Base>
	return internalComputedClass[computedClassFactorySymbol](computation)
}

function findComputedClassForResolvedValue(value: unknown): ComputedClass<Constructor<object>> | undefined {
	if ((typeof value !== 'object' && typeof value !== 'function') || value === null) {
		return undefined
	}

	return computedRegistry.find(value) as ComputedClass<Constructor<object>> | undefined
}

function instantiateResolvedComputedClass<T>(
	computation: Computation<Awaited<T>>,
	value: Awaited<T>
): Computed<Awaited<T>> | undefined {
	const computedClass = findComputedClassForResolvedValue(value)
	if (!computedClass) {
		return undefined
	}

	return instantiateComputedClass(
		computedClass,
		computation as unknown as Computation<object>
	) as unknown as Computed<Awaited<T>>
}

function wrapDeferredComputedValue<T>(computation: Computation<Awaited<T>>): Computed<Awaited<T>> {
	let promotedFacade: Computed<Awaited<T>> | undefined
	const genericFacade = wrapComputedValue(computation)

	const promote = async (): Promise<Computed<Awaited<T>> | undefined> => {
		if (promotedFacade) {
			return promotedFacade
		}

		const resolved = await computation.compute()
		promotedFacade = instantiateResolvedComputedClass(computation, resolved)
		return promotedFacade
	}

	return new ComputedValue(computation, {
		getMethod: (property) => {
			if (property === 'constructor') {
				return undefined
			}

			return (...args: readonly unknown[]) =>
				computedRegistry.wrap(
					createComputation(
						async () => {
							const promoted = await promote()
							if (promoted) {
								const method = Reflect.get(promoted as object, property)
								if (typeof method !== 'function') {
									throw new Error(
										`Property "${property}" is not exposed by the registered computed facade`
									)
								}

								const result = Reflect.apply(method, promoted, args)
								return isComputation(result) ? result.compute() : result
							}

							const fallbackMethod = Reflect.get(genericFacade as object, property)
							if (typeof fallbackMethod !== 'function') {
								throw new Error(`Property "${property}" is not a function on the computed value`)
							}

							const result = Reflect.apply(fallbackMethod, genericFacade, args)
							return isComputation(result) ? result.compute() : result
						},
						[computation, ...args]
					)
				)
		},
	}) as unknown as Computed<Awaited<T>>
}

export function wrapComputedValue<T>(
	value: T | Promise<T> | Computation<Awaited<T>>
): Computed<Awaited<T>> {
	const computation: Computation<Awaited<T>> = isComputation(value)
		? (value as unknown as Computation<Awaited<T>>)
		: createComputation(() => Promise.resolve(value) as Promise<Awaited<T>>)

	return new ComputedValue(computation, {
		getMethod: (property) => {
			if (property === 'constructor') {
				return undefined
			}

			return (...args: readonly unknown[]) =>
				computedRegistry.wrap(
					createDerivedComputation([computation, ...args], (resolvedInputs) => {
						const [self, ...resolvedArgs] = resolvedInputs

						if ((typeof self !== 'object' && typeof self !== 'function') || self === null) {
							throw new Error(
								`Cannot call computed method "${property}" on a non-object resolved value`
							)
						}

						const method = Reflect.get(self, property)
						if (typeof method !== 'function') {
							throw new Error(`Property "${property}" is not a function on the resolved value`)
						}

						return Reflect.apply(method, self, resolvedArgs)
					})
				)
		},
	}) as unknown as Computed<Awaited<T>>
}

export const computedRegistry: ComputedRegistry = {
	register<Base extends Constructor>(baseClass: Base, computedClass: ComputedClass<Base>) {
		computedClasses.set(baseClass, computedClass)
	},
	get<Base extends Constructor>(baseClass: Base) {
		return computedClasses.get(baseClass) as ComputedClass<Base> | undefined
	},
	find(value) {
		let prototype: object | null = value

		while (prototype) {
			const maybeConstructor =
				'constructor' in prototype ? Reflect.get(prototype, 'constructor') : undefined

			if (typeof maybeConstructor === 'function') {
				const registered = computedClasses.get(maybeConstructor as Constructor)
				if (registered) {
					return registered
				}
			}

			prototype = Object.getPrototypeOf(prototype)
		}

		return undefined
	},
	wrap<T>(value: T | Promise<T> | Computation<Awaited<T>>) {
		if (isComputed(value)) {
			return value as unknown as Computed<Awaited<T>>
		}

		if (isComputation(value)) {
			return wrapDeferredComputedValue(value as Computation<Awaited<T>>)
		}

		if (isPromiseLike(value)) {
			return wrapDeferredComputedValue(
				createComputation(() => Promise.resolve(value) as Promise<Awaited<T>>)
			)
		}

		if (typeof value === 'object' && value !== null) {
			const promoted = instantiateResolvedComputedClass(
				createComputation(() => value as Awaited<T>),
				value as Awaited<T>
			)
			if (promoted) {
				return promoted
			}
		}

		return wrapComputedValue(value)
	},
}
