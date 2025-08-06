<script setup lang="ts">
import Accordion from 'primevue/accordion'
import AccordionContent from 'primevue/accordioncontent'
import AccordionHeader from 'primevue/accordionheader'
import AccordionPanel from 'primevue/accordionpanel'
import { ref } from 'vue'

const props = defineProps<{
	error: Error
	shown?: ('error' | 'stack')[]
}>()
const slots = defineSlots<{
	default?: () => any
}>()
const shown = ref(props.shown ?? (slots.default ? [] : ['error']))
</script>
<template>
	<div class="error">
		<slot />
		<Accordion multiple :value="shown">
			<AccordionPanel value="error">
				<AccordionHeader>Error</AccordionHeader>
				<AccordionContent>{{ error.message }}</AccordionContent>
			</AccordionPanel>
			<AccordionPanel value="stack">
				<AccordionHeader>Stack</AccordionHeader>
				<AccordionContent>{{ error.stack }}</AccordionContent>
			</AccordionPanel>
		</Accordion>
	</div>
</template>
<style lang="sass" scoped>
.error
	overflow: auto
	max-width: 700px
	margin: 0 auto
</style>
