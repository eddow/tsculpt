<script lang="ts">

import Parameters from '@/components/Parameters.vue'
import Viewer from '@/components/Viewer.vue'
import { type GenerationParameters, type IMesh, ParametersConfig } from '@tsculpt'
import Splitter from 'primevue/splitter'
import SplitterPanel from 'primevue/splitterpanel'
import { computed, ref, watch } from 'vue'
import { module } from '../lib/source'
import { awaited, erroneous, hasResult, thenComputed, waiting } from '@/components/Await.vue'
import ErrorView from '@/components/ErrorView.vue'
import { localStored } from '@/lib/stores'
import { defaultGlobals, withGlobals } from '@tsculpt/globals'
import { useMenuItems } from '@/App.vue'
import Spinner from '@/components/Spinner.vue'

export type MaybePromise<T> = Promise<T> | T
export type Factory<T> = ((params?: GenerationParameters) => T )& { params: ParametersConfig }
export type MaybeFactory<T> = T | Factory<T>

</script>
<template>

	<ErrorView v-if="erroneous(loadedModule)" :error="loadedModule">
		<h2>Cannot load module</h2>
		<p>
			Click <a href="/">here</a> to go back to the modules list.
		</p>
	</ErrorView>

	<ErrorView v-else-if="erroneous(factory)" :error="factory">
		<h2>Cannot load export <code>{{ hash }}</code></h2>
		<div>
			<p>Available exports:</p>
			<ul>
				<li v-for="hash in hashes" :key="hash">
					<a :href="hash === 'default' ? '#' : `#${hash}`">{{ hash }}</a>
				</li>
			</ul>
		</div>
	</ErrorView>
	<Spinner v-else-if="factory === waiting" :size="10" />
	<Splitter v-else class="full-size" stateStorage="none">
		<SplitterPanel :size="100">
			<Viewer
				v-if="hasResult(mesh)"
				:viewed="mesh"
				:display-mode="displaySettings.mode"
				:show-axes="displaySettings.showAxes"
				ref="viewerRef"
			/>
			<ErrorView v-if="erroneous(mesh)" :error="mesh" />
			<Spinner v-else icon="cog" :size="10" />
		</SplitterPanel>
		<SplitterPanel v-if="displaySettings.showParameters" :size="20" :style="{ minWidth: '300px' }">
			<Parameters
				:viewed="mesh"
				v-model:parameters="parameters"
				:parameters-config="parametersConfig"
			/>
		</SplitterPanel>
	</Splitter>
</template>

<script setup lang="ts">

const viewerRef = ref<InstanceType<typeof Viewer>>()
const {extraMenuItems, hashes, hash} = useMenuItems()

type DisplayMode = 'solid' | 'wireframe' | 'solid-edges'
const displaySettings = localStored('viewer-display', {
	mode: 'solid' as DisplayMode,
	showAxes: false,
	showParameters: true,
})

// Save settings whenever they change
watch(
	displaySettings,
	(settings) => {
		localStorage.setItem('viewer-display', JSON.stringify(settings))
	},
	{ deep: true }
)

const props = defineProps<{
	path: string
}>()

const parameters = ref<GenerationParameters>({ ...defaultGlobals })
const parametersConfig = ref<ParametersConfig | false>(false)

const loadedModule = thenComputed(true, () => module(`/${props.path}.sculpt.ts`))
watch(
	thenComputed(loadedModule, (loadedModule) => Object.keys(loadedModule)),
	(moduleHashes) => {
		hashes.value = hasResult(moduleHashes) ? moduleHashes : []
	}
)
const factory = thenComputed(loadedModule, (loadedModule) => {
	const entry = loadedModule[hash.value] as MaybeFactory<MaybePromise<IMesh>>
	if (!entry) throw new Error(`No export found for ${hash.value}`)
	if (typeof entry === 'function') {
		// `params` come from `vite-plugin-param-metadata`
		parametersConfig.value = entry.params || {}
		return () => withGlobals(() => entry(parameters.value), parameters.value)
	}
	parametersConfig.value = {}
	return () => entry
})
// TODO: render in a worker
const build = thenComputed(factory, (factory) => new Promise<IMesh>(resolve => resolve(factory())))
const mesh = computed(()=> awaited(build))

function display(mode: DisplayMode) {
	displaySettings.value.mode = mode
}

function toggleAxes() {
	displaySettings.value.showAxes = !displaySettings.value.showAxes
}

function toggleParameters() {
	displaySettings.value.showParameters = !displaySettings.value.showParameters
}

if (extraMenuItems) {
	watch(
		[loadedModule, displaySettings],
		async ([loadedModule, displaySettings]) => {
			if (loadedModule === waiting) return
			extraMenuItems.value = [
				{
					label: 'Display',
					items: [
						{
							label: 'Parameters',
							icon: displaySettings.showParameters ? 'pi pi-fw pi-check' : undefined,
							command: toggleParameters,
						},
						{
							label: 'Go home',
							icon: 'pi pi-fw pi-refresh',
							command: () => viewerRef.value?.resetCamera(),
						},
						{
							label: 'Show Axes',
							icon: displaySettings.showAxes ? 'pi pi-fw pi-check' : undefined,
							command: toggleAxes,
						},
						{ separator: true },
						{
							label: 'Solid',
							icon: displaySettings.mode === 'solid' ? 'pi pi-fw pi-check' : undefined,
							command: () => display('solid'),
						},
						{
							label: 'Wireframe',
							icon: displaySettings.mode === 'wireframe' ? 'pi pi-fw pi-check' : undefined,
							command: () => display('wireframe'),
						},
						{
							label: 'Solid + Edges',
							icon: displaySettings.mode === 'solid-edges' ? 'pi pi-fw pi-check' : undefined,
							command: () => display('solid-edges'),
						},
					],
				},
			]
		},
		{ immediate: true, deep: true }
	)
}
</script>

<style lang="sass" scoped>
.full-size
	height: 100%
	width: 100%
.pi-spin
	font-size: 16rem
</style>
