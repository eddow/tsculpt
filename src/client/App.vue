<script lang="ts">
const menuDataSymbol = Symbol('menuItems')
export interface MenuData {
	hashes: Ref<string[]>
	extraMenuItems: Ref<MenuItem[]>
	hash: Ref<string>
}
export function useMenuItems() {
	return inject(menuDataSymbol) as MenuData
}
</script>
<template>
	<div class="layout" :class="{ 'dark': isDark }">
		<Menubar :model="menuItems">
			<template #end>
				<Button @click="toggleTheme()" :icon="isDark ? 'pi pi-sun' : 'pi pi-moon'" />
			</template>
		</Menubar>
		<router-view class="router-view"></router-view>
	</div>
</template>

<script setup lang="ts">
import { isDark, toggleTheme } from '@client/lib/stores'
import type { MenuItem } from 'primevue/menuitem'
import { computed, inject, provide, Ref, ref } from 'vue'
import { useRoute } from 'vue-router'
import { router } from './router'
const route = useRoute()
const extraMenuItems = ref<MenuItem[]>([])
const hashes = ref<string[]>([])
const hash = computed(() => route.hash.slice(1) || 'default')

provide(menuDataSymbol, {
	extraMenuItems,
	hashes,
	hash
})
const menuItems = computed(() => [
	{
		label: 'Source',
		items: [
			{
				label: 'Choose file',
				icon: 'pi pi-fw pi-list',
				command: () => {
					router.push('/')
				},
			},
			... hashes.value.length > 0 ? [
				{ separator: true },
				...hashes.value.map((gotoHash) => ({
					label: gotoHash,
					icon: gotoHash === hash.value ? 'pi pi-fw pi-check' : 'pi pi-fw pi-file',
					command: () => {
						router.push(gotoHash === 'default' ? '#' : `#${gotoHash}`)
					},
					...(gotoHash === 'default' ? {
						style: {
							fontWeight: 'bold',
						}
					} : {})
				})),
			] : []
		],
	},
	...extraMenuItems.value
])
</script>

<style lang="sass">
.layout
	display: flex
	flex-direction: column
	height: 100vh
	background-color: #ffffff
	color: #213547

	&.dark
		background-color: #242424
		color: rgba(255, 255, 255, 0.87)

.router-view
	flex: 1

.p-menubar-submenu
	max-height: 70vh
	overflow-y: auto

/* Optional: Style the scrollbar */
.p-menubar-submenu::-webkit-scrollbar
	width: 6px

.p-menubar-submenu::-webkit-scrollbar-thumb
	background: #ccc
	border-radius: 3px

.p-menubar-submenu::-webkit-scrollbar-thumb:hover
	background: #999
</style>
