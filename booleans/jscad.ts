import { Color, Geom3, Poly3 } from '@jscad/modeling/src/geometries/types'
import { AMesh, Engine, InternalMesh } from '../src/booleans/index'

import { booleans, geometries } from '@jscad/modeling'
import { Mat4 } from '@jscad/modeling/src/maths/mat4'
import { triangles } from '../src/booleans/utils'
import { Mesh, Vector3 } from '../src/types'
import { Vec3 } from '@jscad/modeling/src/maths/vec3'
const { union, intersect, subtract } = booleans

const { geom3, poly3 } = geometries

type AJscadMesh = Mesh | Geom3
function toJscad(mesh: AJscadMesh) {
	if ('verticed' in mesh) {
		const polys = mesh.verticed.map((face) => poly3.create(face as unknown as Vec3[]))
		return geom3.create(polys)
	}
	return mesh
}
class JscadMesh extends InternalMesh implements Geom3 {
	get polygons(): Poly3[] {
		return this.mesh.polygons
	}
	get transforms(): Mat4 {
		return this.mesh.transforms
	}
	get color(): Color | undefined {
		return this.mesh.color
	}
	constructor(public mesh: Geom3) {
		super()
	}

	toMesh(): Mesh {
		const polys = this.polygons.reduce(
			(acc, p) => {
				acc.push(...triangles(p.vertices))
				return acc
			},
			[] as [Vector3, Vector3, Vector3][]
		)
		return new Mesh(polys)
	}
}

function jscadMeshes(meshes: AMesh[]): JscadMesh[] {
	return meshes.map((m) => (m instanceof JscadMesh ? m : new JscadMesh(toJscad(m as Mesh))))
}

class JscadEngine extends Engine {
	union(...meshes: AMesh[]): AMesh {
		const ops = jscadMeshes(meshes)
		return new JscadMesh(union(...ops))
	}

	intersect(...meshes: AMesh[]): AMesh {
		const ops = jscadMeshes(meshes)
		return new JscadMesh(intersect(...ops))
	}

	subtract(mesh1: AMesh, mesh2: AMesh): AMesh {
		const [op1, op2] = jscadMeshes([mesh1, mesh2])
		return new JscadMesh(subtract(op1, op2))
	}
}

export default new JscadEngine()

export * from '../src/booleans/index'
