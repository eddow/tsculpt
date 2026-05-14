<script setup lang="ts">
import { useMenuItems } from '@client/App.vue'
import Viewer from '@client/components/Viewer.vue'
import { meshToMeshData } from '@client/lib/mesh-export'
import { unpackMesh } from '@client/lib/pack'
import { localStored } from '@client/lib/stores'
import type {
	AMesh,
	GenerationParameters,
	GeometryStats,
	ParametersConfig,
	Printability,
	RepairReport,
} from '@tsculpt'
import { defaultGlobals } from '@tsculpt/globals'
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { getHandler } from '../../io/index'
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

// --- Repair functionality ---
const repairedMesh = ref<AMesh | null>(null)
const repairReport = ref<RepairReport | null>(null)
const showRepairToast = ref(false)
let repairToastTimeout: ReturnType<typeof setTimeout> | null = null

/** The mesh currently being viewed — repaired if available, otherwise original */
const viewedMesh = computed(() => repairedMesh.value ?? rendered.value)

function hideRepairToastLater() {
	if (repairToastTimeout) clearTimeout(repairToastTimeout)
	repairToastTimeout = setTimeout(() => {
		showRepairToast.value = false
		repairToastTimeout = null
	}, 6000)
}

async function handleRepair() {
	const mesh = await viewedMesh.value
	const result = mesh.repair()
	repairedMesh.value = result.repaired
	repairReport.value = result.report
	showRepairToast.value = true
	hideRepairToastLater()
}

function revertRepair() {
	if (repairToastTimeout) {
		clearTimeout(repairToastTimeout)
		repairToastTimeout = null
	}
	repairedMesh.value = null
	repairReport.value = null
	showRepairToast.value = false
}

function repairReportText(report: RepairReport): string {
	const parts: string[] = []
	if (report.normalsFlipped) parts.push('normals flipped')
	if (report.degenerateRemoved > 0)
		parts.push(`${report.degenerateRemoved} degenerate faces removed`)
	if (report.holesFilled > 0) parts.push(`${report.holesFilled} holes filled`)
	return parts.length > 0 ? parts.join(', ') : 'no changes needed'
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
	'not-watertight':
		'This mesh is NOT watertight — it has holes. The slicer may fail or produce unexpected results.',
	'non-manifold': 'This mesh has non-manifold edges. 3D printing will likely fail.',
	degenerate: 'This mesh is degenerate. It cannot be 3D printed.',
}

function printabilityWarning(stats: GeometryStats): string {
	if (stats.printability === 'printable') return ''
	if (stats.printability === 'degenerate' && stats.signedVolume < 0) {
		return 'This mesh appears to be inside-out (negative signed volume). Try Repair before exporting.'
	}
	if (stats.printability === 'degenerate') {
		return 'This mesh has zero or near-zero volume. It cannot be 3D printed.'
	}
	return printabilitySummary[stats.printability]
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

async function openExportDialog(format: ExportFormat) {
	// Resolve the current viewed mesh (could be repaired)
	const mesh = await viewedMesh.value
	currentMesh.value = mesh
	exportFormat.value = format
	const stats = mesh.analyze()
	currentStats.value = stats
	exportWarning.value = printabilityWarning(stats)
	showExportDialog.value = true
}

// --- End export functionality ---

watch(rendered, () => {
	revertRepair()
	currentMesh.value = null
	currentStats.value = null
	exportWarning.value = ''
	showExportDialog.value = false
})

onBeforeUnmount(() => {
	if (repairToastTimeout) clearTimeout(repairToastTimeout)
})

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
			<Await :await="viewedMesh">
				<template #default="{ result: mesh }">
					<Viewer
						:viewed="mesh"
						:display-mode="displaySettings.mode"
						:show-axes="displaySettings.showAxes"
						ref="viewerRef"
						@repair="handleRepair"
					/>
				</template>
				<template #loading>
					<Spinner icon="cog" :size="10" />
				</template>
			</Await>
		</SplitterPanel>
		<SplitterPanel v-if="displaySettings.showParameters" :size="20" :style="{ minWidth: '300px' }">
			<Parameters
				:viewed="viewedMesh"
				v-model:parameters="parameters"
				:parameters-config="parametersConfig"
			/>
		</SplitterPanel>
	</Splitter>

	<!-- Repair toast -->
	<div v-if="showRepairToast && repairReport" class="repair-toast">
		<div class="repair-toast-header">
			<span class="repair-toast-title">Repair complete</span>
			<span class="repair-toast-changes">{{ repairReportText(repairReport) }}</span>
		</div>
		<button class="repair-toast-revert" @click="revertRepair">Revert</button>
	</div>

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

.repair-toast
	position: fixed
	bottom: 1rem
	left: 50%
	transform: translateX(-50%)
	display: flex
	align-items: center
	gap: 1rem
	padding: 0.6rem 1.2rem
	border-radius: 8px
	background: var(--surface-card, #fff)
	box-shadow: 0 4px 16px rgba(0,0,0,0.2)
	z-index: 100
	font-size: 0.85rem
	border: 1px solid var(--surface-border, #dee2e6)

.repair-toast-header
	display: flex
	flex-direction: column
	gap: 0.15rem

.repair-toast-title
	font-weight: 700
	color: #22c55e

.repair-toast-changes
	color: var(--text-color-secondary)

.repair-toast-revert
	padding: 0.25rem 0.65rem
	border-radius: 4px
	border: 1px solid var(--surface-border, #dee2e6)
	background: var(--surface-ground, #f8f9fa)
	color: var(--text-color)
	cursor: pointer
	font-size: 0.8rem
	font-weight: 600

	&:hover
		background: var(--surface-hover, #e9ecef)
</style>
