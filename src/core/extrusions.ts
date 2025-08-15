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
		return new Vector3(0, 0, z)
	}

	// Create the contour function with twist and scale
	const contourFn = (t: number): Contour => {
		if (twist === 0 && scale === 1) {
			return contour
		}

		// Apply twist and scale transformations
		const currentTwist = t * twist
		const currentScale = typeof scale === 'number' ? scale : new Vector2(scale.x, scale.y)

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
		orientation: new Vector3(0, 0, 1), // Fixed up vector for linear extrusion
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
	const arcLength = Math.abs(angle) * 1.0 // Assuming radius of 1 for grain calculation
	const calculatedSegments = segments || Math.max(8, Math.ceil(arcLength / grain))

	// For rotation extrusion, we need to create a circular path and use Frenet orientation
	const path: PathFn = (t: number) => {
		const currentAngle = t * angle
		// Create a circular path with radius based on the contour's X coordinate
		const radius = Math.max(...contour.vectors.map((v) => Math.abs(v.x)))
		const x = radius * Math.cos(currentAngle)
		const z = radius * Math.sin(currentAngle)
		return new Vector3(x, 0, z)
	}

	// Use the generic extrusion engine with Frenet orientation
	const mesh = extrude({
		path,
		contour,
		sampling: { type: 'count', samples: calculatedSegments },
		caps: Math.abs(angle - 2 * Math.PI) > 0.001, // Cap for partial rotations
	})

	return mesh
}
