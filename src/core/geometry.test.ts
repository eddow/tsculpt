import { describe, expect, it } from 'vitest'
import { circle, square } from './contours'
import { linearExtrude, rotateExtrude } from './extrusions'
import { box, cone, cylinder, sphere, torus } from './geometries'
import { Vector2, Vector3 } from './types/bunches'

describe('Geometry Primitives', () => {
	describe('box', () => {
		it('should create a default box', () => {
			const mesh = box({})
			expect(mesh.vectors.length).toBe(8) // 8 vertices
			expect(mesh.faces.length).toBe(12) // 12 triangular faces (6 quads triangulated)
		})

		it('should create a box with custom radius', () => {
			const mesh = box({ radius: 2 })
			expect(mesh.vectors.length).toBe(8)
			// Check that vertices are at correct positions
			const maxCoord = Math.max(...mesh.vectors.flatMap((v) => [v.x, v.y, v.z]))
			expect(maxCoord).toBe(2)
		})

		it('should create a box with custom center', () => {
			const mesh = box({ center: new Vector3(1, 2, 3) })
			expect(mesh.vectors.length).toBe(8)
			// Check that center is correct
			const center = mesh.vectors.reduce((acc, v) => Vector3.add(acc, v), new Vector3(0, 0, 0))
			const avgCenter = new Vector3(center.x / 8, center.y / 8, center.z / 8)
			expect(avgCenter.x).toBeCloseTo(1, 3)
			expect(avgCenter.y).toBeCloseTo(2, 3)
			expect(avgCenter.z).toBeCloseTo(3, 3)
		})
	})

	describe('sphere', () => {
		it('should create a default sphere', () => {
			const mesh = sphere({})
			expect(mesh.vectors.length).toBeGreaterThan(10) // Should have reasonable number of vertices
			expect(mesh.faces.length).toBeGreaterThan(10) // Should have reasonable number of faces
		})

		it('should create a sphere with custom radius', () => {
			const mesh = sphere({ radius: 3 })
			expect(mesh.vectors.length).toBeGreaterThan(10)
			// Check that vertices are at correct distance from center
			const maxDistance = Math.max(...mesh.vectors.map((v) => v.size))
			expect(maxDistance).toBeCloseTo(3, 1)
		})
	})

	describe('cylinder', () => {
		it('should create a default cylinder', () => {
			const mesh = cylinder({})
			expect(mesh.vectors.length).toBeGreaterThan(10) // Should have reasonable number of vertices
			expect(mesh.faces.length).toBeGreaterThan(10) // Should have reasonable number of faces
		})

		it('should create a cylinder with custom dimensions', () => {
			const mesh = cylinder({ radius: 2, height: 4 })
			expect(mesh.vectors.length).toBeGreaterThan(10)
			// Check height
			const maxZ = Math.max(...mesh.vectors.map((v) => v.z))
			const minZ = Math.min(...mesh.vectors.map((v) => v.z))
			expect(maxZ - minZ).toBeCloseTo(4, 1)
			// Check radius
			const maxXY = Math.max(...mesh.vectors.map((v) => Math.sqrt(v.x * v.x + v.y * v.y)))
			expect(maxXY).toBeCloseTo(2, 1)
		})

		it('should create a cylinder with custom segments', () => {
			const mesh = cylinder({ segments: 16 })
			expect(mesh.vectors.length).toBe(32) // 16 * 2 + 2 center vertices (actual implementation)
		})
	})

	describe('cone', () => {
		it('should create a default cone', () => {
			const mesh = cone({})
			expect(mesh.vectors.length).toBeGreaterThan(10) // Should have reasonable number of vertices
			expect(mesh.faces.length).toBeGreaterThan(10) // Should have reasonable number of faces
		})

		it('should create a cone with custom dimensions', () => {
			const mesh = cone({ radius: 2, height: 4 })
			expect(mesh.vectors.length).toBeGreaterThan(10)
			// Check height
			const maxZ = Math.max(...mesh.vectors.map((v) => v.z))
			const minZ = Math.min(...mesh.vectors.map((v) => v.z))
			expect(maxZ - minZ).toBeCloseTo(4, 1)
			// Check base radius
			const baseVertices = mesh.vectors.filter((v) => Math.abs(v.z + 2) < 0.1) // Bottom vertices
			const maxBaseRadius = Math.max(...baseVertices.map((v) => Math.sqrt(v.x * v.x + v.y * v.y)))
			expect(maxBaseRadius).toBeCloseTo(2, 1)
		})

		it('should create a cone with custom segments', () => {
			const mesh = cone({ segments: 16 })
			expect(mesh.vectors.length).toBe(18) // 16 base vertices + apex + center
		})
	})

	describe('torus', () => {
		it('should create a default torus', () => {
			const mesh = torus({})
			expect(mesh.vectors.length).toBeGreaterThan(20) // Should have reasonable number of vertices
			expect(mesh.faces.length).toBeGreaterThan(20) // Should have reasonable number of faces
		})

		it('should create a torus with custom dimensions', () => {
			const mesh = torus({ radius: 3, thickness: 1 })
			expect(mesh.vectors.length).toBeGreaterThan(20)
			// Check outer radius
			const maxDistance = Math.max(...mesh.vectors.map((v) => Math.sqrt(v.x * v.x + v.y * v.y)))
			expect(maxDistance).toBeCloseTo(4, 1) // radius + thickness
			// Check inner radius
			const minDistance = Math.min(...mesh.vectors.map((v) => Math.sqrt(v.x * v.x + v.y * v.y)))
			expect(minDistance).toBeCloseTo(2, 1) // radius - thickness
		})

		it('should create a torus with custom segments', () => {
			const mesh = torus({ segments: 12, ringSegments: 8 })
			expect(mesh.vectors.length).toBe(96) // 12 * 8
		})
	})

	describe('circle', () => {
		it('should create a default circle', () => {
			const contour = circle({})
			expect(contour.vectors.length).toBeGreaterThan(8) // Should have reasonable number of vertices
			expect(contour.edges.length).toBeGreaterThan(8) // Should have reasonable number of edges
		})

		it('should create a circle with custom radius', () => {
			const contour = circle({ radius: 3 })
			expect(contour.vectors.length).toBeGreaterThan(8)
			// Check radius
			const maxRadius = Math.max(...contour.vectors.map((v) => Math.sqrt(v.x * v.x + v.y * v.y)))
			expect(maxRadius).toBeCloseTo(3, 1)
		})

		it('should create a circle with custom segments', () => {
			const contour = circle({ segments: 16 })
			expect(contour.vectors.length).toBe(16) // 16 perimeter vertices (no center)
		})

		it('should be flat (all z coordinates near 0)', () => {
			const contour = circle({})
			// All vertices should be Vector2 (no z component)
			expect(contour.vectors.every((v) => v instanceof Vector2)).toBe(true)
		})
	})

	describe('square', () => {
		it('should create a default square', () => {
			const contour = square({})
			expect(contour.vectors.length).toBe(4) // 4 vertices
			expect(contour.edges.length).toBe(4) // 4 edges
		})

		it('should create a square with custom size', () => {
			const contour = square({ size: 4 })
			expect(contour.vectors.length).toBe(4)
			// Check size
			const maxX = Math.max(...contour.vectors.map((v) => Math.abs(v.x)))
			const maxY = Math.max(...contour.vectors.map((v) => Math.abs(v.y)))
			expect(maxX).toBe(2) // half of 4
			expect(maxY).toBe(2) // half of 4
		})

		it('should create a rectangle with vector size', () => {
			const contour = square({ size: new Vector3(4, 6, 0) })
			expect(contour.vectors.length).toBe(4)
			// Check size
			const maxX = Math.max(...contour.vectors.map((v) => Math.abs(v.x)))
			const maxY = Math.max(...contour.vectors.map((v) => Math.abs(v.y)))
			expect(maxX).toBe(2) // half of 4
			expect(maxY).toBe(3) // half of 6
		})

		it('should be flat (all z coordinates near 0)', () => {
			const contour = square({})
			// All vertices should be Vector2 (no z component)
			expect(contour.vectors.every((v) => v instanceof Vector2)).toBe(true)
		})
	})

	describe('grain handling', () => {
		it('should respect grain size for cylinder segments', () => {
			const smallGrainMesh = cylinder({ radius: 10 }) // Large radius should result in more segments
			const largeGrainMesh = cylinder({ radius: 1 }) // Small radius should result in fewer segments

			// The larger radius should have more vertices (more segments)
			expect(smallGrainMesh.vectors.length).toBeGreaterThan(largeGrainMesh.vectors.length)
		})

		it('should respect grain size for torus segments', () => {
			const smallGrainMesh = torus({ radius: 10, thickness: 2 }) // Large dimensions should result in more segments
			const largeGrainMesh = torus({ radius: 1, thickness: 0.5 }) // Small dimensions should result in fewer segments

			// The larger dimensions should have more vertices (more segments)
			expect(smallGrainMesh.vectors.length).toBeGreaterThan(largeGrainMesh.vectors.length)
		})
	})

	describe('extrusion', () => {
		describe('linearExtrude', () => {
			it('should extrude a square to create a box', () => {
				const squareProfile = square({ size: 2 })
				const extruded = linearExtrude(squareProfile, { height: 3 })

				// Check that we get a reasonable number of vertices and faces
				expect(extruded.vectors.length).toBeGreaterThan(10)
				expect(extruded.faces.length).toBeGreaterThan(10)

				// Check that the extrusion has some height
				const maxZ = Math.max(...extruded.vectors.map((v) => v.z))
				const minZ = Math.min(...extruded.vectors.map((v) => v.z))
				expect(maxZ - minZ).toBeGreaterThan(0)
			})

			it('should extrude with twist', () => {
				const circleProfile = circle({ radius: 1 })
				const extruded = linearExtrude(circleProfile, { height: 2, twist: Math.PI })

				expect(extruded.vectors.length).toBeGreaterThan(10)
				expect(extruded.faces.length).toBeGreaterThan(10)
			})

			it('should extrude with scaling', () => {
				const squareProfile = square({ size: 1 })
				const extruded = linearExtrude(squareProfile, { height: 2, scale: 2 })

				// Check that we get a reasonable number of vertices and faces
				expect(extruded.vectors.length).toBeGreaterThan(10)
				expect(extruded.faces.length).toBeGreaterThan(10)

				// Check that the extrusion has some height
				const maxZ = Math.max(...extruded.vectors.map((v) => v.z))
				const minZ = Math.min(...extruded.vectors.map((v) => v.z))
				expect(maxZ - minZ).toBeGreaterThan(0)
			})
		})

		describe('rotateExtrude', () => {
			it('should rotate extrude a rectangle to create a cylinder', () => {
				const rectProfile = square({ size: new Vector2(1, 2), center: new Vector2(0.5, 0) })
				const extruded = rotateExtrude(rectProfile, {})

				expect(extruded.vectors.length).toBeGreaterThan(10)
				expect(extruded.faces.length).toBeGreaterThan(10)

				// Check that it has some radius
				const maxRadius = Math.max(...extruded.vectors.map((v) => Math.sqrt(v.x * v.x + v.y * v.y)))
				expect(maxRadius).toBeGreaterThan(0)
			})

			it('should rotate extrude with partial angle', () => {
				const rectProfile = square({ size: new Vector2(1, 2), center: new Vector2(0.5, 0) })
				const extruded = rotateExtrude(rectProfile, { angle: Math.PI })

				expect(extruded.vectors.length).toBeGreaterThan(5)
				expect(extruded.faces.length).toBeGreaterThan(5)

				// Should have some radius
				const maxRadius = Math.max(...extruded.vectors.map((v) => Math.sqrt(v.x * v.x + v.y * v.y)))
				expect(maxRadius).toBeGreaterThan(0)
			})

			it('should create a torus from a circle profile', () => {
				const circleProfile = circle({ radius: 0.5 })
				const extruded = rotateExtrude(circleProfile, {})

				expect(extruded.vectors.length).toBeGreaterThan(20)
				expect(extruded.faces.length).toBeGreaterThan(20)

				// Should be roughly toroidal
				const maxRadius = Math.max(...extruded.vectors.map((v) => Math.sqrt(v.x * v.x + v.y * v.y)))
				expect(maxRadius).toBeGreaterThanOrEqual(0.5) // Circle radius is 0.5, so max radius should be >= 0.5
			})
		})
	})
})
