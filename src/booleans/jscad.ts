import { Color, Geom3, Poly3 } from '@jscad/modeling/src/geometries/types'
import { type Engine, triangles } from '@tsculpt/booleans'

import { booleans, geometries } from '@jscad/modeling'
import { hull } from '@jscad/modeling/src/operations/hulls'
import { Mat4 } from '@jscad/modeling/src/maths/mat4'
import { Vec3 } from '@jscad/modeling/src/maths/vec3'
import { AMesh, IntermediateMesh, Mesh, Vector3 } from '@tsculpt/types'
const { union, intersect, subtract } = booleans

const { geom3, poly3 } = geometries

class JscadMesh extends IntermediateMesh implements Geom3 {
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

function jscadMesh(mesh: AMesh): JscadMesh {
	if (mesh instanceof JscadMesh) return mesh
	const polys = mesh.verticed.map((face) => poly3.create(face as unknown as Vec3[]))
	return new JscadMesh(geom3.create(polys))
}
function jscadMeshes(meshes: AMesh[]): JscadMesh[] {
	return meshes.map(jscadMesh)
}

class JscadEngine implements Engine {
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

	hull(...meshes: AMesh[]): AMesh {
		const ops = jscadMeshes(meshes)
		return new JscadMesh(hull(...ops))
	}
}

export default new JscadEngine()

export * from '@tsculpt/booleans'
