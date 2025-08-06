import { type FileHandler, type MeshData, type Vector3 } from './index.js'

function arrayToVector3(arr: number[]): Vector3 {
	return arr as Vector3
}

function vector3ToArray(v: Vector3): number[] {
	return v as number[]
}

export default (
	extension: string,
	serialize: (geom3: JSCADGeometry) => ArrayBuffer,
	deserialize: (options: { output?: string; filename?: string }, data: Buffer) => JSCADResult
): FileHandler => ({
	extension,

	read(data: ArrayBuffer | string): MeshData {
		let buffer: Buffer

		if (typeof data === 'string') {
			// Convert string to Buffer
			buffer = Buffer.from(data, 'utf8')
		} else if (data instanceof ArrayBuffer) {
			// Convert ArrayBuffer to Buffer
			buffer = Buffer.from(data)
		} else {
			// Assume it's already a Buffer (from readFileSync)
			buffer = data as Buffer
		}

		// Use JSCAD STL deserializer
		const result = deserialize({ output: 'geometry' }, buffer)
		const geom3 = Array.isArray(result) ? result[0] : result

		// Convert JSCAD geometry to our format
		const faces: [Vector3, Vector3, Vector3][] = []

		if (!geom3 || !geom3.polygons) {
			console.warn('No geometry or polygons found in STL file')
			return { faces: [] }
		}

		for (const polygon of geom3.polygons) {
			const vertices = polygon.vertices

			// Triangulate the polygon (assuming it's already triangles for STL)
			for (let i = 0; i < vertices.length - 2; i++) {
				const face: [Vector3, Vector3, Vector3] = [
					arrayToVector3(vertices[0]),
					arrayToVector3(vertices[i + 1]),
					arrayToVector3(vertices[i + 2]),
				]
				faces.push(face)
			}
		}

		return { faces }
	},

	write(meshData: MeshData): ArrayBuffer {
		// Convert our format to JSCAD geometry
		const polygons = meshData.faces.map((face) => ({
			vertices: [vector3ToArray(face[0]), vector3ToArray(face[1]), vector3ToArray(face[2])],
			plane: [0, 0, 1, 0], // Default plane, will be calculated by JSCAD
		}))

		const geom3 = {
			polygons,
			transforms: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
			color: undefined,
		}

		// Use JSCAD serializer
		return serialize(geom3)
	},
})
