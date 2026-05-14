import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createRequire } from 'node:module'
import { Mesh, type Vector3, type MeshType } from '../core'
import { serialize as serializeSTL } from '@jscad/stl-serializer'
import { serialize as serializeOBJ } from '@jscad/obj-serializer'
import { serialize as serializeAMF } from '@jscad/amf-serializer'
import { serialize as serializeDXF } from '@jscad/dxf-serializer'
import { serialize as serializeSVG } from '@jscad/svg-serializer'
import { serialize as serializeX3D } from '@jscad/x3d-serializer'

// Use createRequire with __filename (will be transpiled correctly)
const require = createRequire(__filename)

export interface CompileOptions {
	output?: string
	format: 'stl' | 'obj' | 'amf' | 'dxf' | 'svg' | 'x3d'
	exportName?: string
	params?: Record<string, unknown>
}

type JSCADVertex = [number, number, number]
type JSCADPolygon = { vertices: JSCADVertex[]; plane: number[] }

const serializers = {
	stl: serializeSTL,
	obj: serializeOBJ,
	amf: serializeAMF,
	dxf: serializeDXF,
	svg: serializeSVG,
	x3d: serializeX3D,
}

export async function compileMesh(filePath: string, options: CompileOptions): Promise<void> {
	const resolvedPath = resolve(process.cwd(), filePath)
	const fileContent = await readFile(resolvedPath, 'utf-8')

	// Create a temporary module to evaluate the sculpt file
	const tempModulePath = resolvedPath + '.temp.js'

	// Transpile TypeScript to JavaScript
	const ts = require('typescript')
	const result = ts.transpileModule(fileContent, {
		compilerOptions: {
			module: ts.ModuleKind.ESNext,
			target: ts.ScriptTarget.ES2022,
			moduleResolution: ts.ModuleResolutionKind.Bundler,
			esModuleInterop: true,
			allowSyntheticDefaultImports: true,
			skipLibCheck: true,
		},
	})

	// Write transpiled code to a temporary file
	await require('fs/promises').writeFile(tempModulePath, result.outputText)

	try {
		// Import the transpiled module
		const moduleUrl = `file://${tempModulePath}`
		const module = await import(moduleUrl)

		// Get the specified export or default export
		let sceneFn: unknown
		if (options.exportName) {
			sceneFn = module[options.exportName]
			if (!sceneFn) {
				throw new Error(`Export "${options.exportName}" not found in sculpt file`)
			}
		} else {
			sceneFn = module.default || Object.values(module).find((fn: unknown) => typeof fn === 'function')
			if (!sceneFn) {
				throw new Error('No default export or function export found in sculpt file')
			}
		}

		// Ensure sceneFn is callable
		if (typeof sceneFn !== 'function') {
			throw new Error(`Export "${options.exportName || 'default'}" is not a function`)
		}

		// Call the scene function with parameters
		const params = options.params || {}
		const mesh = await (sceneFn as (params: Record<string, unknown>) => unknown)(params)

		if (!(mesh instanceof Mesh)) {
			throw new Error('Scene function must return a Mesh')
		}

		// Convert mesh to JSCAD format
		const jscadMesh = meshToJSCAD(mesh)

		// Serialize to the requested format
		const serializer = serializers[options.format]
		if (!serializer) {
			throw new Error(`Unsupported format: ${options.format}`)
		}

		const serialized = serializer(jscadMesh)

		// Convert ArrayBuffer to Buffer for output
		const outputBuffer = serialized instanceof ArrayBuffer ? Buffer.from(serialized) : serialized

		// Output the result
		if (options.output) {
			await require('fs/promises').writeFile(options.output, outputBuffer)
			console.log(`Successfully compiled to ${options.output}`)
		} else {
			process.stdout.write(outputBuffer)
		}
	} finally {
		// Clean up temporary file
		await require('fs/promises').unlink(tempModulePath).catch(() => {})
	}
}

function meshToJSCAD(mesh: MeshType): { polygons: JSCADPolygon[]; transforms: never[] } {
	// Convert tsculpt mesh to JSCAD geometry format
	// tsculpt uses faces (indices) and vectors (Vector3)
	// JSCAD expects polygons with vertices as [x, y, z] arrays
	const polygons: JSCADPolygon[] = []

	// Access the faces and vectors through the public interface
	// Using type assertions to bypass computed property issues
	const faces = (mesh as unknown as { faces: readonly [number, number, number][] }).faces
	const vectors = (mesh as unknown as { vectors: readonly Vector3[] }).vectors

	for (const face of faces) {
		const vertices: JSCADVertex[] = []
		for (const index of face) {
			const vector = vectors[index]
			vertices.push([vector.x, vector.y, vector.z])
		}
		// Calculate plane normal for JSCAD
		// Simple plane calculation using first three vertices
		const v0 = vertices[0]
		const v1 = vertices[1]
		const v2 = vertices[2]

		// Cross product to get normal
		const ux = v1[0] - v0[0]
		const uy = v1[1] - v0[1]
		const uz = v1[2] - v0[2]

		const vx = v2[0] - v0[0]
		const vy = v2[1] - v0[1]
		const vz = v2[2] - v0[2]

		const nx = uy * vz - uz * vy
		const ny = uz * vx - ux * vz
		const nz = ux * vy - uy * vx

		// Normalize
		const len = Math.sqrt(nx * nx + ny * ny + nz * nz)
		const normal = len > 0 ? [nx / len, ny / len, nz / len] : [0, 0, 1]

		// Calculate D value (distance from origin)
		const d = -(normal[0] * v0[0] + normal[1] * v0[1] + normal[2] * v0[2])

		polygons.push({ vertices, plane: [...normal, d] })
	}

	return { polygons, transforms: [] }
}
