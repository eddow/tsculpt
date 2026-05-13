import { ComputedObject, createDerivedComputation } from './base'
import { type ComputedReturnMode, listComputedMethodMetadata } from './decorators'
import { computedRegistry, wrapComputedValue } from './registry'
import {
	type Computation,
	type ComputedClass,
	type ComputedFunction,
	type Constructor,
	type InternalComputedClass,
	computedClassFactorySymbol,
} from './types'

export interface ComputedClassOptions {
	name?: string
	autoRegister?: boolean
}

export interface LiftOptions {
	name?: string
}

const internalComputationSymbol = Symbol('internalComputation')

interface InternalConstruction<T> {
	readonly [internalComputationSymbol]: Computation<T>
}

function getInternalConstruction<T>(args: readonly unknown[]): Computation<T> | undefined {
	if (args.length !== 1) {
		return undefined
	}

	const [candidate] = args
	if (typeof candidate !== 'object' || candidate === null) {
		return undefined
	}

	return internalComputationSymbol in candidate
		? (candidate as InternalConstruction<T>)[internalComputationSymbol]
		: undefined
}

function setFunctionName(value: Function, name: string | undefined): void {
	if (!name) {
		return
	}

	Object.defineProperty(value, 'name', {
		value: name,
		configurable: true,
	})
}

function callResolvedMethod(
	target: object | Function,
	property: string,
	args: readonly unknown[]
): unknown {
	const method = Reflect.get(target, property)
	if (typeof method !== 'function') {
		throw new Error(`Property "${property}" is not a function on the resolved value`)
	}

	return Reflect.apply(method, target, args)
}

function wrapMethodResult<Base extends Constructor>(
	computedClass: InternalComputedClass<Base>,
	computation: Computation<unknown>,
	returns: ComputedReturnMode
) {
	if (returns === 'self') {
		return computedClass[computedClassFactorySymbol](computation as Computation<InstanceType<Base>>)
	}

	if (returns === 'value') {
		return wrapComputedValue(computation)
	}

	return computedRegistry.wrap(computation)
}

export function computedClass<Base extends Constructor>(
	BaseClass: Base,
	options: ComputedClassOptions = {}
): ComputedClass<Base> {
	type BaseInstance = InstanceType<Base>
	const decoratedMethods = listComputedMethodMetadata(BaseClass.prototype)

	class RuntimeComputed extends ComputedObject<BaseInstance> {
		public static readonly Base = BaseClass

		public static [computedClassFactorySymbol](
			computation: Computation<BaseInstance>
		): ReturnType<InternalComputedClass<Base>[typeof computedClassFactorySymbol]> {
			const internalConstruction: InternalConstruction<BaseInstance> = {
				[internalComputationSymbol]: computation,
			}

			return new RuntimeComputed(internalConstruction) as unknown as ReturnType<
				InternalComputedClass<Base>[typeof computedClassFactorySymbol]
			>
		}

		public constructor(...args: readonly unknown[]) {
			const computation: Computation<BaseInstance> =
				getInternalConstruction<BaseInstance>(args) ??
				(createDerivedComputation(args, (resolvedArgs) => {
					return new BaseClass(...(resolvedArgs as ConstructorParameters<Base>))
				}) as Computation<BaseInstance>)

			super(computation, {
				getMethod: (property) => {
					const metadata = decoratedMethods.get(property)
					if (!metadata) {
						return undefined
					}

					return (...methodArgs: readonly unknown[]) => {
						const resultComputation = createDerivedComputation(
							[computation, ...methodArgs],
							(resolvedInputs) => {
								const [self, ...resolvedArgs] = resolvedInputs

								if ((typeof self !== 'object' && typeof self !== 'function') || self === null) {
									throw new Error(
										`Cannot call computed method "${property}" on a non-object resolved value`
									)
								}

								return callResolvedMethod(self, property, resolvedArgs)
							}
						)

						return wrapMethodResult(internalComputedClass, resultComputation, metadata.returns)
					}
				},
			})
		}
	}

	const internalComputedClass = RuntimeComputed as unknown as InternalComputedClass<Base>
	setFunctionName(
		internalComputedClass,
		options.name ?? (BaseClass.name ? `Computed${BaseClass.name}` : undefined)
	)

	if (options.autoRegister !== false) {
		computedRegistry.register(BaseClass, internalComputedClass)
	}

	return internalComputedClass
}

export function lift<F extends (...args: never[]) => unknown>(
	fn: F,
	options: LiftOptions = {}
): ComputedFunction<F> {
	const lifted = (...args: readonly unknown[]) =>
		computedRegistry.wrap(
			createDerivedComputation(args, (resolvedArgs) => {
				return fn(...(resolvedArgs as Parameters<F>))
			})
		)

	setFunctionName(lifted, options.name ?? (fn.name || undefined))
	return lifted as ComputedFunction<F>
}
