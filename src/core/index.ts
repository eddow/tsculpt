export * from './types'
import type Op2 from '@tsculpt/op2'
import type Op3 from '@tsculpt/op3'
import di from '@tsculpt/ts/di'
export { generation, type GenerationParameters } from './globals'
export * from './expression/linear'
export { box, sphere, cylinder, cone, torus } from './geometries'
export { circle, square } from './contours'
export { linearExtrude, rotateExtrude } from './extrusions'
export { Contour } from './types/contour'

export const { op3, op2 } = di<{ op3: Op3; op2: Op2 }>()
