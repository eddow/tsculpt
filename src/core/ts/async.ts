import { zip } from '@tsculpt/ts/arrays'
import {
	isComputation as isRuntimeComputation,
	resolveComputable as resolveRuntimeComputable,
} from '../computed/base'
import type { Computation } from '../computed/types'

export type MaybePromise<T> = T | Promise<T>
export type PromiseChain<T> = MaybePromise<T>
export type MaybePromiseBunch = { [k: string]: MaybePromise<any> } | MaybePromise<any>[]
export type MaybeComputable<T> = MaybePromise<T> | Computation<T>

export type Resolved<T> = T extends Promise<infer U> ? Resolved<U> : T
export type ResolvedComputable<T> = T extends Promise<infer U>
	? ResolvedComputable<U>
	: T extends Computation<infer U>
		? ResolvedComputable<U>
		: T
export type ResolvedBunch<T extends MaybePromiseBunch> = T extends { [k: string]: any }
	? {
			[k in keyof T]: Resolved<T[k]>
		}
	: T extends (infer U)[]
		? Resolved<U>[]
		: T

export function isPromiseLike<T>(value: unknown): value is PromiseLike<T> {
	return (
		(typeof value === 'object' || typeof value === 'function') &&
		value !== null &&
		'then' in value &&
		typeof value.then === 'function'
	)
}

export function isComputation<T>(value: unknown): value is Computation<T> {
	return isRuntimeComputation(value)
}

export async function resolveComputable<T>(value: T): Promise<ResolvedComputable<T>> {
	return resolveRuntimeComputable(await value) as Promise<ResolvedComputable<T>>
}

export function maybeAwait<Input extends MaybePromiseBunch, Output extends MaybePromise<any>>(
	input: Input,
	transform: (given: ResolvedBunch<Input>) => Output
): MaybePromise<Resolved<Output>> {
	if (Array.isArray(input)) {
		if (input.some((v) => isPromiseLike(v))) {
			return Promise.all(input).then((resolved) =>
				transform(resolved as ResolvedBunch<Input>)
			) as Resolved<Output>
		}
		return transform(input as ResolvedBunch<Input>) as Resolved<Output>
	}
	const params = Object.entries(input)
	const inputs = params.map(([_, v]) => v)
	if (inputs.some((v) => isPromiseLike(v))) {
		return Promise.all(inputs).then((resolved) =>
			transform(
				Object.fromEntries(
					zip(params, resolved).map(([[k, _], r]) => [k, r])
				) as ResolvedBunch<Input>
			)
		) as Resolved<Output>
	}
	return transform(input as ResolvedBunch<Input>) as Resolved<Output>
}

export function expectResolved<T>(value: T): ResolvedComputable<T> {
	if (isPromiseLike(value) || isComputation(value)) throw new Error('Value not resolved')
	return value as ResolvedComputable<T>
}
