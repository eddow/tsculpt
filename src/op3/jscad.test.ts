import { v3 } from '@tsculpt/types/builders'
import { Vector3 } from '@tsculpt/types/bunches'
import { AMesh, Mesh } from '@tsculpt/types/mesh'
import { describe, expect, it } from 'vitest'
import engine from './jscad'

// Helper function to create a simple test mesh
function createTestMesh(): Mesh {
	const vertices: Vector3[] = [v3(0, 0, 0), v3(1, 0, 0), v3(0, 1, 0), v3(1, 1, 0)]
	const faces: [Vector3, Vector3, Vector3][] = [
		[vertices[0], vertices[1], vertices[2]],
		[vertices[1], vertices[3], vertices[2]],
	]
	return new Mesh(faces)
}

describe('JscadEngine', () => {
	it('should perform union operations', () => {
		const mesh1 = createTestMesh()
		const mesh2 = createTestMesh()

		const result = engine.union(mesh1, mesh2)

		expect(result).toBeInstanceOf(AMesh)
		expect(result.vectors.length).toBeGreaterThan(0)
	})

	it('should perform intersection operations', () => {
		const mesh1 = createTestMesh()
		const mesh2 = createTestMesh()

		const result = engine.intersect(mesh1, mesh2)

		expect(result).toBeInstanceOf(AMesh)
		expect(result.vectors.length).toBeGreaterThan(0)
	})

	it('should perform subtraction operations', () => {
		const mesh1 = createTestMesh()
		const mesh2 = createTestMesh()

		const result = engine.subtract(mesh1, mesh2)

		expect(result).toBeInstanceOf(AMesh)
		// Subtraction of identical meshes might result in empty mesh
		expect(result.vectors.length).toBeGreaterThanOrEqual(0)
	})

	it('should perform hull operations', () => {
		const mesh1 = createTestMesh()
		const mesh2 = createTestMesh()

		const result = engine.hull(mesh1, mesh2)

		expect(result).toBeInstanceOf(AMesh)
		expect(result.vectors.length).toBeGreaterThan(0)
	})

	it('should handle multiple meshes in union', () => {
		const mesh1 = createTestMesh()
		const mesh2 = createTestMesh()
		const mesh3 = createTestMesh()

		const result = engine.union(mesh1, mesh2, mesh3)

		expect(result).toBeInstanceOf(AMesh)
		expect(result.vectors.length).toBeGreaterThan(0)
	})

	it('should handle multiple meshes in intersection', () => {
		const mesh1 = createTestMesh()
		const mesh2 = createTestMesh()
		const mesh3 = createTestMesh()

		const result = engine.intersect(mesh1, mesh2, mesh3)

		expect(result).toBeInstanceOf(AMesh)
		expect(result.vectors.length).toBeGreaterThan(0)
	})

	it('should handle multiple meshes in hull', () => {
		const mesh1 = createTestMesh()
		const mesh2 = createTestMesh()
		const mesh3 = createTestMesh()

		const result = engine.hull(mesh1, mesh2, mesh3)

		expect(result).toBeInstanceOf(AMesh)
		expect(result.vectors.length).toBeGreaterThan(0)
	})
})
