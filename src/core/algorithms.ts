import di from '@tsculpt/ts/di'
import './facades'
import { createDerivedComputation } from './computed/base'
import { computedRegistry } from './computed/registry'
import type { Computable, Computed } from './computed/types'
import { MaybePromise } from './ts/async'
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
export function unionBase(source1: AContour, ...source: AContour[]): MaybePromise<AContour>
export function unionBase(source1: AMesh, ...source: AMesh[]): MaybePromise<AMesh>
export function unionBase<Target extends AContour | AMesh>(
	source1: Target,
	...source: Target[]
): MaybePromise<Target> {
	return source1 instanceof AContour
		? (union2(source1, ...(source as AContour[])) as MaybePromise<Target>)
		: (union3(source1, ...(source as AMesh[])) as MaybePromise<Target>)
}

export function union(
	source1: Computable<AContour>,
	...source: Computable<AContour>[]
): Computed<AContour>
export function union(source1: Computable<AMesh>, ...source: Computable<AMesh>[]): Computed<AMesh>
export function union<Target extends AContour | AMesh>(
	source1: Computable<Target>,
	...source: Computable<Target>[]
): Computed<Target> {
	return computedRegistry.wrap(
		createDerivedComputation([source1, ...source], (resolvedArgs) => {
			const [first, ...rest] = resolvedArgs
			return unionBase(first as Target, ...(rest as Target[]))
		})
	) as Computed<Target>
}

export function intersectBase(source1: AContour, ...source: AContour[]): MaybePromise<AContour>
export function intersectBase(source1: AMesh, ...source: AMesh[]): MaybePromise<AMesh>
export function intersectBase<Target extends AContour | AMesh>(
	source1: Target,
	...source: Target[]
): MaybePromise<Target> {
	return source1 instanceof AContour
		? (intersect2(source1, ...(source as AContour[])) as MaybePromise<Target>)
		: (intersect3(source1, ...(source as AMesh[])) as MaybePromise<Target>)
}

export function intersect(
	source1: Computable<AContour>,
	...source: Computable<AContour>[]
): Computed<AContour>
export function intersect(
	source1: Computable<AMesh>,
	...source: Computable<AMesh>[]
): Computed<AMesh>
export function intersect<Target extends AContour | AMesh>(
	source1: Computable<Target>,
	...source: Computable<Target>[]
): Computed<Target> {
	return computedRegistry.wrap(
		createDerivedComputation([source1, ...source], (resolvedArgs) => {
			const [first, ...rest] = resolvedArgs
			return intersectBase(first as Target, ...(rest as Target[]))
		})
	) as Computed<Target>
}

export function subtractBase(source1: AContour, source2: AContour): MaybePromise<AContour>
export function subtractBase(source1: AMesh, source2: AMesh): MaybePromise<AMesh>
export function subtractBase<Target extends AContour | AMesh>(
	source1: Target,
	source2: Target
): MaybePromise<Target> {
	return source1 instanceof AContour
		? (subtract2(source1, source2 as AContour) as MaybePromise<Target>)
		: (subtract3(source1, source2 as AMesh) as MaybePromise<Target>)
}

export function subtract(
	source1: Computable<AContour>,
	source2: Computable<AContour>
): Computed<AContour>
export function subtract(source1: Computable<AMesh>, source2: Computable<AMesh>): Computed<AMesh>
export function subtract<Target extends AContour | AMesh>(
	source1: Computable<Target>,
	source2: Computable<Target>
): Computed<Target> {
	return computedRegistry.wrap(
		createDerivedComputation([source1, source2], (resolvedArgs) => {
			const [first, second] = resolvedArgs
			return subtractBase(first as Target, second as Target)
		})
	) as Computed<Target>
}

export function hullBase(source1: AContour, ...source: AContour[]): MaybePromise<AContour>
export function hullBase(source1: AMesh, ...source: AMesh[]): MaybePromise<AMesh>
export function hullBase<Target extends AContour | AMesh>(
	source1: Target,
	...source: Target[]
): MaybePromise<Target> {
	return source1 instanceof AContour
		? (hull2(source1, ...(source as AContour[])) as MaybePromise<Target>)
		: (hull3(source1, ...(source as AMesh[])) as MaybePromise<Target>)
}

export function hull(
	source1: Computable<AContour>,
	...source: Computable<AContour>[]
): Computed<AContour>
export function hull(source1: Computable<AMesh>, ...source: Computable<AMesh>[]): Computed<AMesh>
export function hull<Target extends AContour | AMesh>(
	source1: Computable<Target>,
	...source: Computable<Target>[]
): Computed<Target> {
	return computedRegistry.wrap(
		createDerivedComputation([source1, ...source], (resolvedArgs) => {
			const [first, ...rest] = resolvedArgs
			return hullBase(first as Target, ...(rest as Target[]))
		})
	) as Computed<Target>
}
