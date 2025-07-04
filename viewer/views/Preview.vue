<template>
	<div v-if="error" class="error">
		<h2>Error on {{ error.location }}</h2>
		<pre>{{ error.err }}</pre>
		<div v-if="error.err.stack" class="stack-trace">
			<h3>Stack Trace:</h3>
			<pre>{{ error.err.stack }}</pre>
		</div>
		<div v-if="error.err.message" class="error-message">
			<h3>Error Message:</h3>
			<pre>{{ error.err.message }}</pre>
		</div>
		<div v-if="error.err.fileName || error.err.lineNumber" class="error-location">
			<h3>Location:</h3>
			<pre>{{ error.err.fileName }}:{{ error.err.lineNumber }}</pre>
		</div>
	</div>
	<Splitter v-else class="full-size" stateStorage="none">
		<SplitterPanel :size="100">
			<Viewer
				:viewed="factory === waiting ? waiting : mesh"
				:display-mode="displaySettings.mode"
				:show-axes="displaySettings.showAxes"
				ref="viewerRef"
			/>
		</SplitterPanel>
		<SplitterPanel v-if="displaySettings.showParameters" :size="20" :style="{ minWidth: '300px' }">
			<Parameters
				:viewed="factory === waiting ? waiting : mesh"
				v-model:parameters="parameters"
				:parameters-config="parametersConfig"
			/>
		</SplitterPanel>
	</Splitter>
</template>

<script setup lang="ts">
import Parameters from '@/components/Parameters.vue'
import Viewer from '@/components/Viewer.vue'
import { router } from '@/router'
import { type GenerationParameters, type IMesh, ParametersConfig } from '@tsculpt'
import type { MenuItem } from 'primevue/menuitem'
import Splitter from 'primevue/splitter'
import SplitterPanel from 'primevue/splitterpanel'
import { ComputedRef, type Ref, computed, inject, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { module, Module } from '../lib/source'
const route = useRoute()
const hash = computed(() => route.hash.slice(1) || 'default')
const viewerRef = ref<InstanceType<typeof Viewer>>()
import { localStored } from '@/lib/stores'
import { Factory, MaybeFactory, MaybePromise, waiting } from '@/lib/utils'
import { defaultGlobals, withGlobals } from '@tsculpt/globals'

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
type LoadLocation = '1-module' | '2-load' | '3-call'
const error = ref<{
	err: any
	location: LoadLocation
} | null>(null)

const loadedModule = ref<Module | typeof waiting>(waiting)
const factory = ref<Factory<MaybePromise<IMesh>> | typeof waiting>(waiting)
const parameters = ref<GenerationParameters>({ ...defaultGlobals })
const parametersConfig = ref<ParametersConfig | false>(false)
const mesh = ref<IMesh | typeof waiting>(waiting)

function noErrorBefore(location: any) {
	return !error.value?.location || error.value.location > `${location}`
}
const moduleRef: ComputedRef<Ref<Promise<Module>>> = computed(() =>
	module(`/${props.path}.sculpt.ts`)
)
const loadingModule = computed(() => moduleRef.value.value)
function handleError(err: any, location: LoadLocation) {
	// biome-ignore lint: We want it debuggable
	console.error(err)
	error.value = { err, location }
}
watch(
	loadingModule,
	async (loadingModule) => {
		loadedModule.value = waiting
		try {
			loadedModule.value = await loadingModule
		} catch (err) {
			handleError(err, '1-module')
		}
	},
	{ immediate: true }
)
watch(
	[loadedModule, hash],
	async ([loadedModule, hash]) => {
		factory.value = waiting
		if (noErrorBefore(2) && loadedModule !== waiting) {
			error.value = null
			try {
				const entry = loadedModule[hash] as MaybeFactory<MaybePromise<IMesh>>
				if (!entry) throw new Error(`No export found for ${hash}`)
				if (typeof entry === 'function') {
					// @ts-expect-error `params` come from `vite-plugin-param-metadata`
					parametersConfig.value = entry.params || {}
					factory.value = () => withGlobals(() => entry(parameters.value), parameters.value)
				} else factory.value = () => entry
			} catch (err) {
				handleError(err, '2-load')
				factory.value = () => {
					throw err
				}
			}
		}
	},
	{ immediate: true }
)
watch(
	[factory, parameters],
	async ([factory, parameters]) => {
		mesh.value = waiting
		if (noErrorBefore(3) && factory !== waiting) {
			error.value = null
			try {
				mesh.value = await factory(parameters)
			} catch (err) {
				handleError(err, '3-call')
			}
		}
	},
	{ immediate: true }
)
const menuItems: Ref<MenuItem[]> | undefined = inject('menuItems')

function display(mode: DisplayMode) {
	displaySettings.value.mode = mode
}

function toggleAxes() {
	displaySettings.value.showAxes = !displaySettings.value.showAxes
}

function toggleParameters() {
	displaySettings.value.showParameters = !displaySettings.value.showParameters
}

if (menuItems) {
	watch(
		[loadedModule, hash, displaySettings],
		async ([loadedModule, hash, displaySettings]) => {
			if (loadedModule === waiting) return
			const hashes = Object.keys(loadedModule)
			menuItems.value = [
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
						{ separator: true },
						...hashes.map((gotoHash) => ({
							label: gotoHash,
							icon: gotoHash === hash ? 'pi pi-fw pi-check' : 'pi pi-fw pi-file',
							command: () => {
								router.push(`#${gotoHash}`)
							},
						})),
					],
				},
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

<style lang="sass">
.full-size
	height: 100%
	width: 100%
</style>
