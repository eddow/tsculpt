<template>
	<div class="export-viewer" ref="container">
		<canvas ref="canvas"></canvas>
		<div v-if="meshHealth" class="mesh-health-overlay">
			<div class="mesh-health-badge" :class="meshHealth.cssClass" :title="meshHealth.tooltip">
				{{ meshHealth.icon }} {{ meshHealth.label }}
			</div>
			<button
				v-if="repairable"
				class="mesh-repair-btn"
				title="Attempt to repair this mesh (flip normals, remove degenerate faces, fill holes)"
				@click="requestRepair"
			>
				🔧 Repair
			</button>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { AMesh } from '@tsculpt/types'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { isDark } from '../lib/stores'

const colors = {
	dark: {
		background: 0x242424,
		mesh: 0x00a0ff,
		edges: 0x000000,
		ambient: 0x7090ff,
		camera: 0x7090ff,
		top: 0x6080ff,
		side: 0x6080ff,
	},
	light: {
		background: 0xf0f0f0,
		mesh: 0x0060ff,
		edges: 0x404040,
		ambient: 0xb0c0ff,
		camera: 0x90a0ff,
		top: 0x90a0ff,
		side: 0x90a0ff,
	},
}

const emit = defineEmits<{
	repair: []
}>()

const props = defineProps<{
	viewed: AMesh
	displayMode: 'solid' | 'wireframe' | 'solid-edges'
	showAxes: boolean
}>()

const printabilityBadge: Record<string, { icon: string; label: string; cssClass: string; tooltip: string }> = {
	printable: { icon: '✅', label: 'Printable', cssClass: 'health-ok', tooltip: 'Watertight, manifold, positive volume — ready for 3D printing' },
	'not-watertight': { icon: '⚠️', label: 'Not watertight', cssClass: 'health-warn', tooltip: 'Mesh has holes (boundary edges). 3D printing may fail.' },
	'non-manifold': { icon: '⚠️', label: 'Non-manifold', cssClass: 'health-warn', tooltip: 'Mesh has non-manifold edges (shared by >2 faces). 3D printing may fail.' },
	degenerate: { icon: '❌', label: 'Degenerate', cssClass: 'health-err', tooltip: 'Zero or negative volume — not a valid solid' },
}

const meshHealth = computed(() => {
	const stats = props.viewed.analyze()
	return printabilityBadge[stats.printability] ?? null
})

const repairable = computed(() => {
	const stats = props.viewed.analyze()
	return stats.printability !== 'printable'
})

function requestRepair() {
	emit('repair')
}

const container = ref<HTMLDivElement>()
const canvas = ref<HTMLCanvasElement>()
let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let controls: OrbitControls
let mesh: THREE.Mesh | null = null
let edges: THREE.LineSegments | null = null
let axes: THREE.Group | null = null
let isInitialized = false
let hasSeenRealMesh = false
let lastViewedMesh: AMesh | null = null
let animationFrameId: number | null = null
let isOrbiting = false

function renderScene() {
	if (!renderer || !scene || !camera) return
	renderer.render(scene, camera)
}

// Watch for theme changes
watch(isDark, updateColors, { immediate: false })

// Watch for axes visibility changes
watch(() => props.showAxes, showAxes, { immediate: false })

function updateColors() {
	if (!scene || !mesh || !edges) return

	const theme = isDark.value ? colors.dark : colors.light
	scene.background = new THREE.Color(theme.background)
	;(mesh.material as THREE.MeshStandardMaterial).color.setHex(theme.mesh)
	;(edges.material as THREE.LineBasicMaterial).color.setHex(theme.edges)

	// Update lights
	scene.traverse((object) => {
		if (object instanceof THREE.Light) {
			if (object instanceof THREE.AmbientLight) {
				object.color.setHex(theme.ambient)
			} else if (object.parent === camera) {
				object.color.setHex(theme.camera)
			} else if (object.position.y > 0) {
				object.color.setHex(theme.top)
			} else {
				object.color.setHex(theme.side)
			}
		}
	})

	renderScene()
}

// Expose resetCamera and getCameraState for external use
function resetCamera() {
	if (!camera || !controls || !mesh) return

	const geometry = mesh.geometry
	// Manually compute bounding sphere for better performance
	if (!geometry.boundingSphere) {
		geometry.boundingSphere = new THREE.Sphere()
	}
	const position = geometry.attributes.position
	const center = new THREE.Vector3()
	const count = position.count
	for (let i = 0; i < count; i++) {
		center.x += position.getX(i)
		center.y += position.getY(i)
		center.z += position.getZ(i)
	}
	center.divideScalar(count)
	let maxRadiusSq = 0
	for (let i = 0; i < count; i++) {
		const dx = position.getX(i) - center.x
		const dy = position.getY(i) - center.y
		const dz = position.getZ(i) - center.z
		const distSq = dx * dx + dy * dy + dz * dz
		if (distSq > maxRadiusSq) maxRadiusSq = distSq
	}
	geometry.boundingSphere.set(center, Math.sqrt(maxRadiusSq))

	if (geometry.boundingSphere) {
		const { center: sphereCenter, radius } = geometry.boundingSphere
		const fov = (camera.fov * Math.PI) / 180
		const distance = (radius * 2.5) / Math.tan(fov / 2)

		camera.position.set(sphereCenter.x, sphereCenter.y, sphereCenter.z + distance)
		controls.target.copy(sphereCenter)
		controls.update()
		renderScene()
	}
}

function getCameraState() {
	return {
		position: camera.position.clone(),
		target: controls.target.clone(),
	}
}

defineExpose({ resetCamera, getCameraState })

function init() {
	if (!container.value || !canvas.value) return
	if (isInitialized) {
		// Just reattach to new canvas
		renderer.setSize(container.value.clientWidth, container.value.clientHeight)
		renderer.setPixelRatio(window.devicePixelRatio)
		renderer.domElement = canvas.value
		return
	}

	isInitialized = true

	// Scene setup
	scene = new THREE.Scene()
	const theme = isDark.value ? colors.dark : colors.light
	scene.background = new THREE.Color(theme.background)

	// Camera setup
	const width = container.value.clientWidth
	const height = container.value.clientHeight
	camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 10000)
	camera.position.set(0, 0, 5)

	// Renderer setup
	renderer = new THREE.WebGLRenderer({
		canvas: canvas.value,
		antialias: true,
	})
	renderer.setSize(width, height)
	renderer.setAnimationLoop(null) // Disable automatic render loop

	// Controls setup
	controls = new OrbitControls(camera, canvas.value)
	controls.enableDamping = false
	controls.zoomToCursor = true
	controls.target.set(0, 0, 0)

	// Set up demand-driven rendering via OrbitControls events
	controls.addEventListener('start', () => {
		isOrbiting = true
		animate()
	})
	controls.addEventListener('end', () => {
		isOrbiting = false
		if (animationFrameId !== null) {
			cancelAnimationFrame(animationFrameId)
			animationFrameId = null
		}
	})
	controls.addEventListener('change', () => {
		renderScene()
	})

	// Lighting setup
	setupLights()

	// Initial mesh
	updateGeometry()

	// If no previous camera position, set initial view
	if (!hasSeenRealMesh) {
		resetCamera()
	}

	// Initial render
	renderScene()
}

function setupLights() {
	const theme = isDark.value ? colors.dark : colors.light

	const ambientLight = new THREE.AmbientLight(theme.ambient, 0.8)
	scene.add(ambientLight)

	const cameraLight = new THREE.DirectionalLight(theme.camera, 0.1)
	camera.add(cameraLight)
	cameraLight.position.set(0, 0, 1)
	scene.add(camera)

	const topLight = new THREE.DirectionalLight(theme.top, 0.7)
	topLight.position.set(0, 1, 0)
	scene.add(topLight)

	const sideLight = new THREE.DirectionalLight(theme.side, 0.5)
	sideLight.position.set(1, 0, 0)
	scene.add(sideLight)
}

function createAxes() {
	const group = new THREE.Group()
	const size = 10
	const divisions = 10

	// Grid helpers
	const gridHelperXZ = new THREE.GridHelper(size, divisions)
	const gridHelperXY = new THREE.GridHelper(size, divisions)
	const gridHelperYZ = new THREE.GridHelper(size, divisions)

	gridHelperXY.rotation.x = Math.PI / 2
	gridHelperYZ.rotation.z = Math.PI / 2

	group.add(gridHelperXZ)
	group.add(gridHelperXY)
	group.add(gridHelperYZ)

	// Axis labels
	const canvas = document.createElement('canvas')
	canvas.width = 64
	canvas.height = 64
	const ctx = canvas.getContext('2d')!
	ctx.fillStyle = 'white'
	ctx.font = '48px Arial'
	ctx.textAlign = 'center'
	ctx.textBaseline = 'middle'

	const numbers = Array.from({ length: divisions + 1 }, (_, i) => {
		const value = (i - divisions / 2) * (size / divisions)
		if (value === 0) return null // Skip 0

		ctx.clearRect(0, 0, 64, 64)
		ctx.fillText(value.toString(), 32, 32)

		const texture = new THREE.Texture(canvas)
		texture.needsUpdate = true

		const spriteMaterial = new THREE.SpriteMaterial({ map: texture })
		return new THREE.Sprite(spriteMaterial)
	}).filter(Boolean) as THREE.Sprite[]

	// Position number sprites along axes
	for (const [i, sprite] of numbers.entries()) {
		const value = (i + 1 - numbers.length / 2) * (size / divisions)

		// X axis
		const spriteX = sprite.clone()
		spriteX.position.set(value, 0, 0)
		spriteX.scale.set(0.5, 0.5, 1)
		group.add(spriteX)

		// Y axis
		const spriteY = sprite.clone()
		spriteY.position.set(0, value, 0)
		spriteY.scale.set(0.5, 0.5, 1)
		group.add(spriteY)

		// Z axis
		const spriteZ = sprite.clone()
		spriteZ.position.set(0, 0, value)
		spriteZ.scale.set(0.5, 0.5, 1)
		group.add(spriteZ)
	}

	return group
}

function showAxes(show: boolean) {
	if (!scene) return

	if (show && !axes) {
		axes = createAxes()
		scene.add(axes)
	} else if (!show && axes) {
		scene.remove(axes)
		axes = null
	}

	renderScene()
}

function updateGeometry() {
	if (!scene) return

	const theme = isDark.value ? colors.dark : colors.light
	const isIdentityChange = lastViewedMesh === props.viewed

	if (props.viewed.vectors && props.viewed.vectors.length > 0 && props.viewed.faces && props.viewed.faces.length > 0) {
		// Build indexed geometry - use unique vertices with index buffer
		const vertexCount = props.viewed.vectors.length
		const positions = new Float32Array(vertexCount * 3)
		for (let i = 0; i < vertexCount; i++) {
			const vertex = props.viewed.vectors[i]
			positions[i * 3] = vertex[0]
			positions[i * 3 + 1] = vertex[1]
			positions[i * 3 + 2] = vertex[2]
		}

		// Build face indices
		const faceIndices: number[] = []
		for (const face of props.viewed.faces) {
			faceIndices.push(face[0], face[1], face[2])
		}
		const indices = new Uint16Array(faceIndices)

		if (isIdentityChange && mesh) {
			// Reuse existing geometry - just update position attribute
			const positionAttribute = mesh.geometry.attributes.position
			for (let i = 0; i < vertexCount; i++) {
				const vertex = props.viewed.vectors[i]
				positionAttribute.setXYZ(i, vertex[0], vertex[1], vertex[2])
			}
			positionAttribute.needsUpdate = true

			// Update index if needed
			mesh.geometry.setIndex(new THREE.BufferAttribute(indices, 1))

			// Manually update bounding sphere
			if (!mesh.geometry.boundingSphere) {
				mesh.geometry.boundingSphere = new THREE.Sphere()
			}
			const center = new THREE.Vector3()
			const count = vertexCount
			for (let i = 0; i < count; i++) {
				center.x += positions[i * 3]
				center.y += positions[i * 3 + 1]
				center.z += positions[i * 3 + 2]
			}
			center.divideScalar(count)
			let maxRadiusSq = 0
			for (let i = 0; i < count; i++) {
				const dx = positions[i * 3] - center.x
				const dy = positions[i * 3 + 1] - center.y
				const dz = positions[i * 3 + 2] - center.z
				const distSq = dx * dx + dy * dy + dz * dz
				if (distSq > maxRadiusSq) maxRadiusSq = distSq
			}
			mesh.geometry.boundingSphere.set(center, Math.sqrt(maxRadiusSq))

			// Recompute vertex normals for flat shading
			mesh.geometry.computeVertexNormals()

			// Update edges geometry
			const edgesGeometry = new THREE.EdgesGeometry(mesh.geometry)
			if (edges) {
				edges.geometry.dispose()
				edges.geometry = edgesGeometry
			}
		} else {
			// Create new geometry
			if (mesh) scene.remove(mesh)
			if (edges) scene.remove(edges)

			const geometry = new THREE.BufferGeometry()
			geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
			geometry.setIndex(new THREE.BufferAttribute(indices, 1))
			geometry.computeVertexNormals()

			// Manually compute bounding sphere
			geometry.boundingSphere = new THREE.Sphere()
			const center = new THREE.Vector3()
			const count = vertexCount
			for (let i = 0; i < count; i++) {
				center.x += positions[i * 3]
				center.y += positions[i * 3 + 1]
				center.z += positions[i * 3 + 2]
			}
			center.divideScalar(count)
			let maxRadiusSq = 0
			for (let i = 0; i < count; i++) {
				const dx = positions[i * 3] - center.x
				const dy = positions[i * 3 + 1] - center.y
				const dz = positions[i * 3 + 2] - center.z
				const distSq = dx * dx + dy * dy + dz * dz
				if (distSq > maxRadiusSq) maxRadiusSq = distSq
			}
			geometry.boundingSphere.set(center, Math.sqrt(maxRadiusSq))

			const material = new THREE.MeshStandardMaterial({
				color: theme.mesh,
				wireframe: props.displayMode === 'wireframe',
			})

			mesh = new THREE.Mesh(geometry, material)
			mesh.frustumCulled = true
			scene.add(mesh)

			// Add edges for solid-edges mode
			const edgesGeometry = new THREE.EdgesGeometry(geometry)
			const edgesMaterial = new THREE.LineBasicMaterial({
				color: theme.edges,
				linewidth: 1,
			})
			edges = new THREE.LineSegments(edgesGeometry, edgesMaterial)
			edges.frustumCulled = true
			edges.visible = props.displayMode === 'solid-edges'
			scene.add(edges)
		}
	}

	// Store reference for identity check
	lastViewedMesh = props.viewed

	// Request a render
	if (!isOrbiting) {
		renderScene()
	}
}

function animate() {
	if (!isOrbiting) return
	animationFrameId = requestAnimationFrame(animate)
	controls.update()
	renderer.render(scene, camera)
}

function handleResize() {
	if (!container.value || !camera || !renderer) return

	// Get the actual container dimensions
	const rect = container.value.getBoundingClientRect()
	const width = rect.width
	const height = rect.height

	// Update camera
	camera.aspect = width / height
	camera.updateProjectionMatrix()

	// Update renderer with new size
	renderer.setSize(width, height, true) // true for updateStyle
	renderScene()
}

// Add ResizeObserver for more reliable size updates
onMounted(() => {
	init()
	window.addEventListener('resize', handleResize)

	// Create ResizeObserver
	if (container.value) {
		const observer = new ResizeObserver(() => {
			handleResize()
		})
		observer.observe(container.value)
	}
})

onBeforeUnmount(() => {
	window.removeEventListener('resize', handleResize)
})

// Watch for geometry changes - use identity check inside updateGeometry
watch(
	() => props.viewed,
	() => {
		updateGeometry()
		if (!hasSeenRealMesh) {
			hasSeenRealMesh = true
			resetCamera()
		}
	}
)

// Watch for display mode changes
watch(
	() => props.displayMode,
	(mode) => {
		if (!mesh || !edges) return
		;(mesh.material as THREE.MeshStandardMaterial).wireframe = mode === 'wireframe'
		edges.visible = mode === 'solid-edges'
		renderScene()
	},
	{ immediate: true }
)
</script>

<style lang="sass">
.export-viewer
	width: 100%
	height: 100%
	position: relative

	canvas
		width: 100% !important
		height: 100% !important
		display: block

	.controls
		position: absolute
		top: 1rem
		right: 1rem
		display: flex
		gap: 0.5rem

		button
			background: var(--surface-card)
			border: 1px solid var(--surface-border)
			color: var(--text-color)
			padding: 0.5rem 1rem
			border-radius: 4px
			cursor: pointer
			font-size: 0.9rem

			&:hover
				background: var(--surface-hover)

.mesh-health-overlay
	position: absolute
	bottom: 0.75rem
	right: 0.75rem
	display: flex
	gap: 0.4rem
	align-items: center
	z-index: 10

.mesh-health-badge
	padding: 0.3rem 0.65rem
	border-radius: 6px
	font-size: 0.8rem
	font-weight: 600
	font-family: var(--font-family-mono, monospace)
	pointer-events: none
	backdrop-filter: blur(6px)
	box-shadow: 0 1px 4px rgba(0,0,0,0.3)

	&.health-ok
		background: rgba(34, 197, 94, 0.85)
		color: #fff

	&.health-warn
		background: rgba(234, 179, 8, 0.85)
		color: #000

	&.health-err
		background: rgba(239, 68, 68, 0.85)
		color: #fff

.mesh-repair-btn
	padding: 0.3rem 0.65rem
	border-radius: 6px
	border: none
	font-size: 0.8rem
	font-weight: 600
	cursor: pointer
	background: rgba(59, 130, 246, 0.85)
	color: #fff
	backdrop-filter: blur(6px)
	box-shadow: 0 1px 4px rgba(0,0,0,0.3)
	transition: background 0.15s

	&:hover
		background: rgba(37, 99, 235, 0.9)
</style>
