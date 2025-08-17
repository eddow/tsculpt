<script setup lang="ts">
import { useMenuItems } from '@client/App.vue'
import Viewer from '@client/components/Viewer.vue'
import { unpackMesh } from '@client/lib/pack'
import { localStored } from '@client/lib/stores'
import type { GenerationParameters, ParametersConfig } from '@tsculpt'
import { defaultGlobals } from '@tsculpt/globals'
import { computed, ref, watch } from 'vue'
import { render } from '../lib/source'

const props = defineProps<{
	module: string
	entry: string
	parametersConfig: ParametersConfig
}>()

const rendered = computed(async () => {
	props.parametersConfig //make sure we depend on this - as this is refreshed on file change
	return unpackMesh(await render(props.module, props.entry, parameters.value))
})

const viewerRef = ref<InstanceType<typeof Viewer>>()
const { extraMenuItems } = useMenuItems()

type DisplayMode = 'solid' | 'wireframe' | 'solid-edges'
const displaySettings = localStored('viewer-display', {
	mode: 'solid' as DisplayMode,
	showAxes: false,
	showParameters: true,
})

const parameters = ref<GenerationParameters>({ ...defaultGlobals })
watch(() => [props.module, props.entry], goHome, { immediate: true })
function goHome() {
	viewerRef.value?.resetCamera()
}

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
		displaySettings,
		async (displaySettings) => {
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
							command: goHome,
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

<template>
	<Splitter class="full-size" stateStorage="none">
		<SplitterPanel :size="100">
			<Await :await="rendered">
				<template #default="{ result: mesh }">
					<Viewer
						:viewed="mesh"
						:display-mode="displaySettings.mode"
						:show-axes="displaySettings.showAxes"
						ref="viewerRef"
					/>
				</template>
				<template #loading>
					<Spinner icon="cog" :size="10" />
				</template>
			</Await>
		</SplitterPanel>
		<SplitterPanel v-if="displaySettings.showParameters" :size="20" :style="{ minWidth: '300px' }">
			<Parameters
				:viewed="rendered"
				v-model:parameters="parameters"
				:parameters-config="parametersConfig"
			/>
		</SplitterPanel>
	</Splitter>
</template>


<style lang="sass" scoped>
.full-size
	height: 100%
	width: 100%
.pi-spin
	font-size: 16rem
</style>
