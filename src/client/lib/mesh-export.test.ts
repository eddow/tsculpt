import { MeshBase, v3 } from '@tsculpt'
import { describe, expect, it } from 'vitest'
import { meshToMeshData } from './mesh-export'

describe('meshToMeshData', () => {
	it('exports indexed faces when vertices are present', () => {
		const mesh = new MeshBase([[0, 1, 2]], [v3(0, 0, 0), v3(1, 0, 0), v3(0, 1, 0)])

		expect(meshToMeshData(mesh)).toEqual({
			vertices: [
				[0, 0, 0],
				[1, 0, 0],
				[0, 1, 0],
			],
			faces: [[0, 1, 2]],
		})
	})
})
