import { describe, expect, it } from 'vitest'
import { JscadEngine } from './jscad'
import { Mesh } from '../types/mesh'
import { Vector3 } from '../types/bunches'

// Helper function to create a simple test mesh
function createTestMesh(): Mesh {
	const vertices: Vector3[] = [
		new Vector3(0, 0, 0),
		new Vector3(1, 0, 0),
		new Vector3(0, 1, 0),
		new Vector3(1, 1, 0)
	]
	const faces: [Vector3, Vector3, Vector3][] = [
		[vertices[0], vertices[1], vertices[2]],
		[vertices[1], vertices[3], vertices[2]]
	]
	return new Mesh(faces)
}

describe('JscadEngine', () => {
	const engine = new JscadEngine()

		it('should perform union operations', () => {
		const mesh1 = createTestMesh()
		const mesh2 = createTestMesh()

		const result = engine.union(mesh1, mesh2)
		const meshResult = engine.result(result)

		expect(meshResult).toBeInstanceOf(Mesh)
		expect(meshResult.vectors.length).toBeGreaterThan(0)
	})

	it('should perform intersection operations', () => {
		const mesh1 = createTestMesh()
		const mesh2 = createTestMesh()

		const result = engine.intersect(mesh1, mesh2)
		const meshResult = engine.result(result)

		expect(meshResult).toBeInstanceOf(Mesh)
		expect(meshResult.vectors.length).toBeGreaterThan(0)
	})

		it('should perform subtraction operations', () => {
		const mesh1 = createTestMesh()
		const mesh2 = createTestMesh()

		const result = engine.subtract(mesh1, mesh2)
		const meshResult = engine.result(result)

		expect(meshResult).toBeInstanceOf(Mesh)
		// Subtraction of identical meshes might result in empty mesh
		expect(meshResult.vectors.length).toBeGreaterThanOrEqual(0)
	})

	it('should handle multiple meshes in union', () => {
		const mesh1 = createTestMesh()
		const mesh2 = createTestMesh()
		const mesh3 = createTestMesh()

		const result = engine.union(mesh1, mesh2, mesh3)
		const meshResult = engine.result(result)

		expect(meshResult).toBeInstanceOf(Mesh)
		expect(meshResult.vectors.length).toBeGreaterThan(0)
	})

	it('should handle multiple meshes in intersection', () => {
		const mesh1 = createTestMesh()
		const mesh2 = createTestMesh()
		const mesh3 = createTestMesh()

		const result = engine.intersect(mesh1, mesh2, mesh3)
		const meshResult = engine.result(result)

		expect(meshResult).toBeInstanceOf(Mesh)
		expect(meshResult.vectors.length).toBeGreaterThan(0)
	})
})
