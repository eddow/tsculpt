import { FaceData, type MeshData, type Vector3Data } from './index.js'

export function generateMeshSource(meshData: MeshData): string {
	const v3s = (vs: Vector3Data[]) =>
		vs.map((v) => `[${v.join(', ')}]`)
		.join(',\n\t')
	const [faces, vertices] = meshData.vertices ?
		[
			v3s(meshData.faces as Vector3Data[]),
			v3s(meshData.vertices as Vector3Data[])
		] : [
			(meshData.faces as FaceData[])
				.map((face) => `[${face.map((vertex) => `[${vertex.join(', ')}]`).join(', ')}]`)
				.join(',\n\t')
		]

	return `import { Mesh } from '@tsculpt/types/mesh'

export default new Mesh([
	${faces}
]${vertices ? `, [
	${vertices}
]`: ''})
`
}

export function generateFakeMeshSource(): string {
	return `import { Mesh } from '@tsculpt/types/mesh'

// Mock mesh source
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
