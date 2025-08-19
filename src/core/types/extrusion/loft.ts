import { epsilon, eq, lerp } from '@tsculpt/math'
import { dicotomic } from '@tsculpt/optimizations'
import { cached } from '@tsculpt/ts/decorators'
import { v2 } from '../builders'
import { Vector2 } from '../bunches'

export class BrowseablePolygon {
	polygon: Vector2[]
	radius: number
	center: Vector2

	constructor(polygon: Vector2[]) {
		this.center = polygon
			.reduce((acc, curr) => v2`${acc} + ${curr}`, Vector2[0])
			.scale(1 / polygon.length)
		polygon = polygon.map((v) => v.sub(this.center))
		let furthest = 0
		let radius = polygon[0].size
		for (let i = 1; i < polygon.length; i++) {
			const s = polygon[i].size
			if (s > radius) {
				furthest = i
				radius = s
			}
		}
		if (furthest > 0) polygon = [...polygon.slice(furthest), ...polygon.slice(0, furthest)]
		this.radius = radius
		this.polygon = polygon
	}
	@cached /**
	 * The normals of the summits, in radians
	 */
	get normals() {
		const normals: number[] = []
		const n = this.polygon.length

		for (let i = 0; i < n; i++) {
			const prev = this.polygon[(i - 1 + n) % n]
			const curr = this.polygon[i]
			const next = this.polygon[(i + 1) % n]

			// Edge vectors
			const edgePrev = v2`${curr} - ${prev}`
			const edgeNext = v2`${next} - ${curr}`

			// Normalize edges
			const normPrev = edgePrev.normalized
			const normNext = edgeNext.normalized

			// Angle bisector (normal direction)
			const normalAngle = v2`${normPrev} + ${normNext}`.atan2()

			normals.push(normalAngle - Math.PI / 2)
		}

		return normals
	}
	@cached /**
	 * The arcs of the points, calculated in "part of perimeter browsed until this summit" -> [0, 1[
	 */
	get pointArcs() {
		let prev = this.polygon[this.polygon.length - 1]
		const arcs: number[] = []
		let length = 0
		for (const curr of this.polygon) {
			const size = v2`${curr} - ${prev}`.size
			arcs.push(length)
			length += size
			prev = curr
		}
		return arcs.map((arc) => arc / length)
	}
	arcPoint(arc: number) {
		arc = ((arc % 1) + 1) % 1
		const index = dicotomic(this.pointArcs, arc+2*epsilon)
		const nextIndex = (index + 1) % this.polygon.length
		const prevArc = this.pointArcs[index]
		if (eq(prevArc, arc)) {
			return {
				point: this.polygon[index],
				normal: this.normals[index],
			}
		}
		const prev = this.polygon[index]
		const next = this.polygon[nextIndex]
		const nextArc = nextIndex > index ? this.pointArcs[nextIndex] : 1.0
		const t = (arc - prevArc) / (nextArc - prevArc)
		const point = lerp(prev, next, t)
		return {
			point,
			normal: next.atan2(prev) - Math.PI / 2,
		}
	}
}
