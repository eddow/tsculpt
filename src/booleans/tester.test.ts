import { describe, expect, it, beforeEach } from 'vitest'
import { TesterEngine, FakeMesh } from './tester'
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

describe('TesterEngine', () => {
	let engine: TesterEngine

	beforeEach(() => {
		engine = new TesterEngine()
	})

	describe('operation tracking', () => {
		it('should start with zero operations', () => {
			expect(engine.getOperationCount()).toBe(0)
		})

		it('should increment operation count for union', () => {
			const mesh1 = createTestMesh()
			const mesh2 = createTestMesh()

			engine.union(mesh1, mesh2)

			expect(engine.getOperationCount()).toBe(1)
		})

		it('should increment operation count for intersect', () => {
			const mesh1 = createTestMesh()
			const mesh2 = createTestMesh()

			engine.intersect(mesh1, mesh2)

			expect(engine.getOperationCount()).toBe(1)
		})

		it('should increment operation count for subtract', () => {
			const mesh1 = createTestMesh()
			const mesh2 = createTestMesh()

			engine.subtract(mesh1, mesh2)

			expect(engine.getOperationCount()).toBe(1)
		})

		it('should track multiple operations', () => {
			const mesh1 = createTestMesh()
			const mesh2 = createTestMesh()
			const mesh3 = createTestMesh()

			engine.union(mesh1, mesh2)
			engine.intersect(mesh2, mesh3)
			engine.subtract(mesh1, mesh3)

			expect(engine.getOperationCount()).toBe(3)
		})

		it('should reset operation count', () => {
			const mesh1 = createTestMesh()
			const mesh2 = createTestMesh()

			engine.union(mesh1, mesh2)
			expect(engine.getOperationCount()).toBe(1)

			engine.resetOperationCount()
			expect(engine.getOperationCount()).toBe(0)
		})
	})

	describe('fake mesh generation', () => {
		it('should return FakeMesh for union operations', () => {
			const mesh1 = createTestMesh()
			const mesh2 = createTestMesh()

			const result = engine.union(mesh1, mesh2)

			expect(result).toBeInstanceOf(FakeMesh)
			expect((result as FakeMesh).id).toBe('union_1_2_meshes')
		})

		it('should return FakeMesh for intersect operations', () => {
			const mesh1 = createTestMesh()
			const mesh2 = createTestMesh()

			const result = engine.intersect(mesh1, mesh2)

			expect(result).toBeInstanceOf(FakeMesh)
			expect((result as FakeMesh).id).toBe('intersect_1_2_meshes')
		})

		it('should return FakeMesh for subtract operations', () => {
			const mesh1 = createTestMesh()
			const mesh2 = createTestMesh()

			const result = engine.subtract(mesh1, mesh2)

			expect(result).toBeInstanceOf(FakeMesh)
			expect((result as FakeMesh).id).toBe('subtract_1_mesh1_mesh2')
		})

		it('should handle multiple meshes in union', () => {
			const mesh1 = createTestMesh()
			const mesh2 = createTestMesh()
			const mesh3 = createTestMesh()

			const result = engine.union(mesh1, mesh2, mesh3)

			expect(result).toBeInstanceOf(FakeMesh)
			expect((result as FakeMesh).id).toBe('union_1_3_meshes')
		})

		it('should handle multiple meshes in intersect', () => {
			const mesh1 = createTestMesh()
			const mesh2 = createTestMesh()
			const mesh3 = createTestMesh()

			const result = engine.intersect(mesh1, mesh2, mesh3)

			expect(result).toBeInstanceOf(FakeMesh)
			expect((result as FakeMesh).id).toBe('intersect_1_3_meshes')
		})

		it('should generate unique IDs for sequential operations', () => {
			const mesh1 = createTestMesh()
			const mesh2 = createTestMesh()

			const result1 = engine.union(mesh1, mesh2)
			const result2 = engine.intersect(mesh1, mesh2)
			const result3 = engine.subtract(mesh1, mesh2)

			expect((result1 as FakeMesh).id).toBe('union_1_2_meshes')
			expect((result2 as FakeMesh).id).toBe('intersect_2_2_meshes')
			expect((result3 as FakeMesh).id).toBe('subtract_3_mesh1_mesh2')
		})
	})

	describe('mesh conversion', () => {
		it('should convert FakeMesh to real Mesh', () => {
			const mesh1 = createTestMesh()
			const mesh2 = createTestMesh()

			const fakeResult = engine.union(mesh1, mesh2)
			const realMesh = engine.result(fakeResult)

			expect(realMesh).toBeInstanceOf(Mesh)
			expect(realMesh.vectors.length).toBe(3) // Single triangle
			expect(realMesh.faces.length).toBe(1)
		})

		it('should convert regular Mesh to Mesh', () => {
			const mesh1 = createTestMesh()

			const realMesh = engine.result(mesh1)

			expect(realMesh).toBeInstanceOf(Mesh)
			expect(realMesh).toBe(mesh1) // Should be the same instance
		})
	})

	describe('FakeMesh', () => {
		it('should create a simple triangle mesh', () => {
			const fakeMesh = new FakeMesh('test_mesh')

			const mesh = fakeMesh.toMesh()

			expect(mesh).toBeInstanceOf(Mesh)
			expect(mesh.vectors.length).toBe(3)
			expect(mesh.faces.length).toBe(1)

			// Check vertices
			expect(mesh.vectors[0]).toEqual([0, 0, 0])
			expect(mesh.vectors[1]).toEqual([1, 0, 0])
			expect(mesh.vectors[2]).toEqual([0, 1, 0])
		})

		it('should have readable ID', () => {
			const fakeMesh = new FakeMesh('custom_id')

			expect(fakeMesh.id).toBe('custom_id')
		})
	})
})
