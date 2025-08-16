import { Vector2, Vector3, circle, linearExtrude, rotateExtrude, square, union } from '@tsculpt'

// Create a simple square profile
const squareProfile = square({ size: 1 })

// Linear extrusion - create a box
export const extrudedBox = linearExtrude(squareProfile, {
	height: 2,
	center: true,
})

// Linear extrusion with twist - create a twisted prism
export const twistedPrism = linearExtrude(squareProfile, {
	height: 3,
	twist: Math.PI / 2, // 90 degree twist
	center: true,
})

// Linear extrusion with scaling - create a pyramid
export const pyramid = linearExtrude(squareProfile, {
	height: 2,
	scale: 0.5, // Scale down to 50% at the top
	center: true,
})

// Linear extrusion with vector scaling - create a rectangular pyramid
export const rectPyramid = linearExtrude(squareProfile, {
	height: 2,
	scale: new Vector2(0.3, 0.8), // Different X and Y scaling
	center: true,
})

// Rotational extrusion - create a cylinder from a rectangle
const rectProfile = square({ size: new Vector2(0.5, 2), center: new Vector2(0.25, 0) })
export const cylinder = rotateExtrude(rectProfile)

// Rotational extrusion - create a torus from a circle
const circleProfile = circle({ radius: 0.5 })
export const torus = rotateExtrude(circleProfile, {})

// Rotational extrusion with partial angle - create a half cylinder
export const halfCylinder = rotateExtrude(rectProfile, {
	angle: Math.PI, // 180 degrees
})

// Complex example: twisted and scaled extrusion
export const complexExtrusion = linearExtrude(squareProfile, {
	height: 2,
	twist: Math.PI, // 180 degree twist
	scale: 0.2, // Scale down significantly
	center: true,
})

// Default export: union of all objects positioned in a grid
export default function scene() {
	return union(
		extrudedBox,
		twistedPrism.translate(new Vector3(4, 0, 0)),
		pyramid.translate(new Vector3(-4, 0, 0)),
		rectPyramid.translate(new Vector3(0, 4, 0)),
		cylinder.translate(new Vector3(0, -4, 0)),
		torus.translate(new Vector3(8, 0, 0)),
		halfCylinder.translate(new Vector3(-8, 0, 0)),
		complexExtrusion.translate(new Vector3(0, -8, 0))
	)
}
