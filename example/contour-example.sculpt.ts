import { circle, contour, linearExtrude, square, union, v2, v3 } from '@tsculpt'

// 1. SIMPLE SHAPES - Basic geometric primitives
export async function simpleSquare() {
	return linearExtrude(square({ size: 2 }))
}

export async function simpleCircle() {
	return linearExtrude(circle({ radius: 1.5 }))
}

// 2. SCALED SHAPES - Demonstrating scale transformations
export async function scaledSquare() {
	return linearExtrude(await contour`${square({ size: 1 })} * 2`)
}

export async function scaledCircle() {
	return linearExtrude(await contour`${circle({ radius: 1 })} * 1.5`)
}

export async function nonUniformScale() {
	return linearExtrude(await contour`${square({ size: 1 })} * (2, 1)`)
}

// 3. TRANSLATED SHAPES - Demonstrating translation
export async function translatedSquare() {
	return linearExtrude(await contour`${square({ size: 1 })} + (0.5, 0.5)`)
}

export async function translatedCircle() {
	return linearExtrude(await contour`${circle({ radius: 1 })} + (-0.5, 0.5)`)
}

// 4. ROTATED SHAPES - Demonstrating rotation
export async function rotatedSquare() {
	return linearExtrude(await contour`${square({ size: 1 })} @ π/4`) // 45 degrees
}

export async function rotatedCircle() {
	return linearExtrude(await contour`${circle({ radius: 1 })} @ π/2`) // 90 degrees
}

// 5. BOOLEAN OPERATIONS - Union, intersection, subtraction
export async function unionExample() {
	return linearExtrude(await contour`${square({ size: 1 })} | ${circle({ radius: 0.7 })}`)
}

export async function intersectionExample() {
	return linearExtrude(await contour`${square({ size: 1 })} & ${circle({ radius: 0.7 })}`)
}

export async function subtractionExample() {
	return linearExtrude(await contour`${square({ size: 1 })} - ${circle({ radius: 0.5 })}`)
}

// 6. MULTIPLE BOOLEAN OPERATIONS - Complex combinations
export async function complexUnion() {
	return linearExtrude(
		await contour`${square({ size: 1 })} | ${circle({ radius: 0.7 })} | ${circle({ radius: 0.5, center: v2(0.5, 0.5) })}`
	)
}

export async function complexIntersection() {
	return linearExtrude(
		await contour`${square({ size: 1.5 })} & ${circle({ radius: 1 })} & ${circle({ radius: 0.8, center: v2(0.3, 0.3) })}`
	)
}

// 7. TRANSFORMED BOOLEAN OPERATIONS - Combining transformations with booleans
export async function transformedUnion() {
	return linearExtrude(
		await contour`${square({ size: 1 })} + (0.3, 0.3) | ${circle({ radius: 0.6 })} + (-0.3, -0.3)`
	)
}

export async function scaledBoolean() {
	return linearExtrude(
		await contour`(${square({ size: 1 })} * 1.5) & (${circle({ radius: 1 })} * 0.8)`
	)
}

export async function rotatedBoolean() {
	return linearExtrude(
		await contour`(${square({ size: 1 })} @ π/4) | (${circle({ radius: 0.7 })} @ π/2)`
	)
}

// 8. ADVANCED PATTERNS - Creating more complex patterns
export async function crossPattern() {
	const vertical = square({ size: v2(0.2, 2) })
	const horizontal = square({ size: v2(2, 0.2) })
	return linearExtrude(await contour`${vertical} | ${horizontal}`)
}

// 9. HOLE PATTERNS - Shapes with holes
export async function donut() {
	return linearExtrude(await contour`${circle({ radius: 1 })} - ${circle({ radius: 0.5 })}`)
}

export async function thickDonut() {
	return linearExtrude(await contour`${circle({ radius: 1.5 })} - ${circle({ radius: 0.3 })}`)
}

// 10. COMPLEX HOLE PATTERNS - Multiple holes
export async function swissCheese() {
	const mainSquare = square({ size: 2 })
	const hole1 = circle({ radius: 0.2, center: v2(-0.5, -0.5) })
	const hole2 = circle({ radius: 0.2, center: v2(0.5, -0.5) })
	const hole3 = circle({ radius: 0.2, center: v2(0, 0.5) })
	return linearExtrude(await contour`${mainSquare} - ${hole1} - ${hole2} - ${hole3}`)
}

// 11. EDGE CASES - Testing boundary conditions
export async function tinyShape() {
	return linearExtrude(square({ size: 0.1 }))
}

export async function largeShape() {
	return linearExtrude(square({ size: 5 }))
}

// 12. COMPLEX TRANSFORMATIONS - Multiple transformations combined
export async function complexTransform() {
	return linearExtrude(await contour`${square({ size: 1 })} * 2 + (0.5, 0.5) @ pi/4`)
}

// 13. BOOLEAN WITH TRANSFORMATIONS - Complex boolean operations with transformations
export async function advancedBoolean() {
	return linearExtrude(
		await contour`
		(${square({ size: 1 })} * 1.5 + (0.3, 0.3) @ π/4) |
		(${circle({ radius: 0.8 })} + (-0.3, -0.3) @ π/2) |
		(${circle({ radius: 0.6, center: v2(0, -0.5) })} * 0.8)
	`
	)
}

// 14. ULTIMATE COMPLEX EXAMPLE - Everything combined
export async function ultimateExample() {
	return linearExtrude(
		await contour`
		((${square({ size: 1.2 })} * 1.2 + (0.4, 0.4) @ Pi/6) &
		 (${circle({ radius: 1 })} + (-0.2, 0.2) @ π/3)) |
		((${circle({ radius: 0.8, center: v2(0, -0.6) })} @ π/4 * 0.9) -
		 (${circle({ radius: 0.3, center: v2(0.3, -0.3) })}))
	`
	)
}

// 15. HOLED SQUARE - The original example
export async function holedSquare() {
	return linearExtrude(await contour`${square({ size: 2 })} - ${circle({ radius: 1 })}`)
}

// Default export: union of all objects positioned in a grid
export default async function scene() {
	return union(
		(await simpleSquare()).translate(v3(-8, 8, 0)),
		(await simpleCircle()).translate(v3(-6, 8, 0)),
		(await scaledSquare()).translate(v3(-4, 8, 0)),
		(await scaledCircle()).translate(v3(-2, 8, 0)),
		(await nonUniformScale()).translate(v3(0, 8, 0)),
		(await translatedSquare()).translate(v3(2, 8, 0)),
		(await translatedCircle()).translate(v3(4, 8, 0)),
		(await rotatedSquare()).translate(v3(6, 8, 0)),
		(await rotatedCircle()).translate(v3(8, 8, 0)),

		(await unionExample()).translate(v3(-8, 6, 0)),
		(await intersectionExample()).translate(v3(-6, 6, 0)),
		(await subtractionExample()).translate(v3(-4, 6, 0)),
		(await complexUnion()).translate(v3(-2, 6, 0)),
		(await complexIntersection()).translate(v3(0, 6, 0)),
		(await transformedUnion()).translate(v3(2, 6, 0)),
		(await scaledBoolean()).translate(v3(4, 6, 0)),
		(await rotatedBoolean()).translate(v3(6, 6, 0)),
		(await crossPattern()).translate(v3(8, 6, 0)),

		(await donut()).translate(v3(-8, 4, 0)),
		(await thickDonut()).translate(v3(-6, 4, 0)),
		(await swissCheese()).translate(v3(-4, 4, 0)),
		(await tinyShape()).translate(v3(-2, 4, 0)),
		(await largeShape()).translate(v3(0, 4, 0)),
		(await complexTransform()).translate(v3(2, 4, 0)),
		(await advancedBoolean()).translate(v3(4, 4, 0)),
		(await ultimateExample()).translate(v3(6, 4, 0)),
		(await holedSquare()).translate(v3(8, 4, 0)),

		// Second row for more examples
		(await simpleSquare()).translate(v3(-8, 2, 0)),
		(await simpleCircle()).translate(v3(-6, 2, 0)),
		(await scaledSquare()).translate(v3(-4, 2, 0)),
		(await scaledCircle()).translate(v3(-2, 2, 0)),
		(await nonUniformScale()).translate(v3(0, 2, 0)),
		(await translatedSquare()).translate(v3(2, 2, 0)),
		(await translatedCircle()).translate(v3(4, 2, 0)),
		(await rotatedSquare()).translate(v3(6, 2, 0)),
		(await rotatedCircle()).translate(v3(8, 2, 0)),

		(await unionExample()).translate(v3(-8, 0, 0)),
		(await intersectionExample()).translate(v3(-6, 0, 0)),
		(await subtractionExample()).translate(v3(-4, 0, 0)),
		(await complexUnion()).translate(v3(-2, 0, 0)),
		(await complexIntersection()).translate(v3(0, 0, 0)),
		(await transformedUnion()).translate(v3(2, 0, 0)),
		(await scaledBoolean()).translate(v3(4, 0, 0)),
		(await rotatedBoolean()).translate(v3(6, 0, 0)),
		(await crossPattern()).translate(v3(8, 0, 0)),

		(await donut()).translate(v3(-8, -2, 0)),
		(await thickDonut()).translate(v3(-6, -2, 0)),
		(await swissCheese()).translate(v3(-4, -2, 0)),
		(await tinyShape()).translate(v3(-2, -2, 0)),
		(await largeShape()).translate(v3(0, -2, 0)),
		(await complexTransform()).translate(v3(2, -2, 0)),
		(await advancedBoolean()).translate(v3(4, -2, 0)),
		(await ultimateExample()).translate(v3(6, -2, 0)),
		(await holedSquare()).translate(v3(8, -2, 0))
	)
}
