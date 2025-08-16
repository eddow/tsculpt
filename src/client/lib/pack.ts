import { type AMesh, Mesh, Vector3 } from '@tsculpt'

export interface MeshPack {
	vertices: Float32Array
	indices: Uint32Array
}

export function packMesh(mesh: AMesh): MeshPack {
	// Extract vertex coordinates from Vector3 array
	const vertices = new Float32Array(mesh.vectors.length * 3)
	let i = 0
	for (const vector of mesh.vectors) {
		vertices[i++] = vector[0]
		vertices[i++] = vector[1]
		vertices[i++] = vector[2]
	}

	// Extract face indices from Numbers3 array
	const indices = new Uint32Array(mesh.faces.length * 3)
	i = 0
	for (const face of mesh.faces) {
		indices[i++] = face[0]
		indices[i++] = face[1]
		indices[i++] = face[2]
	}

	return { vertices, indices }
}

export function unpackMesh(pack: MeshPack): AMesh {
	// Convert Float32Array back to Vector3 array
	const vectors: Vector3[] = []
	for (let i = 0; i < pack.vertices.length; i += 3) {
		vectors.push(new Vector3(pack.vertices[i], pack.vertices[i + 1], pack.vertices[i + 2]))
	}

	// Convert Uint32Array back to Numbers3 array
	const faces: [number, number, number][] = []
	for (let i = 0; i < pack.indices.length; i += 3) {
		faces.push([pack.indices[i], pack.indices[i + 1], pack.indices[i + 2]])
	}

	// Create a new Mesh from the unpacked data
	return new Mesh(faces, vectors)
}
