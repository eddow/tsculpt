<script setup lang="ts">
import { useMenuItems } from '@client/App.vue'
import { thenComputed } from '@client/components/Await.vue'
import EntryViewer from '@client/components/EntryViewer.vue'
import { ParametersConfig } from '@tsculpt'
import { ref, watch } from 'vue'
import { entries, onModuleChanged } from '../lib/source'

const props = defineProps<{
	path: string
}>()
let unregister: () => void = () => {}
const moduleEntries = ref<Promise<Record<string, ParametersConfig>>>(new Promise(() => {}))
watch(
	() => props.path,
	(path) => {
		unregister()
		moduleEntries.value = entries(path)
		unregister = onModuleChanged(path, () => {
			const resolved = entries(path)
			resolved.then(() => {
				moduleEntries.value = resolved
			})
		})
	},
	{ immediate: true }
)

const { hashes, hash } = useMenuItems()

watch(
	moduleEntries,
	async (entries) => {
		hashes.value = Object.keys(await entries)
	},
	{ immediate: true }
)

const entryParameters = thenComputed(moduleEntries, (entries) => {
	const entry = entries[hash.value]
	if (!entry) throw new Error(`No entry found for ${hash.value}`)
	return entry
})
</script>
<template>
	<div class="module-viewer">
		<Await :await="entryParameters" #default="{result: parametersConfig}">
			<EntryViewer :module="props.path" :entry="hash" :parametersConfig/>
		</Await>
	</div>
</template>

<style lang="sass" scoped>
.full-size
	height: 100%
	width: 100%
.pi-spin
	font-size: 16rem
</style>
