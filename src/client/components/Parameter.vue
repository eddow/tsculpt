<script setup lang="ts">
import type { ParameterConfig } from '@tsculpt'
import { defaultGlobals } from '@tsculpt/globals'
import { computed } from 'vue'
import SlidParameter from './SlidParameter.vue'

const props = defineProps<{
	name: string
	config: ParameterConfig
	modelValue: any
}>()

const emit = defineEmits<(e: 'update:modelValue', value: any) => void>()
const value = computed({
	get: () => props.modelValue,
	set: (val) => emit('update:modelValue', val),
})

const min = computed(() => {
	if (props.config.type === 'Exponential') return -Math.log(props.config.args[0] || 10)
	if (props.config.type === 'Decimal' || props.config.type === 'Integer') {
		return [Number.POSITIVE_INFINITY, undefined].includes(props.config.args[0])
			? Number.NEGATIVE_INFINITY
			: props.config.args[0]
	}
	return Number.NEGATIVE_INFINITY
})

const max = computed(() => {
	if (props.config.type === 'Exponential') return Math.log(props.config.args[0] || 10)
	if (props.config.type === 'Decimal' || props.config.type === 'Integer') {
		return [Number.POSITIVE_INFINITY, undefined].includes(props.config.args[1])
			? Number.POSITIVE_INFINITY
			: props.config.args[1]
	}
	return Number.POSITIVE_INFINITY
})

// For exponential type, map between slider space and value space
function sliderToValue(sliderVal: number) {
	if (props.config.type !== 'Exponential') return sliderVal
	return Math.exp(sliderVal)
}

function valueToSlider(val: number) {
	if (props.config.type !== 'Exponential') return val
	return Math.log(val)
}

// For Vector types
const vectorComponents = computed(() => {
	if (props.config.type === 'Vector2') return ['x', 'y']
	if (props.config.type === 'Vector3') return ['x', 'y', 'z']
	return []
})

const updateVectorComponent = (index: number, val: number) => {
	const newValue = [...value.value]
	newValue[index] = val
	value.value = newValue
}

// Clone the default value to avoid mutations
const defaultValue = computed(() => {
	// For global parameters, use defaultGlobals
	if (props.name in defaultGlobals) {
		return defaultGlobals[props.name as keyof typeof defaultGlobals]
	}
	// For other parameters, use config default
	if (Array.isArray(props.config.default)) {
		return [...props.config.default]
	}
	return props.config.default
})

const isDefault = computed(() => {
	if (props.name in defaultGlobals) {
		return props.modelValue === defaultGlobals[props.name as keyof typeof defaultGlobals]
	}
	if (Array.isArray(props.modelValue)) {
		return props.modelValue.every((v, i) => v === defaultValue.value[i])
	}
	return props.modelValue === defaultValue.value
})

const resetToDefault = () => {
	emit(
		'update:modelValue',
		Array.isArray(defaultValue.value) ? [...defaultValue.value] : defaultValue.value
	)
}
</script>

<template>
	<div class="parameter">
		<div class="parameter-header">
			<label>{{ name }}</label>
			<Button
				icon="pi pi-refresh"
				class="p-button-text p-button-sm"
				@click="resetToDefault"
				:disabled="isDefault"
				:tooltip="'Reset to default'"
			/>
		</div>

		<!-- Decimal type with debounced slider -->
		<div v-if="config.type === 'Decimal'">
			<SlidParameter
				v-model="value"
				:min="min"
				:max="max"
				:step="0.1"
			/>
		</div>

		<!-- Exponential type with logarithmic slider -->
		<div v-else-if="config.type === 'Exponential'">
			<SlidParameter
				v-model="value"
				:min="min"
				:max="max"
				:step="0.1"
				:sliderToValue="sliderToValue"
				:valueToSlider="valueToSlider"
			/>
		</div>

		<!-- Integer type -->
		<div v-else-if="config.type === 'Integer'">
			<InputNumber
				:modelValue="value"
				@update:modelValue="val => value = val"
				:min="min"
				:max="max"
				:step="1"
				class="number-input"
				:showButtons="true"
				buttonLayout="stacked"
				decrementButtonClass="p-button-secondary"
				incrementButtonClass="p-button-secondary"
				incrementButtonIcon="pi pi-plus"
				decrementButtonIcon="pi pi-minus"
			/>
		</div>

		<!-- Vector types -->
		<div class="vector-group" v-else-if="config.type === 'Vector2' || config.type === 'Vector3'">
			<div v-for="(component, i) in vectorComponents" :key="component" class="vector-component">
				<label>{{ component }}</label>
				<InputNumber
					:modelValue="value[i] ?? defaultValue[i]"
					@update:modelValue="val => updateVectorComponent(i, val)"
					:step="0.1"
					class="vector-input" />
			</div>
		</div>

		<!-- Boolean type -->
		<div class="boolean-group" v-else-if="config.type === 'boolean'">
			<InputSwitch v-model="value" />
		</div>

		<!-- Union type (select) -->
		<div class="union-group" v-else-if="config.type === 'Union'">
			<Select
				v-model="value"
				:options="config.args"
				class="w-full" />
		</div>
	</div>
</template>

<style scoped lang="sass">
.parameter
	display: flex
	flex-direction: column
	gap: 0.5rem
	padding: 0.5rem

	.parameter-header
		display: flex
		justify-content: space-between
		align-items: center

		label
			color: var(--text-color-secondary)
			font-size: 0.875rem

.vector-group
	display: flex
	flex-direction: column
	gap: 0.5rem

	.vector-component
		display: flex
		align-items: center
		gap: 0.5rem

		label
			width: 1.5rem
			text-align: center

		.vector-input
			flex: 1

.boolean-group, .union-group
	padding: 0.25rem 0

.number-input
	width: 100%
</style>
