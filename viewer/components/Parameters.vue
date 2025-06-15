<template>
	<div v-if="allParametersConfig" class="parameters">
		<div class="parameters-header">
			<h2>Parameters</h2>
			<Button
				icon="pi pi-refresh"
				class="p-button-text"
				@click="resetAllToDefaults"
				:disabled="!hasChanges"
				:tooltip="'Reset all to defaults'"
			/>
		</div>
		<div class="parameters-list">
			<Parameter
				v-for="(config, name) in allParametersConfig"
				:key="name"
				:name="name"
				:config="config"
				:model-value="parameters[name] ?? config.default"
				@update:model-value="value => updateParameter(name, value)"
			/>
		</div>
	</div>
	<div v-else class="parameters">
		<div class="parameters-header">
			<h2>No Parameters Available</h2>
		</div>
	</div>
</template>

<script setup lang="ts">
import Button from 'primevue/button'
import type { GenerationParameters, ParametersConfig } from '@tsculpt'
import { globalsConfig } from '@tsculpt/globals'
import { computed } from 'vue'
import Parameter from './Parameter.vue'

const props = defineProps<{
	parameters: GenerationParameters
	parametersConfig: ParametersConfig | false
}>()

const emit = defineEmits<(e: 'update:parameters', value: GenerationParameters) => void>()
const allParametersConfig = computed(() => {
	return props.parametersConfig === false
		? false
		: ({ ...globalsConfig, ...props.parametersConfig } as ParametersConfig)
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
.parameters
	height: 100%
	display: flex
	flex-direction: column
	background: var(--surface-ground)

	.parameters-header
		padding: 1rem
		border-bottom: 1px solid var(--surface-border)
		display: flex
		justify-content: space-between
		align-items: center

		h2
			margin: 0
			font-size: 1.2rem
			font-weight: 600
			color: var(--text-color)

	.parameters-list
		flex: 1
		overflow-y: auto
		padding: 1rem
		display: flex
		flex-direction: column
		gap: 1rem
</style>
