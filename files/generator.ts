import { type MeshData, type Vector3 } from './index.js'

export function generateMeshSource(meshData: MeshData, _meshName = 'mesh'): string {
	const faces = meshData.faces
		.map((face) => `[${face.map((vertex) => `[${vertex.join(', ')}]`).join(', ')}]`)
		.join(',\n\t')

	return `import { Mesh } from '@tsculpt/types/mesh'

const faces = [
	${faces}
]

export default new Mesh(faces)
`
}

export function generateMeshDataFromFaces(faces: [Vector3, Vector3, Vector3][]): MeshData {
	return { faces }
}

export function generateFakeMeshSource(meshName = 'mesh'): string {
	return `import { Mesh } from '@tsculpt/types/mesh'

// Generated fake mesh for ${meshName}
const faces = [
	[[0, 0, 0], [1, 0, 0], [0, 1, 0]],
	[[1, 0, 0], [1, 1, 0], [0, 1, 0]],
	[[0, 0, 1], [1, 0, 1], [0, 1, 1]],
	[[1, 0, 1], [1, 1, 1], [0, 1, 1]],
	[[0, 0, 0], [1, 0, 0], [0, 0, 1]],
	[[1, 0, 0], [1, 0, 1], [0, 0, 1]],
	[[0, 1, 0], [1, 1, 0], [0, 1, 1]],
	[[1, 1, 0], [1, 1, 1], [0, 1, 1]],
	[[0, 0, 0], [0, 1, 0], [0, 0, 1]],
	[[0, 1, 0], [0, 1, 1], [0, 0, 1]],
	[[1, 0, 0], [1, 1, 0], [1, 0, 1]],
	[[1, 1, 0], [1, 1, 1], [1, 0, 1]]
]

export default new Mesh(faces)
`
}
