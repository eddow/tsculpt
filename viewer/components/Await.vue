<script lang="ts">

import { computed, ComputedRef, Ref, ref, isRef } from 'vue'
import ErrorView from './ErrorView.vue'
import ProgressSpinner from 'primevue/progressspinner'

export const waiting = Symbol('waiting')
export type AwaitedValue<T> = T|typeof waiting|Error
export type AwaitedRef<T> = Ref<AwaitedValue<T>>
const promiseCache = new WeakMap<Promise<any>, Ref<any>>()

/**
 * Returns a ref that will be updated with the value of the promise.
 * If the promise is already resolved, the ref will be updated immediately.
 * If the promise is rejected, the ref will be updated with the error.
 * @param promise - The promise to ref.
 * @returns A ref that will be updated with the value of the promise, the waiting symbol if the promise is not resolved yet, or the error if the promise is rejected.
 */
function awaitedPromise<T>(promise?: Promise<T>): AwaitedRef<T> {
	if(!promise) return ref(waiting) as AwaitedRef<T>
	const cached = promiseCache.get(promise)
	if (cached) {
		return cached as AwaitedRef<T>
	}

	const rv: AwaitedRef<T> = ref(waiting) as AwaitedRef<T>
	promise.then(value => rv.value = value).catch(error => rv.value = error)
	promiseCache.set(promise, rv)
	return rv
}

export function asError(err: any): Error {
	if(err instanceof Error) return err
	if(typeof err === 'string') return new Error(err)
	return new Error(String(err))
}

export function awaited<T>(source?: any): AwaitedValue<T> {
	if(!source) return waiting
	while(true) {
		if(source instanceof Promise)
			source = awaitedPromise(source).value
		else if(isRef(source))
			source = source.value
		else if(typeof source === 'function') {
			try {
				source = source()
			} catch(err) {
				return asError(err)
			}
		} else
			return source as AwaitedValue<T>
	}
}

type AcceptedWaitable<T> =
	| T
	| Ref<AcceptedWaitable<T>>
	| Promise<AcceptedWaitable<T>>
	| (()=> AcceptedWaitable<T>)

export const thenComputed = <I, O = I>(
	promise: AcceptedWaitable<I>,
	fn: (input: I)=> O = (x: I)=> x as unknown as O
): ComputedRef<AwaitedValue<O>> =>
	computed(()=> {
		const awaitedInput = awaited<I>(promise)
		if(awaitedInput === waiting) return waiting
		if(awaitedInput instanceof Error) return awaitedInput
		try {
			return fn(awaitedInput)
		} catch(err) {
			return asError(err)
		}
	})

</script>
<script setup lang="ts" generic="T">

const props = defineProps<{
	await: AcceptedWaitable<T>
}>()

const result = thenComputed<T, T>(computed(()=> props.await) as AcceptedWaitable<T>)

function erroneous(result: any) {
	if(result instanceof Error) console.log(result)
	return result instanceof Error
}

defineSlots<{
	default: (props: { result: T }) => any
	loading: ()=> any
	error: (props: { error: Error })=> any
	always: (props: { result: AwaitedValue<T> })=> any
}>()

</script>
<template>

	<slot name="always" :result="result">
		<template v-if="result === waiting">
			<slot name="loading"><ProgressSpinner /></slot>
		</template>
		<template v-else-if="erroneous(result)">
			<slot name="error" :error="result">
				<ErrorView :error="result" />
			</slot>
		</template>
		<template v-else><slot :result="result" /></template>
	</slot>

</template>
