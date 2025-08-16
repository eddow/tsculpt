<template>
	<div class="list-container">
		<Await :await="files" #default="{result: files}">
			<Tree :value="files" selectionMode="single" class="file-tree" toggleable>
				<template #default="{ node }">
					<span v-if="node.children" :class="{ 'file-node': true, 'is-file': !node.children }">
						<i class="pi pi-folder" />
						{{ node.label }}
					</span>
					<a v-else :class="{ 'file-node': true, 'is-file': !node.children }" :href="`/module/${node.path}`">
						<i class="pi pi-file" />
						{{ node.label }}
					</a>
				</template>
			</Tree>
		</Await>
	</div>
</template>

<script setup lang="ts">
import { modules } from '@/lib/source'
import type { TreeNode } from 'primevue/treenode'

function addNode(nodes: TreeNode[], path: string) {
	const parts = path.split('/')
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
		path: path.replace(/\.sculpt\.ts$/, ''),
	})
}
const files = modules().then((modules: string[]) => {
	const nodes: TreeNode[] = []

	for (const path of modules) addNode(nodes, path)

	return nodes
})
</script>

<style lang="sass">
.list-container
	height: 100vh
	width: 100vw
	display: flex
	justify-content: center
	padding: 1rem
	box-sizing: border-box

.file-tree
	width: 100%
	max-width: 600px
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
