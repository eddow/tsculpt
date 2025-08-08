import { FaceData, type FileHandler, type MeshData, type Vector3Data } from './index.js'

function arrayToVector3(arr: number[]): Vector3Data {
	return [arr[0], arr[2], arr[1]] // Swap Y and Z
}

function vector3ToArray(v: Vector3Data): number[] {
	return [v[0], v[2], v[1]] // Swap Y and Z
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
		const faces: [Vector3Data, Vector3Data, Vector3Data][] = []

		if (!geom3 || !geom3.polygons) {
			console.warn('No geometry or polygons found in STL file')
			return { faces: [] }
		}

		for (const polygon of geom3.polygons) {
			const vertices = polygon.vertices

			// Triangulate the polygon (assuming it's already triangles for STL)
			for (let i = 0; i < vertices.length - 2; i++) {
				const face: [Vector3Data, Vector3Data, Vector3Data] = [
					arrayToVector3(vertices[0]),
					arrayToVector3(vertices[i + 2]),
					arrayToVector3(vertices[i + 1]),
				]
				faces.push(face)
			}
		}

		return { faces }
	},

	write(meshData: MeshData): ArrayBuffer {
		const { vertices } = meshData
		const v3a = vertices
			? (v: Vector3Data | number) => vector3ToArray(vertices[v as number])
			: (v: Vector3Data | number) => vector3ToArray(v as Vector3Data)

		// Convert our format to JSCAD geometry
		const polygons = meshData.faces.map((face) => ({
			vertices: [v3a(face[0]), v3a(face[2]), v3a(face[1])],
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
