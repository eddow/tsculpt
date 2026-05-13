import { booleans, geometries } from '@jscad/modeling'
import { Color, Geom3, Poly3 } from '@jscad/modeling/src/geometries/types'
import { Mat4 } from '@jscad/modeling/src/maths/mat4'
import { Vec3 } from '@jscad/modeling/src/maths/vec3'
import { hull } from '@jscad/modeling/src/operations/hulls'
import { Algorithms } from '@tsculpt/ts/di'
import { type AMesh, IntermediateMesh, type MeshSpecification, Vector3 } from '@tsculpt/types'
const { union, intersect, subtract } = booleans

const { geom3, poly3 } = geometries

function triangles(polygon: [number, number, number][]) {
	const vectors = polygon.map((v) => new Vector3(...v))
	const triangles: [Vector3, Vector3, Vector3][] = []
	for (let i = 1; i < vectors.length - 1; ++i) {
		triangles.push([vectors[0], vectors[i], vectors[i + 1]])
	}
	return triangles
}

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

	toMesh(): MeshSpecification {
		const polys = this.polygons.reduce(
			(acc, p) => {
				acc.push(...triangles(p.vertices))
				return acc
			},
			[] as [Vector3, Vector3, Vector3][]
		)
		return polys
	}
}

function jscadMesh(mesh: AMesh): JscadMesh {
	if (mesh instanceof JscadMesh) return mesh

	// Validate mesh has valid data
	if (mesh.verticed.length === 0) {
		return new JscadMesh(geom3.create([]))
	}

	// Filter out faces with undefined vertices and create polygons
	const validPolys = mesh.verticed
		.filter((face) => face[0] && face[1] && face[2])
		.map((face) => poly3.create(face as unknown as Vec3[]))

	if (validPolys.length === 0) {
		return new JscadMesh(geom3.create([]))
	}

	return new JscadMesh(geom3.create(validPolys))
}
function jscadMeshes(meshes: AMesh[]): JscadMesh[] {
	return meshes.map(jscadMesh)
}

function union3(mesh1: AMesh, ...meshes: AMesh[]): AMesh {
	const ops = jscadMeshes([mesh1, ...meshes])
	return new JscadMesh(union(...ops))
}

function intersect3(mesh1: AMesh, ...meshes: AMesh[]): AMesh {
	const ops = jscadMeshes([mesh1, ...meshes])
	return new JscadMesh(intersect(...ops))
}

function subtract3(mesh1: AMesh, mesh2: AMesh): AMesh {
	const [op1, op2] = jscadMeshes([mesh1, mesh2])
	return new JscadMesh(subtract(op1, op2))
}

function hull3(mesh1: AMesh, ...meshes: AMesh[]): AMesh {
	const ops = jscadMeshes([mesh1, ...meshes])
	return new JscadMesh(hull(...ops))
}

export default {
	union3,
	intersect3,
	subtract3,
	hull3,
} satisfies Partial<Algorithms>
