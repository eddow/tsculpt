import { readFileSync } from 'node:fs'
import { extname } from 'node:path'
import type { Plugin } from 'vite'
import { generateFakeMeshSource, generateMeshSource, getHandler } from '../io/index.js'

export default function meshPlugin(): Plugin {
	return {
		name: 'vite-plugin-mesh',
		enforce: 'pre',

		async transform(_code: string, id: string) {
			// Check if this is a mesh file import
			const ext = extname(id).toLowerCase().replace('.', '')
			const handler = getHandler(ext)

			if (!handler) {
				return null
			}

			try {
				// Read the file
				const fileBuffer = readFileSync(id)
				const meshData = handler.read(fileBuffer)

				// Generate TypeScript source
				const generatedSource = generateMeshSource(meshData)

				return {
					code: generatedSource,
					map: null,
				}
			} catch (error) {
				console.warn(`Failed to process mesh file ${id}:`, error)

				// Fallback to fake mesh
				const fakeSource = generateFakeMeshSource()

				return {
					code: fakeSource,
					map: null,
				}
			}
		},

		// Handle virtual imports for mesh files
		resolveId(id: string) {
			if (id.endsWith('?mesh')) {
				return id
			}
			return null
		},

		async load(id: string) {
			if (id.endsWith('?mesh')) {
				const filePath = id.replace('?mesh', '')
				const ext = extname(filePath).toLowerCase().replace('.', '')
				const handler = getHandler(ext)

				if (!handler) {
					return null
				}

				try {
					const fileBuffer = readFileSync(filePath)
					const meshData = handler.read(fileBuffer)
					return generateMeshSource(meshData)
				} catch (error) {
					console.warn(`Failed to load mesh file ${filePath}:`, error)
					return generateFakeMeshSource()
				}
			}
			return null
		},
	}
}
