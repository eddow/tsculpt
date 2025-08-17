import { zip } from "@tsculpt/ts/arrays"


export type MaybePromise<T> = T | Promise<T>
export type MaybePromiseBunch = { [k: string]: MaybePromise<any> } | MaybePromise<any>[]

export type Resolved<T> =
	T extends Promise<infer U> ? Resolved<U> :
	T
export type ResolvedBunch<T extends MaybePromiseBunch> =
	T extends { [k: string]: any } ? {
		[k in keyof T]: Resolved<T[k]>
	} : T extends (infer U)[] ? Resolved<U>[] : T

export function maybeAwait<Input extends MaybePromiseBunch, Output extends MaybePromise<any>>(
	input: Input,
	transform: (given: ResolvedBunch<Input>) => Output
): MaybePromise<Resolved<Output>> {
	if (Array.isArray(input)) {
		if (input.some(v => v instanceof Promise)) {
			return Promise.all(input).then(resolved => transform(resolved as ResolvedBunch<Input>)) as Resolved<Output>
		} else {
			return transform(input as ResolvedBunch<Input>) as Resolved<Output>
		}
	} else {
		const params = Object.entries(input)
		const inputs = params.map(([_, v]) => v)
		if (inputs.some(v => v instanceof Promise)) {
			return Promise.all(inputs).then(resolved => transform(
				Object.fromEntries(zip(params, resolved).map(([[k, _], r])=> [k, r])) as ResolvedBunch<Input>
			)) as Resolved<Output>
		} else {
			return transform(params as ResolvedBunch<Input>) as Resolved<Output>
		}
	}
}
