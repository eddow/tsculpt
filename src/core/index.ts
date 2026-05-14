export * from './types'
export * from './computed'
export { Contour, Mesh } from './facades'
export type { ContourType, MeshType } from './facades'

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
	rect,
	square,
	ellipse,
	circle,
	annulus,
	sector,
	ringSector,
	roundedRectangle,
	regularPolygon,
	capsule,
	slot,
	star,
} from './public'
export {
	linearExtrude,
	rotateExtrude,
	linearExtrudeBase,
	rotateExtrudeBase,
	sweep,
	loft,
} from './extrusions'
export { extrude, type ExtrusionSpec } from './types/extrusion'
export type { ContourFn, PathFn } from './types/extrusion'
export { assert } from './ts/debug'
export * from './math'

export * from './algorithms'
export { analyzeGeometry, type GeometryStats, type Printability, repairMesh, type RepairReport } from './geometry-utils'
