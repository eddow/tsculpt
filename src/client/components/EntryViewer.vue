<script setup lang="ts">
import { useMenuItems } from '@client/App.vue'
import Viewer from '@client/components/Viewer.vue'
import { unpackMesh } from '@client/lib/pack'
import { localStored } from '@client/lib/stores'
import { getHandler, MeshData } from '../../io/index'
import type { AMesh, GenerationParameters, ParametersConfig, Printability, GeometryStats } from '@tsculpt'
import { defaultGlobals } from '@tsculpt/globals'
import { computed, ref, watch } from 'vue'
import { render } from '../lib/source'

/** Inline minimal mesh data shape for export — avoids heavy IO dependency */
interface ExportMeshData {
	vertices?: readonly (readonly [number, number, number])[]
	faces: readonly (readonly [number, number, number])[][] | readonly (readonly [number, number, number])[]
}

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
//watch(() => [props.module, props.entry], ()=> setTimeout(goHome), { immediate: true })
// TODO: remember cameras per model/entry
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

// --- Export functionality ---

const exportFormats = ['stl', 'obj'] as const
type ExportFormat = (typeof exportFormats)[number]

const showExportDialog = ref(false)
const exportFormat = ref<ExportFormat>('stl')
const exportWarning = ref('')
const currentMesh = ref<AMesh | null>(null)
const currentStats = ref<GeometryStats | null>(null)

const printabilitySummary: Record<Printability, string> = {
	printable: 'This mesh is printable (watertight, manifold, positive volume).',
	'not-watertight': 'This mesh is NOT watertight — it has holes. The slicer may fail or produce unexpected results.',
	'non-manifold': 'This mesh has non-manifold edges. 3D printing will likely fail.',
	degenerate: 'This mesh is degenerate (zero or negative volume). It cannot be 3D printed.',
}

function meshToMeshData(mesh: AMesh): ExportMeshData {
	const vertices = mesh.vectors.map((v) => [v[0], v[1], v[2]] as [number, number, number])
	const faces = mesh.faces.map((f) => {
		const v0 = mesh.vectors[f[0]]
		const v1 = mesh.vectors[f[1]]
		const v2 = mesh.vectors[f[2]]
		return [
			[v0[0], v0[1], v0[2]] as [number, number, number],
			[v1[0], v1[1], v1[2]] as [number, number, number],
			[v2[0], v2[1], v2[2]] as [number, number, number],
		] as [[number, number, number], [number, number, number], [number, number, number]]
	})
	return { vertices, faces }
}

function triggerDownload(data: ArrayBuffer | string, extension: string) {
	const blob = new Blob([data], { type: 'application/octet-stream' })
	const url = URL.createObjectURL(blob)
	const a = document.createElement('a')
	a.href = url
	a.download = `${props.entry || 'model'}.${extension}`
	document.body.appendChild(a)
	a.click()
	document.body.removeChild(a)
	URL.revokeObjectURL(url)
}

async function doExport() {
	const mesh = currentMesh.value
	if (!mesh) return

	const handler = getHandler(exportFormat.value)
	if (!handler) {
		console.error(`No handler found for format: ${exportFormat.value}`)
		return
	}

	const meshData = meshToMeshData(mesh)
	const data = handler.write(meshData as any)
	triggerDownload(data, exportFormat.value)
	showExportDialog.value = false
}

function openExportDialog(format: ExportFormat) {
	// Resolve the current computed mesh
	rendered.value.then((mesh) => {
		currentMesh.value = mesh
		exportFormat.value = format
		const stats = mesh.analyze()
		currentStats.value = stats
		exportWarning.value = stats.printability === 'printable' ? '' : printabilitySummary[stats.printability]
		showExportDialog.value = true
	})
}

// --- End export functionality ---

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
				{
					label: 'Export',
					items: exportFormats.map((fmt) => ({
						label: `Export ${fmt.toUpperCase()}`,
						icon: 'pi pi-fw pi-download',
						command: () => openExportDialog(fmt),
					})),
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

	<!-- Export dialog -->
	<Dialog v-model:visible="showExportDialog" header="Export Mesh" :modal="true" :style="{ width: '450px' }">
		<div v-if="currentStats" class="export-stats">
			<div class="export-preview">
				<div class="stat-row">
					<span class="stat-label">Format:</span>
					<span class="stat-value">{{ exportFormat.toUpperCase() }}</span>
				</div>
				<div class="stat-row">
					<span class="stat-label">Vertices:</span>
					<span class="stat-value">{{ currentStats.vertexCount }}</span>
				</div>
				<div class="stat-row">
					<span class="stat-label">Faces:</span>
					<span class="stat-value">{{ currentStats.faceCount }}</span>
				</div>
				<div class="stat-row">
					<span class="stat-label">Volume:</span>
					<span class="stat-value">{{ currentStats.volume < 0.01 && currentStats.volume > -0.01 ? '~0' : currentStats.volume.toFixed(3) }}</span>
				</div>
				<div class="stat-row">
					<span class="stat-label">Printability:</span>
					<span class="stat-value" :class="'health-' + (currentStats.printability === 'printable' ? 'ok' : currentStats.printability === 'degenerate' ? 'err' : 'warn')">
						{{ currentStats.printability }}
					</span>
				</div>
			</div>
			<div v-if="exportWarning" class="export-warning">
				{{ exportWarning }}
			</div>
		</div>
		<template #footer>
			<Button label="Cancel" icon="pi pi-times" class="p-button-text" @click="showExportDialog = false" />
			<Button label="Export" icon="pi pi-download" @click="doExport" autofocus />
		</template>
	</Dialog>
</template>


<style lang="sass" scoped>
.full-size
	height: 100%
	width: 100%
.pi-spin
	font-size: 16rem

.export-stats
	margin-bottom: 1rem

.export-preview
	background: var(--surface-ground, #f8f9fa)
	border-radius: 6px
	padding: 0.75rem 1rem

.stat-row
	display: flex
	justify-content: space-between
	padding: 0.2rem 0

	&:not(:last-child)
		border-bottom: 1px solid var(--surface-border, #dee2e6)

.stat-label
	font-weight: 600
	color: var(--text-color-secondary)

.stat-value
	font-family: var(--font-family-mono, monospace)

.export-warning
	margin-top: 0.75rem
	padding: 0.6rem 0.75rem
	border-radius: 6px
	background: rgba(234, 179, 8, 0.15)
	border: 1px solid rgba(234, 179, 8, 0.4)
	color: #b45309
	font-size: 0.85rem
	line-height: 1.4

.health-ok
	color: #22c55e
	font-weight: 700

.health-warn
	color: #eab308
	font-weight: 700

.health-err
	color: #ef4444
	font-weight: 700
</style>
