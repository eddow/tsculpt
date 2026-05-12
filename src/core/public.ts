import { lift } from './computed'
export { Contour, type Contour, Mesh, type Mesh } from './facades'
import {
	annulus as annulusBase,
	capsule as capsuleBase,
	circle as circleBase,
	ellipse as ellipseBase,
	rect as rectBase,
	regularPolygon as regularPolygonBase,
	ringSector as ringSectorBase,
	roundedRectangle as roundedRectangleBase,
	sector as sectorBase,
	slot as slotBase,
	square as squareBase,
	star as starBase,
} from './shapes'
import {
	box as boxBase,
	capsule3D as capsule3DBase,
	cone as coneBase,
	cylinder as cylinderBase,
	ellipsoid as ellipsoidBase,
	frustum as frustumBase,
	hemisphere as hemisphereBase,
	prism as prismBase,
	pyramid as pyramidBase,
	sphere as sphereBase,
	torus as torusBase,
	tube as tubeBase,
} from './geometries'

export const rect = lift(rectBase, { name: 'rect' })
export const square = lift(squareBase, { name: 'square' })
export const ellipse = lift(ellipseBase, { name: 'ellipse' })
export const circle = lift(circleBase, { name: 'circle' })
export const annulus = lift(annulusBase, { name: 'annulus' })
export const sector = lift(sectorBase, { name: 'sector' })
export const ringSector = lift(ringSectorBase, { name: 'ringSector' })
export const roundedRectangle = lift(roundedRectangleBase, { name: 'roundedRectangle' })
export const regularPolygon = lift(regularPolygonBase, { name: 'regularPolygon' })
export const capsule = lift(capsuleBase, { name: 'capsule' })
export const slot = lift(slotBase, { name: 'slot' })
export const star = lift(starBase, { name: 'star' })

export const box = lift(boxBase, { name: 'box' })
export const sphere = lift(sphereBase, { name: 'sphere' })
export const cylinder = lift(cylinderBase, { name: 'cylinder' })
export const cone = lift(coneBase, { name: 'cone' })
export const torus = lift(torusBase, { name: 'torus' })
export const frustum = lift(frustumBase, { name: 'frustum' })
export const tube = lift(tubeBase, { name: 'tube' })
export const ellipsoid = lift(ellipsoidBase, { name: 'ellipsoid' })
export const prism = lift(prismBase, { name: 'prism' })
export const pyramid = lift(pyramidBase, { name: 'pyramid' })
export const capsule3D = lift(capsule3DBase, { name: 'capsule3D' })
export const hemisphere = lift(hemisphereBase, { name: 'hemisphere' })
