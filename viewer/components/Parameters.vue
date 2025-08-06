<template>
	{{ accordionRef?.value?.value }}
	<div v-if="viewed === waiting">
		<h2>Loading...</h2>
	</div>
	<Accordion v-else :multiple="true" v-model:value="shown" ref="accordionRef">
		<AccordionPanel value="parameters" v-if="allParametersConfig">
			<AccordionHeader>
				Parameters
				<Button
					v-if="parametersTabExpanded"
					icon="pi pi-refresh"
					class="p-button-text p-button-sm right-button"
					@click.stop="resetAllToDefaults"
					:disabled="!hasChanges"
					:tooltip="'Reset all to defaults'"
				/>
			</AccordionHeader>
			<AccordionContent>
				<Parameter
					v-for="(config, name) in allParametersConfig"
					:key="name"
					:name="name"
					:config="config"
					:model-value="parameters[name] ?? config.default"
					@update:model-value="value => updateParameter(name, value)"
				/>
			</AccordionContent>
		</AccordionPanel>
		<AccordionPanel value="parameters" v-else>
			<AccordionHeader>Parameters</AccordionHeader>
			<AccordionContent>
				<h2>No Parameters Available</h2>
			</AccordionContent>
		</AccordionPanel>
		<AccordionPanel value="statistics">
			<AccordionHeader>Statistics</AccordionHeader>
			<AccordionContent>
				<table class="statistics-table">
					<tbody>
						<tr v-for="item in statistics" :key="item.field">
							<th>{{ item.field }}</th>
							<td>{{ item.value }}</td>
						</tr>
					</tbody>
				</table>
			</AccordionContent>
		</AccordionPanel>
	</Accordion>
</template>

<script setup lang="ts">
import { localStored } from '@/lib/stores'
import type { GenerationParameters, IMesh, ParametersConfig } from '@tsculpt'
import { globalsConfig } from '@tsculpt/globals'
import Accordion from 'primevue/accordion'
import AccordionContent from 'primevue/accordioncontent'
import AccordionHeader from 'primevue/accordionheader'
import AccordionPanel from 'primevue/accordionpanel'
import Button from 'primevue/button'
import { computed, ref } from 'vue'
import { AwaitedValue, hasResult, waiting } from './Await.vue'
import Parameter from './Parameter.vue'

const shown = localStored('parameters-shown', ['parameters'])
const props = defineProps<{
	viewed: AwaitedValue<IMesh>
	parameters: GenerationParameters
	parametersConfig: ParametersConfig | false
}>()

const emit = defineEmits<(e: 'update:parameters', value: GenerationParameters) => void>()
const statistics = computed(() => {
	const viewed = props.viewed
	if (!hasResult(viewed)) return []
	const stats = {
		vertices: viewed.vectors.length,
		faces: viewed.faces.length,
	}
	return Object.entries(stats).map(([field, value]) => ({ field, value }))
})
const accordionRef = ref()

const allParametersConfig = computed(() => {
	return props.parametersConfig === false
		? false
		: ({ ...globalsConfig, ...props.parametersConfig } as ParametersConfig)
})

// Check if parameters tab is expanded by looking for the active class
const parametersTabExpanded = computed(() => {
	if (!accordionRef.value) return true
	const panels = accordionRef.value.$el?.querySelectorAll('.p-accordion-panel')
	if (!panels || panels.length === 0) return true
	return panels[0]?.classList.contains('p-accordionpanel-active')
})

const updateParameter = (name: string, value: any) => {
	emit('update:parameters', {
		...props.parameters,
		[name]: value,
	})
}

// Initialize undefined parameters with their defaults
const ensureDefaults = () => {
	const updates: Record<string, any> = {}
	let hasUpdates = false

	if (props.parametersConfig) {
		for (const [name, config] of Object.entries(props.parametersConfig)) {
			if (props.parameters[name] === undefined) {
				updates[name] = Array.isArray(config.default) ? [...config.default] : config.default
				hasUpdates = true
			}
		}
	}

	if (hasUpdates) {
		emit('update:parameters', {
			...props.parameters,
			...updates,
		})
	}
}

// Reset all parameters to their defaults
const resetAllToDefaults = () => {
	if (!props.parametersConfig) return

	const defaults = {} as GenerationParameters
	for (const [name, config] of Object.entries(allParametersConfig.value)) {
		defaults[name] = Array.isArray(config.default) ? [...config.default] : config.default
	}

	emit('update:parameters', defaults)
}

// Check if any parameter differs from its default
const hasChanges = computed(() => {
	if (!props.parametersConfig) return false
	return Object.entries(allParametersConfig.value).some(([name, config]) => {
		const current = props.parameters[name]
		const def = config.default

		if (Array.isArray(current) && Array.isArray(def)) {
			return current.some((v, i) => v !== def[i])
		}
		return current !== undefined && current !== def
	})
})

// Initialize defaults on mount
ensureDefaults()
</script>
<style lang="sass">
.right-button
	margin-left: auto
	margin-right: .5rem

.statistics-table
	width: 100%
	border-collapse: collapse
	margin: 0.5rem 0

	th
		font-weight: 600
		color: var(--text-color-secondary)
		padding: 0.25rem 0.5rem 0.25rem 0
		width: 40%
		text-align: right

	td
		padding: 0.25rem 0
		color: var(--text-color)
		font-family: var(--font-family-mono)
</style>
