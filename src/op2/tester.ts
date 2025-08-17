import Op2, { ecmaOp2 } from '@tsculpt/op2'
import { Contour, Polygon, Shape, Vector2 } from '@tsculpt/types'
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

	// Delegate boolean operations to ecmaOp2
	async vectorIntersect(vA: [Vector2, Vector2], vB: [Vector2, Vector2]): Promise<boolean> {
		return ecmaOp2.vectorIntersect(vA, vB)
	}

	async inPolygon(point: Vector2, polygon: Polygon): Promise<boolean> {
		return ecmaOp2.inPolygon(point, polygon)
	}

	async polygonIntersect(p1: Polygon, p2: Polygon): Promise<boolean> {
		return ecmaOp2.polygonIntersect(p1, p2)
	}

	async distinctPolygons(polygons: Polygon[]): Promise<boolean> {
		return ecmaOp2.distinctPolygons(polygons)
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
