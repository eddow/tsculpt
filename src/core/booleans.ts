import { AMesh, Vector3 } from '@tsculpt/types'
import { v3 } from '@tsculpt/types/builders'

export function triangles(vertices: [number, number, number][]) {
	const triangles: [Vector3, Vector3, Vector3][] = []
	for (let i = 1; i < vertices.length - 1; ++i) {
		triangles.push([v3(vertices[0]), v3(vertices[i]), v3(vertices[i + 1])])
	}
	return triangles
}

export interface Engine {
	union(...meshes: AMesh[]): AMesh
	intersect(...meshes: AMesh[]): AMesh
	subtract(mesh1: AMesh, mesh2: AMesh): AMesh
	hull(...meshes: AMesh[]): AMesh
}
