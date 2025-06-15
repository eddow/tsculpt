<script setup lang="ts">
import InputNumber from 'primevue/inputnumber'
import Slider from 'primevue/slider'
import { computed, ref, watch } from 'vue'

interface Props {
	modelValue: number
	min: number
	max: number
	step?: number
	// Optional mapping functions between slider and actual value
	sliderToValue?: (slider: number) => number
	valueToSlider?: (value: number) => number
	// Input number props
	inputStep?: number
	showButtons?: boolean
}

const props = withDefaults(defineProps<Props>(), {
	step: 0.1,
	inputStep: 0.1,
	showButtons: false,
	sliderToValue: (v: number) => v,
	valueToSlider: (v: number) => v,
})

const emit = defineEmits<{
	'update:modelValue': [value: number]
}>()

// Local state for slider dragging
const sliderValue = ref(props.valueToSlider(props.modelValue))

// Update local slider state when prop changes
watch(
	() => props.modelValue,
	(newVal) => {
		sliderValue.value = props.valueToSlider(newVal)
	},
	{ immediate: true }
)

const value = computed({
	get: () => props.modelValue,
	set: (val) => emit('update:modelValue', val),
})

// Computed min/max for the input in value space
const inputMin = computed(() => props.sliderToValue(props.min))
const inputMax = computed(() => props.sliderToValue(props.max))
</script>

<template>
	<div class="input-group">
		<Slider
			v-model="sliderValue"
			:min="min"
			:max="max"
			:step="step"
			@slideend="value = sliderToValue(sliderValue)"
			class="slider"
		/>
		<InputNumber
			v-model="value"
			:min="inputMin"
			:max="inputMax"
			:step="inputStep"
			class="number-input"
			:showButtons="showButtons"
			:input-style="{ width: '8rem' }"
		/>
	</div>
</template>

<style scoped lang="sass">
.input-group
	display: flex
	gap: 1rem
	align-items: center

	.slider
		flex: 1

	.number-input
		width: 8rem
</style>
