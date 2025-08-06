export interface FileHandler {
	extension: string
	read: (data: ArrayBuffer | string) => MeshData
	write: (meshData: MeshData) => ArrayBuffer | string
}

export interface MeshData {
	faces: [Vector3, Vector3, Vector3][]
	vertices?: Vector3[]
}

export type Vector3 = [number, number, number]

// Registry of all file handlers
export const fileHandlers: Record<string, FileHandler> = {}

export function getHandler(extension: string): FileHandler | undefined {
	return fileHandlers[extension.toLowerCase()]
}

export function getSupportedExtensions(): string[] {
	return Object.keys(fileHandlers)
}

export function registerHandler(handler: FileHandler) {
	fileHandlers[handler.extension.toLowerCase()] = handler
}

// Register built-in handlers
import jscadGen from './jscadGen.js'
import { deserialize as stlDeserialize } from '@jscad/stl-deserializer'
import { serialize as stlSerialize } from '@jscad/stl-serializer'
import { deserialize as objDeserialize } from '@jscad/obj-deserializer'
import { serialize as objSerialize } from '@jscad/obj-serializer'

registerHandler(jscadGen('stl', stlSerialize, stlDeserialize))
registerHandler(jscadGen('obj', objSerialize, objDeserialize))

// Export generator functions
export * from './generator'
