import { Algorithms } from '@tsculpt/ts/di'
import { ContourBase, Polygon, Shape } from '@tsculpt/types'
import { v2 } from '@tsculpt/types/builders'

// Fake contour for testing purposes
export class FakeContour extends ContourBase {
	constructor(public readonly id: string) {
		super(new Shape(new Polygon(v2(0, 0), v2(1, 0), v2(0, 1))))
	}
}

let operationCount = 0

function union2(...contours: ContourBase[]): ContourBase {
	operationCount++
	// Return a fake contour with operation info
	return new FakeContour(`union_${operationCount}_${contours.length}_contours`)
}

function intersect2(...contours: ContourBase[]): ContourBase {
	operationCount++
	// Return a fake contour with operation info
	return new FakeContour(`intersect_${operationCount}_${contours.length}_contours`)
}

function subtract2(_contour1: ContourBase, _contour2: ContourBase): ContourBase {
	operationCount++
	// Return a fake contour with operation info
	return new FakeContour(`subtract_${operationCount}_contour1_contour2`)
}

function hull2(...contours: ContourBase[]): ContourBase {
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

function offset2(_contour: ContourBase, _delta: number): ContourBase {
	operationCount++
	return new FakeContour(`offset_${operationCount}`)
}

export default {
	union2,
	intersect2,
	subtract2,
	hull2,
	offset2,
} satisfies Partial<Algorithms>
