<template>
	<div class="export-viewer" ref="container">
		<canvas ref="canvas"></canvas>
	</div>
</template>

<script setup lang="ts">
import type { AMesh } from '@tsculpt/types'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
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

const props = defineProps<{
	viewed: AMesh
	displayMode: 'solid' | 'wireframe' | 'solid-edges'
	showAxes: boolean
}>()

const container = ref<HTMLDivElement>()
const canvas = ref<HTMLCanvasElement>()
const cameraState = ref({
	position: new THREE.Vector3(0, 0, 5),
	target: new THREE.Vector3(0, 0, 0),
})
let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let controls: OrbitControls
let mesh: THREE.Mesh
let edges: THREE.LineSegments
let axes: THREE.Group | null = null
let isInitialized = false
let hasSeenRealMesh = false

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
}

// Expose resetCamera for external use
function resetCamera() {
	if (!camera || !controls || !mesh) return

	const geometry = mesh.geometry
	geometry.computeBoundingSphere()

	if (geometry.boundingSphere) {
		const { center, radius } = geometry.boundingSphere
		const fov = (camera.fov * Math.PI) / 180
		const distance = (radius * 2.5) / Math.tan(fov / 2)

		camera.position.set(center.x, center.y, center.z + distance)
		controls.target.copy(center)
		controls.update()
	}
}
defineExpose({ resetCamera })

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
	camera.position.copy(cameraState.value.position)

	// Renderer setup
	renderer = new THREE.WebGLRenderer({
		canvas: canvas.value,
		antialias: true,
	})
	renderer.setSize(width, height)

	// Controls setup
	controls = new OrbitControls(camera, canvas.value)
	controls.enableDamping = true
	controls.zoomToCursor = true
	controls.target.copy(cameraState.value.target)

	// Lighting setup
	setupLights()

	// Initial mesh
	updateGeometry()

	// If no previous camera position, set initial view
	if (
		cameraState.value.position.equals(new THREE.Vector3(0, 0, 5)) &&
		cameraState.value.target.equals(new THREE.Vector3(0, 0, 0))
	) {
		resetCamera()
	}

	// Animation loop
	animate()
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
}

function updateGeometry() {
	if (!scene) return
	if (mesh) scene.remove(mesh)
	if (edges) scene.remove(edges)

	const geometry = new THREE.BufferGeometry()
	const theme = isDark.value ? colors.dark : colors.light

	if (props.viewed.vectors && props.viewed.faces) {
		// For flat normals, duplicate vertices for each face
		const faceVertices: number[] = []

		for (const face of props.viewed.faces) {
			for (const vertexIndex of face) {
				const vertex = props.viewed.vectors[vertexIndex]
				faceVertices.push(vertex[0], vertex[1], vertex[2])
			}
		}

		const vertices = new Float32Array(faceVertices)
		geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3))

		// Don't use indices since vertices are already duplicated per face
		geometry.computeVertexNormals() // This gives flat normals since vertices aren't shared
		geometry.computeBoundingSphere()
	}

	const material = new THREE.MeshStandardMaterial({
		color: theme.mesh,
		wireframe: props.displayMode === 'wireframe',
	})

	mesh = new THREE.Mesh(geometry, material)
	scene.add(mesh)

	// Add edges for solid-edges mode
	const edgesGeometry = new THREE.EdgesGeometry(geometry)
	const edgesMaterial = new THREE.LineBasicMaterial({
		color: theme.edges,
		linewidth: 1,
	})
	edges = new THREE.LineSegments(edgesGeometry, edgesMaterial)
	edges.visible = props.displayMode === 'solid-edges'
	scene.add(edges)
}

function animate() {
	requestAnimationFrame(animate)
	controls.update()
	// Store camera state on each frame
	cameraState.value.position.copy(camera.position)
	cameraState.value.target.copy(controls.target)
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

// Watch for geometry changes
watch(
	() => props.viewed,
	() => {
		updateGeometry()
		if (!hasSeenRealMesh) {
			hasSeenRealMesh = true
			resetCamera()
		}
	},
	{ deep: true }
)

// Watch for display mode changes
watch(
	() => props.displayMode,
	(mode) => {
		if (!mesh || !edges) return
		;(mesh.material as THREE.MeshStandardMaterial).wireframe = mode === 'wireframe'
		edges.visible = mode === 'solid-edges'
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
</style>
