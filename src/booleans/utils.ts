import { Vec3 } from "@jscad/modeling/src/maths/vec3"
import { v3 } from "@tsculpt/types"
import { Vector3 } from "../types"

// TODO fanning only works for convex polygons
export function triangles(vertices: Vec3[]) {
	const triangles: [Vector3, Vector3, Vector3][] = []
	for (let i = 1; i < vertices.length - 1; ++i) {
		triangles.push([v3(vertices[0]), v3(vertices[i]), v3(vertices[i + 1])])
	}
	return triangles
}
