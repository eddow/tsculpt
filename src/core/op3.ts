import { MaybePromise } from '@tsculpt/ts/maybe'
import type { AMesh } from '@tsculpt/types'

export default interface Op3 {
	union(...meshes: AMesh[]): MaybePromise<AMesh>
	intersect(...meshes: AMesh[]): MaybePromise<AMesh>
	subtract(mesh1: AMesh, mesh2: AMesh): MaybePromise<AMesh>
	hull(...meshes: AMesh[]): MaybePromise<AMesh>
}
