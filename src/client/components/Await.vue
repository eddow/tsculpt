<script lang="ts">
import { ComputedRef, Ref, computed, isRef, ref, watch } from 'vue'
import ErrorView from './ErrorView.vue'

export const waiting = Symbol('waiting')
export type AwaitedValue<T> = T | typeof waiting | Error
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
	if (!promise) return ref(waiting) as AwaitedRef<T>
	const cached = promiseCache.get(promise)
	if (cached) {
		return cached as AwaitedRef<T>
	}

	const rv: AwaitedRef<T> = ref(waiting) as AwaitedRef<T>
	promise
		.then((value) => {
			rv.value = value
		})
		.catch((error) => {
			rv.value = asError(error)
		})
	promiseCache.set(promise, rv)
	return rv
}

export function asError(err: any): Error {
	if (err instanceof Error) return err
	if (typeof err === 'string') return new Error(err)
	return new Error(String(err))
}

export function awaited<T>(source?: AcceptedWaitable<T>): AwaitedValue<T> {
	if (!source) return waiting
	while (true) {
		if (source instanceof Promise) source = awaitedPromise(source).value
		else if (isRef(source)) source = source.value
		else return source as AwaitedValue<T>
	}
}

export function hasResult<T>(value: AwaitedValue<T>): value is T {
	return value !== waiting && !(value instanceof Error)
}

export function erroneous(result: any): result is Error {
	if (result instanceof Error) console.log(result)
	return result instanceof Error
}

export type AcceptedWaitable<T> =
	| AwaitedValue<T>
	| Ref<AcceptedWaitable<T>>
	| Promise<AcceptedWaitable<T>>

export const thenComputed = <I, O = I>(
	promise: AcceptedWaitable<I>,
	fn: (input: I) => O = (x: I) => x as unknown as O
): ComputedRef<AwaitedValue<O>> =>
	computed(() => {
		const awaitedInput = awaited<I>(promise)
		if (awaitedInput === waiting) return waiting
		if (awaitedInput instanceof Error) return awaitedInput
		try {
			// Do *not* `awaited` the result of `fn` here,
			// otherwise resolving the promise will re-evaluate the computed and the function
			return /*awaited(*/ fn(awaitedInput) //)
		} catch (err) {
			return asError(err)
		}
	})
</script>
<script setup lang="ts" generic="T">

const props = defineProps<{
	await: AcceptedWaitable<T>
}>()

const result = thenComputed<T, T>(computed(()=> props.await) as AcceptedWaitable<T>)
const lastResults = ref<T | typeof waiting>(waiting) as Ref<T | typeof waiting>

defineSlots<{
	default: (props: { result: T }) => any
	loading: ()=> any
	error: (props: { error: Error })=> any
	always: (props: { result: AwaitedValue<T> })=> any
}>()
watch(result, async (result) => {
	const c = await result
	if(c !== waiting && !(c instanceof Error)) lastResults.value = c
})
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
		<template v-if="lastResults !== waiting">
			<div class="await-result" :style="lastResults !== result ? {display: 'none'} : {}">
				<slot :result="lastResults" />
			</div>
		</template>
	</slot>

</template>

<style lang="sass" scoped>
.await-result
	height: 100%
</style>
