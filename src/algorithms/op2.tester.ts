import { Algorithms } from '@tsculpt/ts/di'
import { Contour, Polygon, Shape } from '@tsculpt/types'
import { v2 } from '@tsculpt/types/builders'

// Fake contour for testing purposes
export class FakeContour extends Contour {
	constructor(public readonly id: string) {
		super(new Shape(new Polygon(v2(0, 0), v2(1, 0), v2(0, 1))))
	}
}

let operationCount = 0

function union2(...contours: Contour[]): Contour {
	operationCount++
	// Return a fake contour with operation info
	return new FakeContour(`union_${operationCount}_${contours.length}_contours`)
}

function intersect2(...contours: Contour[]): Contour {
	operationCount++
	// Return a fake contour with operation info
	return new FakeContour(`intersect_${operationCount}_${contours.length}_contours`)
}

function subtract2(_contour1: Contour, _contour2: Contour): Contour {
	operationCount++
	// Return a fake contour with operation info
	return new FakeContour(`subtract_${operationCount}_contour1_contour2`)
}

function hull2(...contours: Contour[]): Contour {
	operationCount++
	// Return a fake contour with operation info
	return new FakeContour(`hull_${operationCount}_${contours.length}_contours`)
}

// Helper method to get operation count for testing
export function getOperationCount(): number {
	return operationCount
}

// Helper method to reset operation count for testing
export function resetOperationCount(): void {
	operationCount = 0
}

export default {
	union2,
	intersect2,
	subtract2,
	hull2,
} satisfies Partial<Algorithms>
