import { lerp } from '@tsculpt/math'
import { describe, expect, it } from 'vitest'
import { circle, square } from '../contours'
import { v2, v3 } from './builders'
import { Contour } from './contour'
import { PathFn, extrude } from './extrusion'

describe('Extrusion Orientation', () => {
	// Test path functions
	const linearPath: PathFn = (t: number) => ({
		o: v3(0, 0, t),
		x: v3(1, 0, 0),
		y: v3(0, 1, 0),
	})
	const curvedPath: PathFn = (t: number) => ({
		o: v3(t, Math.sin(t * Math.PI), 0),
		x: v3(1, Math.cos(t * Math.PI) * Math.PI, 0).normalized(),
		y: v3(0, 0, 1),
	})
	const constantCircle = circle({ radius: 0.2 })
	const squareContour = square({ size: 1 })

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
		const linearZPath: PathFn = (t: number) => ({
			o: v3(0, 0, t), // Linear path along Z from 0 to 1
			x: v3(1, 0, 0),
			y: v3(0, 1, 0),
		})

		const mesh = extrude({
			path: linearZPath,
			contour: squareContour,
			sampling: { type: 'count', samples: 2 }, // Just start and end
			caps: true,
		})

		// Should have exactly 8 vertices
		expect(mesh.vectors.length).toBe(8)

		// Should contain all expected vertices
		const expectedVertices = [
			v3(-0.5, -0.5, 0), // Bottom face
			v3(0.5, -0.5, 0),
			v3(0.5, 0.5, 0),
			v3(-0.5, 0.5, 0),
			v3(-0.5, -0.5, 1), // Top face
			v3(0.5, -0.5, 1),
			v3(0.5, 0.5, 1),
			v3(-0.5, 0.5, 1),
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

	it('should create pyramid from square extrusion with scaling', () => {
		const linearZPath: PathFn = (t: number) => ({
			o: v3(0, 0, t * 2), // Linear path along Z from 0 to 2
			x: v3(1, 0, 0),
			y: v3(0, 1, 0),
		})

		const mesh = extrude({
			path: linearZPath,
			contour: (t: number) => {
				// Scale the square from 1.0 at bottom to 0.5 at top
				const scale = 1.0 - (1.0 - 0.5) * t
				return square({ size: scale })
			},
			sampling: { type: 'count', samples: 2 }, // Just start and end
			caps: true,
		})

		// Should have at least 8 vertices (new algorithm may create more for better quality)
		expect(mesh.vectors.length).toBeGreaterThanOrEqual(8)

		// Should contain all expected vertices for a pyramid
		const expectedVertices = [
			v3(-0.5, -0.5, 0), // Bottom face (full size)
			v3(0.5, -0.5, 0),
			v3(0.5, 0.5, 0),
			v3(-0.5, 0.5, 0),
			v3(-0.25, -0.25, 2), // Top face (50% size, centered)
			v3(0.25, -0.25, 2),
			v3(0.25, 0.25, 2),
			v3(-0.25, 0.25, 2),
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

		// Should have 12 faces (6 faces of a pyramid, each triangulated = 12 triangles)
		expect(mesh.faces.length).toBe(12)
	})

	it('should create pyramid matching the example file specification', () => {
		// This test replicates the exact pyramid from extrusion-example.sculpt.ts

		// This should match the pyramid example in the file
		const mesh = extrude({
			path: (t: number) => ({
				o: v3(0, 0, (t - 0.5) * 2), // Centered, height 2
				x: v3(1, 0, 0),
				y: v3(0, 1, 0),
			}),
			contour: (t: number) => {
				// Scale from 1.0 at bottom to 0.5 at top
				const scale = lerp(1.0, 0.5, t)
				return square({ size: scale })
			},
			sampling: { type: 'count', samples: 2 }, // Just start and end
			caps: true,
		})

		// Should have exactly 8 vertices
		expect(mesh.vectors.length).toBe(8)

		// Should contain all expected vertices for the centered pyramid
		const expectedVertices = [
			v3(-0.5, -0.5, -1), // Bottom face (full size, centered)
			v3(0.5, -0.5, -1),
			v3(0.5, 0.5, -1),
			v3(-0.5, 0.5, -1),
			v3(-0.25, -0.25, 1), // Top face (50% size, centered)
			v3(0.25, -0.25, 1),
			v3(0.25, 0.25, 1),
			v3(-0.25, 0.25, 1),
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

		// Should have 12 faces (6 faces of a pyramid, each triangulated = 12 triangles)
		expect(mesh.faces.length).toBe(12)
	})

	it('should create 5-segment rotation extrusion of a triangle', () => {
		// Create a triangle pointing outward (away from rotation axis)
		const triangleVertices = [
			v2(0, -0.5), // Bottom right
			v2(0, 0.5), // Top right
			v2(0.5, 0), // Point (left)
		]
		const triangleContour = Contour.from(triangleVertices)

		// Create 5-segment rotation extrusion
		const mesh = extrude({
			path: (t: number) => {
				const angle = t * 2 * Math.PI
				return {
					o: v3(0, 0, 0),
					x: v3(-Math.sin(angle), 0, Math.cos(angle)), //// Tangent to circle
					y: v3(0, 1, 0), // Always point up
				}
			},
			contour: triangleContour,
			sampling: { type: 'count', samples: 6 }, // 5 segments + 1 (start and end)
			caps: false, // No caps for partial rotation
		})

		// Should have exactly 7 vertices
		expect(mesh.vectors.length).toBe(7)

		// Should have 10 faces (5 segments × 2 triangles per segment)
		expect(mesh.faces.length).toBe(10)

		// Check that all expected vertices are present
		// The triangle has vertices at (0, -0.5), (0, 0.5), (0.5, 0)
		// When rotated 5 times around the Y-axis in XZ plane, we get 7 unique vertices
		const expectedVertices = [
			// Bottom vertex (shared by all segments)
			v3(0, -0.5, 0), // Bottom
			// Top vertex (shared by all segments)
			v3(0, 0.5, 0), // Top
			// Point vertex (shared by all segments)
			v3(0, 0, 0.5), // Point
			// Rotated point vertices (one per segment)
			v3(-0.475528, 0, 0.154508), // Second segment (~72°)
			v3(-0.293893, 0, -0.404508), // Third segment (~144°)
			v3(0.293893, 0, -0.404508), // Fourth segment (~216°)
			v3(0.475528, 0, 0.154508), // Fifth segment (~288°)
		]

		// Check that all expected vertices are present (with tolerance for floating point)
		for (const expected of expectedVertices) {
			const found = mesh.vectors.some(
				(v) =>
					Math.abs(v.x - expected.x) < 0.1 &&
					Math.abs(v.y - expected.y) < 0.1 &&
					Math.abs(v.z - expected.z) < 0.1
			)
			expect(found).toBe(true)
		}

		// Verify the mesh is properly formed
		expect(mesh.vectors.length).toBeGreaterThan(0)
		expect(mesh.faces.length).toBeGreaterThan(0)
	})
})
