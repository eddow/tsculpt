import { computedClass, type Computed } from './computed'
import { ContourBase } from './types/contour'
import { MeshBase } from './types/mesh'

export const Contour = computedClass(ContourBase, { name: 'Contour' })
export type Contour = Computed<ContourBase>

export const Mesh = computedClass(MeshBase, { name: 'Mesh' })
export type Mesh = Computed<MeshBase>
