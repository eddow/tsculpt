<script setup lang="ts">
import Panel from 'primevue/panel'

const props = defineProps<{
	error: Error
}>()
const slots = defineSlots<{
	default?: () => any
}>()
</script>
<template>
	<div class="error">
		<slot />
		<Panel header="Error" toggleable :collapsed="!slots.default">
			<pre>{{ props.error.message }}</pre>
			<Panel header="Stack" toggleable collapsed>
				<code>{{ props.error.stack }}</code>
			</Panel>
		</Panel>
	</div>
</template>
<style lang="sass" scoped>
.error
	overflow: auto
	max-width: 700px
	margin: 0 auto
</style>
