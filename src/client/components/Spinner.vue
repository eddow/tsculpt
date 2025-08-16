
<script setup lang="ts">
const props = withDefaults(
	defineProps<{
		size?: number
		icon?: 'cog' | 'spinner' | 'sync' | 'refresh'
	}>(),
	{
		size: 2,
		icon: 'spinner',
	}
)
</script>
<template>
	<div class="spinner-container">
		<i class="pi pi-spin" :class="`pi-${props.icon}`" :style="{ fontSize: `${props.size}em` }"></i>
	</div>
</template>

<style lang="sass" scoped>
.spinner-container
	display: flex
	justify-content: center
	align-items: center
	height: 100%
	width: 100%
</style>
