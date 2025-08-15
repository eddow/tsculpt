import { generation } from './globals'
import { Vector2, Vector3 } from './types'
import { Contour } from './types/contour'
import { PathFn, extrude } from './types/extrusion'
import { Mesh } from './types/mesh'

// Extrusion functions
type LinearExtrudeSpec = {
	height?: number
	center?: boolean
	twist?: number
	scale?: number | Vector2
}

export function linearExtrude(contour: Contour, spec: LinearExtrudeSpec = {}): Mesh {
	const { height = 1, center = false, twist = 0, scale = 1 } = spec
	const { grain } = generation

	// Create the linear path function
	const path: PathFn = (t: number) => {
		const z = center ? (t - 0.5) * height : t * height
		return {
			o: new Vector3(0, 0, z),
			x: new Vector3(1, 0, 0), // X axis stays constant
			y: new Vector3(0, 1, 0), // Y axis stays constant
		}
	}

	// Create the contour function with twist and scale
	const contourFn = (t: number): Contour => {
		if (twist === 0 && scale === 1) {
			return contour
		}

		// Apply twist and scale transformations
		const currentTwist = t * twist
		// Interpolate scale from 1.0 at bottom to target scale at top
		const currentScale = typeof scale === 'number'
			? 1.0 + (scale - 1.0) * t
			: new Vector2(1.0 + (scale.x - 1.0) * t, 1.0 + (scale.y - 1.0) * t)

		const transformedVertices = contour.vectors.map((vertex) => {
			// Apply rotation around Z axis
			const cos = Math.cos(currentTwist)
			const sin = Math.sin(currentTwist)
			const rotatedX = vertex.x * cos - vertex.y * sin
			const rotatedY = vertex.x * sin + vertex.y * cos

			// Apply scaling
			const scaleX = typeof currentScale === 'number' ? currentScale : currentScale.x
			const scaleY = typeof currentScale === 'number' ? currentScale : currentScale.y
			const scaledX = rotatedX * scaleX
			const scaledY = rotatedY * scaleY

			return new Vector2(scaledX, scaledY)
		})

		return new Contour(transformedVertices, contour.edges)
	}

	// Calculate segments based on height and grain (matching original behavior)
	const heightSegments = Math.max(1, Math.ceil(height / grain))
	const twistSegments = Math.max(1, Math.ceil(Math.abs(twist) / (Math.PI / 8)))
	const segments = Math.max(heightSegments, twistSegments)

	// Use the generic extrusion engine
	return extrude({
		path,
		contour: contourFn,
		sampling: { type: 'count', samples: segments + 1 }, // +1 to include both ends
		caps: true,
	})
}

type RotateExtrudeSpec = {
	angle?: number
	segments?: number
}

export function rotateExtrude(contour: Contour, spec: RotateExtrudeSpec = {}): Mesh {
	const { angle = 2 * Math.PI, segments } = spec
	const { grain } = generation

	// Calculate segments based on angle and grain
	// For rotation, we need enough segments so that the arc length between segments is <= grain
	// Find the maximum radius from the contour vertices
	const maxRadius = Math.max(...contour.vectors.map((v) => Math.abs(v.x)))
	const arcLength = Math.abs(angle) * maxRadius
	const calculatedSegments = segments || Math.max(9, Math.ceil(arcLength / grain))

	// For rotation extrusion, we need to create a circular path and use Frenet orientation
	const path: PathFn = (t: number) => {
		const currentAngle = t * angle
		return {
			o: new Vector3(0, 0, 0),
			x: new Vector3(-Math.sin(currentAngle), 0, Math.cos(currentAngle)), // Tangent to circle
			y: new Vector3(0, 1, 0), // Always point up
		}
	}

	// Use the generic extrusion engine
	const mesh = extrude({
		path,
		contour,
		sampling: { type: 'count', samples: calculatedSegments },
		caps: Math.abs(angle - 2 * Math.PI) > 0.001, // Cap for partial rotations
	})

	return mesh
}
