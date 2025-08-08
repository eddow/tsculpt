<template>
	<template v-if="state.status === 'pending'">
		<slot name="loading">Loading...</slot>
	</template>
	<template v-else-if="state.status === 'error'">
		<slot name="error" :error="state.error">{{ state.error }}</slot>
	</template>
	<template v-else>
		<slot :value="state.value"></slot>
	</template>
</template>

<script setup lang="ts">
import { ref, toRef, watch } from 'vue'

const props = defineProps<{
	promise: Promise<any>
}>()

interface State {
	status: 'pending' | 'error' | 'success'
	error?: Error
	value?: any
}

const state = ref<State>({
	status: 'pending',
})

const promise = toRef(props, 'promise')
watch(
	promise,
	(promise) => {
		state.value = {
			status: 'pending',
		}
		promise
			.then((value) => {
				state.value = {
					status: 'success',
					value,
				}
			})
			.catch((value) => {
				state.value = {
					status: 'error',
					value,
				}
			})
	},
	{ immediate: true }
)
</script>
