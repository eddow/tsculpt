import { geometries } from '@jscad/modeling'
import { Geom3 } from '@jscad/modeling/src/geometries/types'
import { Vec3 } from '@jscad/modeling/src/maths/vec3'
import { Vector3 } from '@tsculpt'
import { type IMesh, Mesh } from '../types'
const { geom3, poly3 } = geometries
export function toJscad(mesh: IMesh) {
	const polys = mesh.verticed.map((face) => poly3.create(face as unknown as Vec3[]))
	return geom3.create(polys)
}
// TODO fanning only works for convex polygons
function triangles(vertices: Vec3[]) {
	const triangles = []
	for (let i = 1; i < vertices.length - 1; ++i) {
		triangles.push([vertices[0], vertices[i], vertices[i + 1]] as [Vector3, Vector3, Vector3])
	}
	return triangles
}

export function fromJscad(geom: Geom3) {
	const polys = geom.polygons.reduce(
		(acc, p) => {
			acc.push(...triangles(p.vertices))
			return acc
		},
		[] as [Vector3, Vector3, Vector3][]
	)
	return new Mesh(polys)
}
