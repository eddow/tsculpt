import type { ComputedClass, ComputedFunction, Constructor } from './types'
export interface ComputedClassOptions {
	name?: string
	autoRegister?: boolean
}
export interface LiftOptions {
	name?: string
}
export declare function computedClass<Base extends Constructor>(
	_BaseClass: Base,
	_options?: ComputedClassOptions
): ComputedClass<Base>
export declare function lift<F extends (...args: any[]) => any>(
	_fn: F,
	_options?: LiftOptions
): ComputedFunction<F>
