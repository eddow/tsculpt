import type { AMesh } from '@tsculpt'
import type { MeshData } from '../../io/index'

export function meshToMeshData(mesh: AMesh): MeshData {
	const vertices = mesh.vectors.map((v) => [v[0], v[1], v[2]] as [number, number, number])
	const faces = mesh.faces.map((f) => [f[0], f[1], f[2]] as [number, number, number])
	return { vertices, faces }
}
