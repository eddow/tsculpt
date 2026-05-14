import { type Computed, computedClass } from './computed'
import { ContourBase } from './types/contour'
import { MeshBase } from './types/mesh'

export const Contour = computedClass(ContourBase, { name: 'Contour' })
export type ContourType = Computed<ContourBase>

export const Mesh = computedClass(MeshBase, { name: 'Mesh' })
export type MeshType = Computed<MeshBase>
