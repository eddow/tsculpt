import type { AMesh } from '@tsculpt/types'

export default interface Op3 {
	union(...meshes: AMesh[]): Promise<AMesh>
	intersect(...meshes: AMesh[]): Promise<AMesh>
	subtract(mesh1: AMesh, mesh2: AMesh): Promise<AMesh>
	hull(...meshes: AMesh[]): Promise<AMesh>
}
