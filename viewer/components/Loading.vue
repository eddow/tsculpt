<template>
	<div class="loading">
		<ProgressSpinner />
		<slot>Loading...</slot>
	</div>
</template>
<script setup lang="ts">
import ProgressSpinner from 'primevue/progressspinner'
</script>
<style lang="sass">
.loading
	height: 100%
	width: 100%
	display: flex
	flex-direction: column
	align-items: center
	justify-content: center
	gap: 1rem
	color: var(--text-color)
</style>
