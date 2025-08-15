import { describe, expect, it } from 'vitest'
import { circle, square } from '../contours'
import { Vector3 } from './bunches'
import { PathFn, extrude } from './extrusion'

describe('Extrusion Orientation', () => {
	// Test path functions
	const linearPath: PathFn = (t: number) => new Vector3(t, 0, 0)
	const curvedPath: PathFn = (t: number) => new Vector3(t, Math.sin(t * Math.PI), 0)
	const constantCircle = circle({ radius: 0.2 })

	it('should work with Frenet orientation (default)', () => {
		const mesh = extrude({
			path: curvedPath,
			contour: constantCircle,
			sampling: { type: 'count', samples: 20 },
			caps: false,
		})

		expect(mesh.vectors.length).toBeGreaterThan(0)
		expect(mesh.faces.length).toBeGreaterThan(0)
	})

	it('should work with Fixed Up orientation (constant up vector)', () => {
		const mesh = extrude({
			path: curvedPath,
			contour: constantCircle,
			sampling: { type: 'count', samples: 20 },
			caps: false,
			orientation: new Vector3(0, 0, 1),
		})

		expect(mesh.vectors.length).toBeGreaterThan(0)
		expect(mesh.faces.length).toBeGreaterThan(0)
	})

	it('should work with Fixed Up orientation (function up vector)', () => {
		const mesh = extrude({
			path: curvedPath,
			contour: constantCircle,
			sampling: { type: 'count', samples: 20 },
			caps: false,
			orientation: (t: number) => new Vector3(0, Math.cos(t * Math.PI), Math.sin(t * Math.PI)),
		})

		expect(mesh.vectors.length).toBeGreaterThan(0)
		expect(mesh.faces.length).toBeGreaterThan(0)
	})

	it('should work with linear path and Frenet orientation', () => {
		const mesh = extrude({
			path: linearPath,
			contour: constantCircle,
			sampling: { type: 'count', samples: 10 },
			caps: true,
		})

		expect(mesh.vectors.length).toBeGreaterThan(0)
		expect(mesh.faces.length).toBeGreaterThan(0)
		// Should have reasonable number of vertices
		expect(mesh.vectors.length).toBeGreaterThan(10)
	})

	it('should work with parametric contour', () => {
		const parametricContour = (t: number) => circle({ radius: 0.1 + 0.1 * t })

		const mesh = extrude({
			path: linearPath,
			contour: parametricContour,
			sampling: { type: 'count', samples: 10 },
			caps: false,
		})

		expect(mesh.vectors.length).toBeGreaterThan(0)
		expect(mesh.faces.length).toBeGreaterThan(0)
	})

	it('should handle adaptive sampling', () => {
		const mesh = extrude({
			path: linearPath,
			contour: constantCircle,
			sampling: { type: 'adaptive', maxSegmentLength: 0.1 },
			caps: false,
		})

		expect(mesh.vectors.length).toBeGreaterThan(0)
		expect(mesh.faces.length).toBeGreaterThan(0)
	})

	it('should handle custom range', () => {
		const mesh = extrude({
			path: linearPath,
			contour: constantCircle,
			sampling: { type: 'count', samples: 10 },
			range: { start: 0.2, end: 0.8 },
			caps: false,
		})

		expect(mesh.vectors.length).toBeGreaterThan(0)
		expect(mesh.faces.length).toBeGreaterThan(0)
		// Should have fewer vertices due to shorter range
		expect(mesh.vectors.length).toBeLessThan(130)
	})

	it('should properly deduplicate vertices', () => {
		// Create a simple linear extrusion that should have shared vertices
		const mesh = extrude({
			path: linearPath,
			contour: constantCircle,
			sampling: { type: 'count', samples: 5 },
			caps: true,
		})

		// Check that we have a reasonable number of unique vertices
		// A circle with 5 segments should have fewer unique vertices than total face references
		const totalFaceReferences = mesh.faces.flat().length
		const uniqueVertices = mesh.vectors.length

		// The number of unique vertices should be significantly less than face references
		// due to vertex deduplication
		expect(uniqueVertices).toBeLessThan(totalFaceReferences)

		// Should have some vertices (not empty)
		expect(uniqueVertices).toBeGreaterThan(0)

		// Should have some faces
		expect(mesh.faces.length).toBeGreaterThan(0)
	})

	it('should create exact 1x1x1 box from square extrusion', () => {
		// Create a 1x1 square and extrude it to height 1
		const squareContour = square({ size: 1 })
		const linearZPath: PathFn = (t: number) => new Vector3(0, 0, t) // Linear path along Z from 0 to 1

		const mesh = extrude({
			path: linearZPath,
			contour: squareContour,
			sampling: { type: 'count', samples: 2 }, // Just start and end
			caps: true,
			orientation: new Vector3(0, 0, 1), // Fixed up vector
		})

		// Should have exactly 8 vertices
		expect(mesh.vectors.length).toBe(8)

		// Should contain all expected vertices
		const expectedVertices = [
			new Vector3(-0.5, -0.5, 0), // Bottom face
			new Vector3(0.5, -0.5, 0),
			new Vector3(0.5, 0.5, 0),
			new Vector3(-0.5, 0.5, 0),
			new Vector3(-0.5, -0.5, 1), // Top face
			new Vector3(0.5, -0.5, 1),
			new Vector3(0.5, 0.5, 1),
			new Vector3(-0.5, 0.5, 1),
		]

		// Check that all expected vertices are present
		for (const expected of expectedVertices) {
			const found = mesh.vectors.some(
				(v) =>
					Math.abs(v.x - expected.x) < 1e-10 &&
					Math.abs(v.y - expected.y) < 1e-10 &&
					Math.abs(v.z - expected.z) < 1e-10
			)
			expect(found).toBe(true)
		}

		// Should have 12 faces (6 faces of a cube, each triangulated = 12 triangles)
		expect(mesh.faces.length).toBe(12)
	})
})
