<template>
	<div class="list-container">
		<Tree :value="files" selectionMode="single" @node-select="onSelect" class="file-tree" toggleable>
			<template #default="{ node }">
				<span :class="{ 'file-node': true, 'is-file': !node.children }">
					<i :class="node.children ? 'pi pi-folder' : 'pi pi-file'" />
					{{ node.label }}
				</span>
			</template>
		</Tree>
	</div>
</template>

<script setup lang="ts">
import { modules } from '@/lib/source'
import { router } from '@/router'
import type { TreeNode } from 'primevue/treenode'
import { onMounted, ref } from 'vue'

const files = ref<TreeNode[]>([])
function addNode(nodes: TreeNode[], path: string) {
	// Remove leading '../' from path
	const cleanPath = path.replace(/^\.\.\//, '')
	const parts = cleanPath.split('/')
	const file = parts.pop()
	let currentNodes = nodes

	for (const part of parts) {
		const existing = nodes.find((node) => node.label === part)
		if (existing) {
			currentNodes = existing.children!
		} else {
			const newNode = {
				key: part,
				label: part,
				children: [],
				selectable: false, // Make folders not selectable
			}
			currentNodes.push(newNode)
			currentNodes = newNode.children!
		}
	}

	currentNodes.push({
		key: file!,
		label: file!,
		selectable: true,
		leaf: true,
		path,
	})
}

onMounted(async () => {
	// Convert modules object into tree structure
	const paths = Object.keys(modules).map((path) => path.replace(/^\.\.\//, '').substring(1))
	const nodes: TreeNode[] = []

	for (const path of paths) addNode(nodes, path)

	// Get root level nodes
	files.value = nodes
})

function onSelect(node: TreeNode) {
	const treeNode = node as TreeNode
	if (treeNode.path) {
		router.push(`/preview/${treeNode.path}`)
	}
}
</script>

<style lang="sass">
.list-container
	height: 100vh
	max-width: 800px
	margin: 0 auto
	padding: 1rem

.file-tree
	height: 100%
	.file-node
		display: flex
		align-items: center
		gap: 0.5rem

		i
			font-size: 1rem

		&.is-file
			.pi-file
				color: var(--primary-color)
</style>
