import { geometries } from '@jscad/modeling'
import { Geom3 } from '@jscad/modeling/src/geometries/types'
import { Vec3 } from '@jscad/modeling/src/maths/vec3'
import { Vector3 } from '@tsculpt'
import { type IMesh, Mesh, v3 } from '../types'
const { geom3, poly3 } = geometries

type AMesh = IMesh | Geom3
export function toJscad(mesh: AMesh) {
	if ('verticed' in mesh) {
		const polys = mesh.verticed.map((face) => poly3.create(face as unknown as Vec3[]))
		return geom3.create(polys)
	}
	return mesh
}

// TODO fanning only works for convex polygons
function triangles(vertices: Vec3[]) {
	const triangles: [Vector3, Vector3, Vector3][] = []
	for (let i = 1; i < vertices.length - 1; ++i) {
		triangles.push([v3(vertices[0]), v3(vertices[i]), v3(vertices[i + 1])])
	}
	return triangles
}

export function fromJscad(geom: AMesh) {
	if ('verticed' in geom) return new Mesh(geom.verticed)
	const polys = geom.polygons.reduce(
		(acc, p) => {
			acc.push(...triangles(p.vertices))
			return acc
		},
		[] as [Vector3, Vector3, Vector3][]
	)
	return new Mesh(polys)
}
