<template>
	<div class="layout">
		<Menubar :model="menuItems">
			<template #end>
				<Button @click="toggleTheme()" :icon="isDark ? 'pi pi-sun' : 'pi pi-moon'" />
			</template>
		</Menubar>
		<router-view></router-view>
	</div>
</template>

<script setup lang="ts">
import { isDark, toggleTheme } from '@/lib/stores'
import type { MenuItem } from 'primevue/menuitem'
import { provide, ref } from 'vue'

const menuItems = ref<MenuItem[]>([])

provide('menuItems', menuItems)
</script>

<style lang="sass">
.layout
	display: flex
	flex-direction: column
	height: 100vh

.main-panel
	flex: 1
	:deep(.p-panel-content)
		height: 100%
		padding: 0
</style>
