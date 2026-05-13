import { describe, expect, it } from 'vitest'
import { isComputed } from './computed/base'
import { contour as contourExpr } from './expression/linear'
import { linearExtrude, union } from './index'
import { circle, square } from './public'
import { v2, v3 } from './types/builders'
import { AContour } from './types/contour'
import { AMesh, MeshBase } from './types/mesh'

describe('public computed geometry surface', () => {
	it('returns computed contours from public shape constructors', async () => {
		const contour = square({ size: 2 })

		expect(isComputed(contour)).toBe(true)
		expect(await contour.translate(v2(1, 0)).compute()).toBeInstanceOf(AContour)
	})

	it('returns computed meshes from public extrusion and algorithm helpers', async () => {
		const left = linearExtrude(square({ size: 1 }), { height: 1 })
		const right = linearExtrude(circle({ radius: 0.75 }), { height: 1 })
		const combined = union(left, right)

		expect(isComputed(left)).toBe(true)
		expect(isComputed(combined)).toBe(true)
		expect(await left.compute()).toBeInstanceOf(MeshBase)
		expect(await combined.translate(v3(1, 0, 0)).compute()).toBeInstanceOf(AMesh)
	})

	it('accepts computed geometry in contour expressions', async () => {
		const resolved = await contourExpr`${square({ size: 1 })} | ${circle({ radius: 0.5 })}`

		expect(resolved).toBeInstanceOf(AContour)
	})
})
