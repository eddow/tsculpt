import type { AMesh } from '@tsculpt/types'

export default interface Engine {
	union(...meshes: AMesh[]): AMesh
	intersect(...meshes: AMesh[]): AMesh
	subtract(mesh1: AMesh, mesh2: AMesh): AMesh
	hull(...meshes: AMesh[]): AMesh
}
