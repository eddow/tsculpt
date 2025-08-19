import { describe, it, expect } from 'vitest'
import { v2 } from '../builders'
import { BrowseablePolygon } from './loft'
import { eq } from '@tsculpt/math'

function wrap2pi(a: number): number {
	const twoPi = Math.PI * 2
	return ((a % twoPi) + twoPi) % twoPi
}

function wrapPi(a: number): number {
	const x = wrap2pi(a)
	return x > Math.PI ? x - 2 * Math.PI : x
}

function angleEq(a: number, b: number, eps = 1e-6): boolean {
	return Math.abs(wrapPi(a - b)) <= eps
}

const matchArcPoints = (bp: BrowseablePolygon) => (arc: number, expectedNormal: number, expectedPoint: number[]) => {
	const { point, normal } = bp.arcPoint(arc)
	expect(angleEq(normal, expectedNormal)).toBe(true)
	expect(eq(point, expectedPoint)).toBe(true)
}

describe('BrowseablePolygon - arcPoint', () => {
	describe('equilateral triangle (unit circle)', () => {
		const bp = new BrowseablePolygon([
			v2(1, 0),
			v2(Math.cos((2 * Math.PI) / 3), Math.sin((2 * Math.PI) / 3)),
			v2(Math.cos((4 * Math.PI) / 3), Math.sin((4 * Math.PI) / 3)),
		])
		it.each([
			[0, 0, [1, 0]],
			[1/6, Math.PI/3, [0.25, Math.sqrt(3)/4]],
			[1/3, 2*Math.PI/3, [-0.5, Math.sqrt(3)/2]],
			[1/2, Math.PI, [-0.5, 0]],
			[2/3, 4*Math.PI/3, [-0.5, -Math.sqrt(3)/2]],
			[5/6, -Math.PI/3, [0.25, -Math.sqrt(3)/4]],
		])('arc %s', matchArcPoints(bp))
	})

	describe('regular pentagon (unit circle)', () => {
		const bp = new BrowseablePolygon([
			v2(1, 0),
			v2(Math.cos((2 * Math.PI) / 5), Math.sin((2 * Math.PI) / 5)),
			v2(Math.cos((4 * Math.PI) / 5), Math.sin((4 * Math.PI) / 5)),
			v2(Math.cos((6 * Math.PI) / 5), Math.sin((6 * Math.PI) / 5)),
			v2(Math.cos((8 * Math.PI) / 5), Math.sin((8 * Math.PI) / 5)),
		])
		// On-summit arcs
		it.each([
			[0, 0, [1, 0]],
			[1 / 5, (2 * Math.PI) / 5, [Math.cos((2 * Math.PI) / 5), Math.sin((2 * Math.PI) / 5)]],
			[2 / 5, (4 * Math.PI) / 5, [Math.cos((4 * Math.PI) / 5), Math.sin((4 * Math.PI) / 5)]],
			[3 / 5, (6 * Math.PI) / 5, [Math.cos((6 * Math.PI) / 5), Math.sin((6 * Math.PI) / 5)]],
			[4 / 5, (8 * Math.PI) / 5, [Math.cos((8 * Math.PI) / 5), Math.sin((8 * Math.PI) / 5)]],
		])('summit arc %s', matchArcPoints(bp))
		// Mid-edge arcs
		it.each([
			[
				1 / 10,
				Math.PI / 5,
				[(1 + Math.cos((2 * Math.PI) / 5)) / 2, (0 + Math.sin((2 * Math.PI) / 5)) / 2],
			],
			[
				3 / 10,
				(3 * Math.PI) / 5,
				[
					(Math.cos((2 * Math.PI) / 5) + Math.cos((4 * Math.PI) / 5)) / 2,
					(Math.sin((2 * Math.PI) / 5) + Math.sin((4 * Math.PI) / 5)) / 2,
				],
			],
			[
				5 / 10,
				Math.PI,
				[
					(Math.cos((4 * Math.PI) / 5) + Math.cos((6 * Math.PI) / 5)) / 2,
					(Math.sin((4 * Math.PI) / 5) + Math.sin((6 * Math.PI) / 5)) / 2,
				],
			],
			[
				7 / 10,
				(7 * Math.PI) / 5,
				[
					(Math.cos((6 * Math.PI) / 5) + Math.cos((8 * Math.PI) / 5)) / 2,
					(Math.sin((6 * Math.PI) / 5) + Math.sin((8 * Math.PI) / 5)) / 2,
				],
			],
			[
				9 / 10,
				(9 * Math.PI) / 5,
				[
					(Math.cos((8 * Math.PI) / 5) + 1) / 2,
					(Math.sin((8 * Math.PI) / 5) + 0) / 2,
				],
			],
		])('mid-edge arc %s', matchArcPoints(bp))
	})
/* TODO: find a better example
	describe('irregular axis-aligned hexagon (readable lengths)', () => {
		// CCW polygon with edge lengths: 4,1,2,2,6,3 → perimeter 18
		// Summits:
		// 0: (3,1)
		// 2/9: (-1,1)
		// 5/18: (-1,0)
		// 7/18: (-3,0)
		// 1/2: (-3,-2)
		// 5/6: (3,-2)
		const bp = new BrowseablePolygon([
			v2(3, 1),
			v2(-1, 1),
			v2(-1, 0),
			v2(-3, 0),
			v2(-3, -2),
			v2(3, -2),
		])
		// On-summit arcs with outward CCW summit normals
		it.each([
			[0, Math.PI / 4, [3, 1]],
			[2 / 9, (3 * Math.PI) / 4, [-1, 1]],
			[5 / 18, (3 * Math.PI) / 4, [-1, 0]],
			[7 / 18, (3 * Math.PI) / 4, [-3, 0]],
			[1 / 2, (-3 * Math.PI) / 4, [-3, -2]],
			[5 / 6, -Math.PI / 4, [3, -2]],
		])('summit arc %s', matchArcPoints(bp))
		// Mid-edge arcs with outward edge normals
		it.each([
			[1 / 9, Math.PI / 2, [1, 1]],
			[1 / 4, Math.PI, [-1, 0.5]],
			[1 / 3, Math.PI, [-2, 0]],
			[4 / 9, -Math.PI / 2, [-3, -1]],
			[2 / 3, 0, [0, -2]],
			[11 / 12, 0, [3, -0.5]],
		])('mid-edge arc %s', matchArcPoints(bp))
	})*/
})
