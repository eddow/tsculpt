<script lang="ts">
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
export function awaited<T>(promise?: Promise<T>): AwaitedRef<T> {
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
</script>
<script setup lang="ts" generic="T">
import { computed, Ref, ref } from 'vue'
import Accordion from 'primevue/accordion'
import AccordionContent from 'primevue/accordioncontent'
import AccordionHeader from 'primevue/accordionheader'
import AccordionPanel from 'primevue/accordionpanel'
import ProgressSpinner from 'primevue/progressspinner'

const props = defineProps<{
	await: Promise<T> | T | AwaitedValue<T>
}>()

const result = computed(() => {
	if (props.await instanceof Promise) {
		return awaited(props.await).value
	}
	return props.await
})
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
				<Accordion multiple :value="['error']" class="error">
					<AccordionPanel value="error">
						<AccordionHeader>Error</AccordionHeader>
						<AccordionContent>{{ result.message }}</AccordionContent>
					</AccordionPanel>
					<AccordionPanel value="stack">
						<AccordionHeader>Stack</AccordionHeader>
						<AccordionContent>{{ result.stack }}</AccordionContent>
					</AccordionPanel>
				</Accordion>
			</slot>
		</template>
		<template v-else><slot :result="result" /></template>
	</slot>
</template>
<style lang="sass" scoped>
.error
	overflow: auto
	max-width: 700px
	margin: 0 auto
</style>
