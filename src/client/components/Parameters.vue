<template>
	<Accordion :multiple="true" v-model:value="shown" ref="accordionRef">
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
						<tr v-for="item in statistics" :key="item.field" :class="item.cssClass">
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
import { localStored } from '@client/lib/stores'
import { deepEqual } from '@client/lib/utils'
import type { AMesh, GenerationParameters, ParametersConfig } from '@tsculpt'
import { globalsConfig } from '@tsculpt/globals'
import { computed, ref } from 'vue'
import { AcceptedWaitable, awaited, hasResult } from './Await.vue'
import Parameter from './Parameter.vue'

const printabilityLabels: Record<string, string> = {
	printable: '\u2705 Printable',
	'not-watertight': '\u26A0\uFE0F Not watertight (has holes)',
	'non-manifold': '\u26A0\uFE0F Non-manifold edges',
	degenerate: '\u274C Degenerate (zero/negative volume)',
}

const printabilityClasses: Record<string, string> = {
	printable: 'status-ok',
	'not-watertight': 'status-warning',
	'non-manifold': 'status-warning',
	degenerate: 'status-error',
}

const shown = localStored('parameters-shown', ['parameters'])
const props = defineProps<{
	viewed: AcceptedWaitable<AMesh>
	parameters: GenerationParameters
	parametersConfig: ParametersConfig | false
}>()

const emit = defineEmits<(e: 'update:parameters', value: GenerationParameters) => void>()
const statistics = computed(() => {
	const viewed = awaited(props.viewed)
	if (!hasResult(viewed)) return []
	const basic = {
		vertices: viewed.vectors.length,
		faces: viewed.faces.length,
	}
	const entries: { field: string; value: string | number; cssClass?: string }[] =
		Object.entries(basic).map(([field, value]) => ({ field, value }))

	// Run geometry analysis for mesh health
	const stats = viewed.analyze()
	const fmt = (n: number) => (n < 0.01 && n > -0.01 ? '~0' : n.toFixed(2))

	entries.push(
		{ field: 'watertight', value: stats.isWatertight ? '\u2713 Yes' : '\u2717 No', cssClass: stats.isWatertight ? '' : 'status-warning' },
		{ field: 'manifold', value: stats.isManifold ? '\u2713 Yes' : '\u2717 No', cssClass: stats.isManifold ? '' : 'status-error' },
		{ field: 'printability', value: printabilityLabels[stats.printability] ?? stats.printability, cssClass: printabilityClasses[stats.printability] ?? '' },
		{ field: 'surface area', value: fmt(stats.surfaceArea) },
		{ field: 'volume', value: fmt(stats.volume) },
	)
	if (stats.boundaryEdges > 0) {
		entries.push({ field: 'holes (boundary edges)', value: stats.boundaryEdges, cssClass: 'status-warning' })
	}
	if (stats.nonManifoldEdges > 0) {
		entries.push({ field: 'non-manifold edges', value: stats.nonManifoldEdges, cssClass: 'status-error' })
	}

	return entries
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
	if (!deepEqual(props.parameters[name], value))
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

.status-ok
	color: #22c55e !important
	td, th
		color: #22c55e !important

.status-warning
	color: #eab308 !important
	td, th
		color: #eab308 !important

.status-error
	color: #ef4444 !important
	td, th
		color: #ef4444 !important
</style>
