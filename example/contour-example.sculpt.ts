import { circle, contour, linearExtrude, square, union, v2, v3 } from '@tsculpt'

// 1. SIMPLE SHAPES - Basic geometric primitives
export const simpleSquare = linearExtrude(square({ size: 2 }))

export const simpleCircle = linearExtrude(circle({ radius: 1.5 }))

// 2. SCALED SHAPES - Demonstrating scale transformations
export const scaledSquare = linearExtrude(contour`${square({ size: 1 })} * 2`)

export const scaledCircle = linearExtrude(contour`${circle({ radius: 1 })} * 1.5`)

export const nonUniformScale = linearExtrude(contour`${square({ size: 1 })} * (2, 1)`)

// 3. TRANSLATED SHAPES - Demonstrating translation
export const translatedSquare = linearExtrude(contour`${square({ size: 1 })} + (0.5, 0.5)`)

export const translatedCircle = linearExtrude(contour`${circle({ radius: 1 })} + (-0.5, 0.5)`)

// 4. ROTATED SHAPES - Demonstrating rotation
export const rotatedSquare = linearExtrude(contour`${square({ size: 1 })} @ π/4`) // 45 degrees

export const rotatedCircle = linearExtrude(contour`${circle({ radius: 1 })} @ π/2`) // 90 degrees

// 5. BOOLEAN OPERATIONS - Union, intersection, subtraction
export const unionExample = linearExtrude(contour`${square({ size: 1 })} | ${circle({ radius: 0.7 })}`)

export const intersectionExample = linearExtrude(contour`${square({ size: 1 })} & ${circle({ radius: 0.7 })}`)

export const subtractionExample = linearExtrude(contour`${square({ size: 1 })} - ${circle({ radius: 0.5 })}`)

// 6. MULTIPLE BOOLEAN OPERATIONS - Complex combinations
export const complexUnion = linearExtrude(
	contour`${square({ size: 1 })} | ${circle({ radius: 0.7 })} | ${circle({ radius: 0.5, center: v2(0.5, 0.5) })}`
)

export const complexIntersection = linearExtrude(
	contour`${square({ size: 1.5 })} & ${circle({ radius: 1 })} & ${circle({ radius: 0.8, center: v2(0.3, 0.3) })}`
)

// 7. TRANSFORMED BOOLEAN OPERATIONS - Combining transformations with booleans
export const transformedUnion = linearExtrude(
	contour`${square({ size: 1 })} + (0.3, 0.3) | ${circle({ radius: 0.6 })} + (-0.3, -0.3)`
)

export const scaledBoolean = linearExtrude(
	contour`(${square({ size: 1 })} * 1.5) & (${circle({ radius: 1 })} * 0.8)`
)

export const rotatedBoolean = linearExtrude(
	contour`(${square({ size: 1 })} @ π/4) | (${circle({ radius: 0.7 })} @ π/2)`
)

// 8. ADVANCED PATTERNS - Creating more complex patterns
export const crossPattern = (() => {
	const vertical = square({ size: v2(0.2, 2) })
	const horizontal = square({ size: v2(2, 0.2) })
	return linearExtrude(contour`${vertical} | ${horizontal}`)
})()

// 9. HOLE PATTERNS - Shapes with holes
export const donut = linearExtrude(contour`${circle({ radius: 1 })} - ${circle({ radius: 0.5 })}`)

export const thickDonut = linearExtrude(contour`${circle({ radius: 1.5 })} - ${circle({ radius: 0.3 })}`)

// 10. COMPLEX HOLE PATTERNS - Multiple holes
export const swissCheese = (() => {
	const mainSquare = square({ size: 2 })
	const hole1 = circle({ radius: 0.2, center: v2(-0.5, -0.5) })
	const hole2 = circle({ radius: 0.2, center: v2(0.5, -0.5) })
	const hole3 = circle({ radius: 0.2, center: v2(0, 0.5) })
	return linearExtrude(contour`${mainSquare} - ${hole1} - ${hole2} - ${hole3}`)
})()

// 11. EDGE CASES - Testing boundary conditions
export const tinyShape = linearExtrude(square({ size: 0.1 }))

export const largeShape = linearExtrude(square({ size: 5 }))

// 12. COMPLEX TRANSFORMATIONS - Multiple transformations combined
export const complexTransform = linearExtrude(contour`${square({ size: 1 })} * 2 + (0.5, 0.5) @ pi/4`)

// 13. BOOLEAN WITH TRANSFORMATIONS - Complex boolean operations with transformations
export const advancedBoolean = linearExtrude(
	contour`
		(${square({ size: 1 })} * 1.5 + (0.3, 0.3) @ π/4) |
		(${circle({ radius: 0.8 })} + (-0.3, -0.3) @ π/2) |
		(${circle({ radius: 0.6, center: v2(0, -0.5) })} * 0.8)
	`
)

// 14. ULTIMATE COMPLEX EXAMPLE - Everything combined
export const ultimateExample = linearExtrude(
	contour`
		((${square({ size: 1.2 })} * 1.2 + (0.4, 0.4) @ Pi/6) &
		 (${circle({ radius: 1 })} + (-0.2, 0.2) @ π/3)) |
		((${circle({ radius: 0.8, center: v2(0, -0.6) })} @ π/4 * 0.9) -
		 (${circle({ radius: 0.3, center: v2(0.3, -0.3) })}))
	`
)

// 15. HOLED SQUARE - The original example
export const holedSquare = linearExtrude(contour`${square({ size: 2 })} - ${circle({ radius: 1 })}`)

// Default export: union of all objects positioned in a grid
export default union(
	simpleSquare.translate(v3(-8, 8, 0)),
	simpleCircle.translate(v3(-6, 8, 0)),
	scaledSquare.translate(v3(-4, 8, 0)),
	scaledCircle.translate(v3(-2, 8, 0)),
	nonUniformScale.translate(v3(0, 8, 0)),
	translatedSquare.translate(v3(2, 8, 0)),
	translatedCircle.translate(v3(4, 8, 0)),
	rotatedSquare.translate(v3(6, 8, 0)),
	rotatedCircle.translate(v3(8, 8, 0)),

	unionExample.translate(v3(-8, 6, 0)),
	intersectionExample.translate(v3(-6, 6, 0)),
	subtractionExample.translate(v3(-4, 6, 0)),
	complexUnion.translate(v3(-2, 6, 0)),
	complexIntersection.translate(v3(0, 6, 0)),
	transformedUnion.translate(v3(2, 6, 0)),
	scaledBoolean.translate(v3(4, 6, 0)),
	rotatedBoolean.translate(v3(6, 6, 0)),
	crossPattern.translate(v3(8, 6, 0)),

	donut.translate(v3(-8, 4, 0)),
	thickDonut.translate(v3(-6, 4, 0)),
	swissCheese.translate(v3(-4, 4, 0)),
	tinyShape.translate(v3(-2, 4, 0)),
	largeShape.translate(v3(0, 4, 0)),
	complexTransform.translate(v3(2, 4, 0)),
	advancedBoolean.translate(v3(4, 4, 0)),
	ultimateExample.translate(v3(6, 4, 0)),
	holedSquare.translate(v3(8, 4, 0)),

	// Second row for more examples
	simpleSquare.translate(v3(-8, 2, 0)),
	simpleCircle.translate(v3(-6, 2, 0)),
	scaledSquare.translate(v3(-4, 2, 0)),
	scaledCircle.translate(v3(-2, 2, 0)),
	nonUniformScale.translate(v3(0, 2, 0)),
	translatedSquare.translate(v3(2, 2, 0)),
	translatedCircle.translate(v3(4, 2, 0)),
	rotatedSquare.translate(v3(6, 2, 0)),
	rotatedCircle.translate(v3(8, 2, 0)),

	unionExample.translate(v3(-8, 0, 0)),
	intersectionExample.translate(v3(-6, 0, 0)),
	subtractionExample.translate(v3(-4, 0, 0)),
	complexUnion.translate(v3(-2, 0, 0)),
	complexIntersection.translate(v3(0, 0, 0)),
	transformedUnion.translate(v3(2, 0, 0)),
	scaledBoolean.translate(v3(4, 0, 0)),
	rotatedBoolean.translate(v3(6, 0, 0)),
	crossPattern.translate(v3(8, 0, 0)),

	donut.translate(v3(-8, -2, 0)),
	thickDonut.translate(v3(-6, -2, 0)),
	swissCheese.translate(v3(-4, -2, 0)),
	tinyShape.translate(v3(-2, -2, 0)),
	largeShape.translate(v3(0, -2, 0)),
	complexTransform.translate(v3(2, -2, 0)),
	advancedBoolean.translate(v3(4, -2, 0)),
	ultimateExample.translate(v3(6, -2, 0)),
	holedSquare.translate(v3(8, -2, 0))
)
