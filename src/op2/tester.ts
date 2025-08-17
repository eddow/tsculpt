import Op2 from '@tsculpt/op2'
import { Contour, Polygon, Shape } from '@tsculpt/types'
import { v2 } from '@tsculpt/types/builders'

// Fake contour for testing purposes
export class FakeContour extends Contour {
	constructor(public readonly id: string) {
		super(new Shape(new Polygon(v2(0, 0), v2(1, 0), v2(0, 1))))
	}
}

class TesterEngine extends Op2 {
	private operationCount = 0

	async union(_contour1: Contour, _contour2: Contour): Promise<Contour> {
		this.operationCount++
		// Return a fake contour with operation info
		return new FakeContour(`union_${this.operationCount}_contour1_contour2`)
	}

	async intersect(_contour1: Contour, _contour2: Contour): Promise<Contour> {
		this.operationCount++
		// Return a fake contour with operation info
		return new FakeContour(`intersect_${this.operationCount}_contour1_contour2`)
	}

	async subtract(_contour1: Contour, _contour2: Contour): Promise<Contour> {
		this.operationCount++
		// Return a fake contour with operation info
		return new FakeContour(`subtract_${this.operationCount}_contour1_contour2`)
	}

	async hull(contours: Contour[]): Promise<Contour> {
		this.operationCount++
		// Return a fake contour with operation info
		return new FakeContour(`hull_${this.operationCount}_${contours.length}_contours`)
	}

	// Helper method to get operation count for testing
	getOperationCount(): number {
		return this.operationCount
	}

	// Helper method to reset operation count for testing
	resetOperationCount(): void {
		this.operationCount = 0
	}
}

export default new TesterEngine()
