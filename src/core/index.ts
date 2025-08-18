export * from './types'
import type Op2 from '@tsculpt/op2'
import type Op3 from '@tsculpt/op3'
import di from '@tsculpt/ts/di'
export { generation, type GenerationParameters } from './globals'
export * from './expression/linear'
export {
	box,
	sphere,
	cylinder,
	cone,
	torus,
	frustum,
	tube,
	ellipsoid,
	prism,
	pyramid,
	capsule3D,
	hemisphere,
} from './geometries'
export {
	circle,
	square,
	ellipse,
	annulus,
	sector,
	ringSector,
	roundedRectangle,
	regularPolygon,
	capsule,
	slot,
	star,
} from './shapes'
export { linearExtrude, rotateExtrude } from './extrusions'
export { Contour } from './types/contour'
export { assert } from './ts/debug'
export * from './math'

export const { op3, op2 } = di<{ op3: Op3; op2: Op2 }>()
