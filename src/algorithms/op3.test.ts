import { AMesh, Mesh, Vector3 } from '@tsculpt/types'
import { v3 } from '@tsculpt/types/builders'
import { beforeEach, describe, expect, it } from 'vitest'
import engine, { FakeMesh } from './op3.tester'

// Helper function to create a simple test mesh
function createTestMesh(): Mesh {
	const vertices: Vector3[] = [v3(0, 0, 0), v3(1, 0, 0), v3(0, 1, 0), v3(0, 0, 1)]
	const faces: [Vector3, Vector3, Vector3][] = [
		[vertices[0], vertices[1], vertices[2]],
		[vertices[1], vertices[3], vertices[2]],
	]
	return new Mesh(faces)
}

describe('TesterEngine', () => {
	beforeEach(() => {
		engine.resetOperationCount()
	})

	describe('operation tracking', () => {
		it('should start with zero operations', () => {
			expect(engine.getOperationCount()).toBe(0)
		})

		it('should increment operation count for union', async () => {
			const mesh1 = createTestMesh()
			const mesh2 = createTestMesh()

			await engine.union(mesh1, mesh2)

			expect(engine.getOperationCount()).toBe(1)
		})

		it('should increment operation count for intersect', async () => {
			const mesh1 = createTestMesh()
			const mesh2 = createTestMesh()

			await engine.intersect(mesh1, mesh2)

			expect(engine.getOperationCount()).toBe(1)
		})

		it('should increment operation count for subtract', async () => {
			const mesh1 = createTestMesh()
			const mesh2 = createTestMesh()

			await engine.subtract(mesh1, mesh2)

			expect(engine.getOperationCount()).toBe(1)
		})

		it('should increment operation count for hull', async () => {
			const mesh1 = createTestMesh()
			const mesh2 = createTestMesh()

			await engine.hull(mesh1, mesh2)

			expect(engine.getOperationCount()).toBe(1)
		})

		it('should track multiple operations', async () => {
			const mesh1 = createTestMesh()
			const mesh2 = createTestMesh()
			const mesh3 = createTestMesh()

			await engine.union(mesh1, mesh2)
			await engine.intersect(mesh2, mesh3)
			await engine.subtract(mesh1, mesh3)

			expect(engine.getOperationCount()).toBe(3)
		})

		it('should reset operation count', async () => {
			const mesh1 = createTestMesh()
			const mesh2 = createTestMesh()

			await engine.union(mesh1, mesh2)
			expect(engine.getOperationCount()).toBe(1)

			engine.resetOperationCount()
			expect(engine.getOperationCount()).toBe(0)
		})
	})

	describe('fake mesh generation', () => {
		it('should return FakeMesh for union operations', async () => {
			const mesh1 = createTestMesh()
			const mesh2 = createTestMesh()

			const result = await engine.union(mesh1, mesh2)

			expect(result).toBeInstanceOf(FakeMesh)
			expect((result as FakeMesh).id).toBe('union_1_2_meshes')
		})

		it('should return FakeMesh for intersect operations', async () => {
			const mesh1 = createTestMesh()
			const mesh2 = createTestMesh()

			const result = await engine.intersect(mesh1, mesh2)

			expect(result).toBeInstanceOf(FakeMesh)
			expect((result as FakeMesh).id).toBe('intersect_1_2_meshes')
		})

		it('should return FakeMesh for subtract operations', async () => {
			const mesh1 = createTestMesh()
			const mesh2 = createTestMesh()

			const result = await engine.subtract(mesh1, mesh2)

			expect(result).toBeInstanceOf(FakeMesh)
			expect((result as FakeMesh).id).toBe('subtract_1_mesh1_mesh2')
		})

		it('should return FakeMesh for hull operations', async () => {
			const mesh1 = createTestMesh()
			const mesh2 = createTestMesh()

			const result = await engine.hull(mesh1, mesh2)

			expect(result).toBeInstanceOf(FakeMesh)
			expect((result as FakeMesh).id).toBe('hull_1_2_meshes')
		})

		it('should handle multiple meshes in union', async () => {
			const mesh1 = createTestMesh()
			const mesh2 = createTestMesh()
			const mesh3 = createTestMesh()

			const result = await engine.union(mesh1, mesh2, mesh3)

			expect(result).toBeInstanceOf(FakeMesh)
			expect((result as FakeMesh).id).toBe('union_1_3_meshes')
		})

		it('should handle multiple meshes in intersect', async () => {
			const mesh1 = createTestMesh()
			const mesh2 = createTestMesh()
			const mesh3 = createTestMesh()

			const result = await engine.intersect(mesh1, mesh2, mesh3)

			expect(result).toBeInstanceOf(FakeMesh)
			expect((result as FakeMesh).id).toBe('intersect_1_3_meshes')
		})

		it('should handle multiple meshes in hull', async () => {
			const mesh1 = createTestMesh()
			const mesh2 = createTestMesh()
			const mesh3 = createTestMesh()

			const result = await engine.hull(mesh1, mesh2, mesh3)

			expect(result).toBeInstanceOf(FakeMesh)
			expect((result as FakeMesh).id).toBe('hull_1_3_meshes')
		})
	})
})
