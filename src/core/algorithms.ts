import di from '@tsculpt/ts/di'
import { PromiseChain } from './ts/async'
import { AContour, AMesh } from './types'

const {
	union2,
	intersect2,
	hull2,
	subtract2,
	union3,
	intersect3,
	hull3,
	subtract3,
	vectorIntersect,
	inPolygon,
	polygonIntersect,
	distinctPolygons,
} = di()

export { vectorIntersect, inPolygon, polygonIntersect, distinctPolygons }

// Overloads for union function
export function union(source1: AContour, ...source: AContour[]): PromiseChain<AContour>
export function union(source1: AMesh, ...source: AMesh[]): PromiseChain<AMesh>
export function union<Target extends AContour | AMesh>(
	source1: Target,
	...source: Target[]
): PromiseChain<Target> {
	return source1 instanceof AContour
		? (union2(source1, ...(source as AContour[])) as PromiseChain<Target>)
		: (union3(source1, ...(source as AMesh[])) as PromiseChain<Target>)
}

export function intersect(source1: AContour, ...source: AContour[]): PromiseChain<AContour>
export function intersect(source1: AMesh, ...source: AMesh[]): PromiseChain<AMesh>
export function intersect<Target extends AContour | AMesh>(
	source1: Target,
	...source: Target[]
): PromiseChain<Target> {
	return source1 instanceof AContour
		? (intersect2(source1, ...(source as AContour[])) as PromiseChain<Target>)
		: (intersect3(source1, ...(source as AMesh[])) as PromiseChain<Target>)
}

export function subtract(source1: AContour, source2: AContour): PromiseChain<AContour>
export function subtract(source1: AMesh, source2: AMesh): PromiseChain<AMesh>
export function subtract<Target extends AContour | AMesh>(
	source1: Target,
	source2: Target
): PromiseChain<Target> {
	return source1 instanceof AContour
		? (subtract2(source1, source2 as AContour) as PromiseChain<Target>)
		: (subtract3(source1, source2 as AMesh) as PromiseChain<Target>)
}

export function hull(source1: AContour, ...source: AContour[]): PromiseChain<AContour>
export function hull(source1: AMesh, ...source: AMesh[]): PromiseChain<AMesh>
export function hull<Target extends AContour | AMesh>(
	source1: Target,
	...source: Target[]
): PromiseChain<Target> {
	return source1 instanceof AContour
		? (hull2(source1, ...(source as AContour[])) as PromiseChain<Target>)
		: (hull3(source1, ...(source as AMesh[])) as PromiseChain<Target>)
}
