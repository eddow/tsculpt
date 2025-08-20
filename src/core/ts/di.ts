import type { AContour, AMesh, APolygon, Vector2 } from '@tsculpt/types'
import { maybeAwait, MaybePromise, Resolved } from './maybe'
export interface AlgorithmsDef {
	union2(contour1: AContour, ...contours: AContour[]): AContour
	intersect2(contour1: AContour, ...contours: AContour[]): AContour
	subtract2(contour1: AContour, contour2: AContour): AContour
	hull2(contour1: AContour, ...contours: AContour[]): AContour
	union3(mesh1: AMesh, ...meshes: AMesh[]): AMesh
	intersect3(mesh1: AMesh, ...meshes: AMesh[]): AMesh
	subtract3(mesh1: AMesh, mesh2: AMesh): AMesh
	hull3(mesh1: AMesh, ...meshes: AMesh[]): AMesh
	vectorIntersect(vA: [Vector2, Vector2], vB: [Vector2, Vector2], edge?: boolean): boolean
	inPolygon(point: Vector2, polygon: APolygon, edge?: boolean): boolean
	polygonIntersect(p1: APolygon, p2: APolygon, edge?: boolean): boolean
	distinctPolygons(polygons: APolygon[], edge?: boolean): boolean
}
export type Algorithms = ServiceMethods<AlgorithmsDef>

type ServiceFunction = (...args: any[]) => MaybePromise<any>
type DIService = Record<string, ServiceFunction>
type Service = MaybePromise<DIService> | (() => MaybePromise<DIService>)

const dependencies: Record<string, ServiceFunction> = {}
const forwarders: Record<string, any> = {}

export class DIError extends Error {
	constructor(message: string) {
		super(message)
		this.name = 'DIError'
	}
}
let registration: Promise<void> | 'none' | 'done' = 'none'
export function register(...services: Service[]) {
	if(registration !== 'none') throw new DIError('Registration already in progress')
	let resolve: (value: void | PromiseLike<void>) => void
	registration = new Promise(r => {
		resolve = r
	})
	services = services.map(service => typeof service === 'function' ? service() : service)
	maybeAwait(services, (services) => {
		for (const [i, service] of services.entries()) {
			if (typeof service !== 'object') throw new DIError(`Service ${i} is not a service`)
			for (const [functionName, functionValue] of Object.entries(service))
				dependencies[functionName] ??= functionValue
		}
		resolve()
		registration = 'done'
	})
}

function forwarderFunction(functionName: string) {
	return (...args: any[]) => {
		const forward = () => {
			if(!dependencies[functionName])
				throw new DIError(`Function ${String(functionName)} not found in service`)
			return dependencies[functionName](...args)
		}
		if(registration === 'none')
			throw new DIError('No registration done/pending')
		return registration === 'done' ? forward() : registration.then(forward)
	}
}
export type ServiceMethods<T> = {
	[K in keyof T as T[K] extends (...args: any[]) => MaybePromise<any> ? K : never]: T[K] extends (
		...args: infer A
	) => infer R
		? (...args: A) => MaybePromise<Resolved<R>>
		: never
}
export default function di() {
	return new Proxy({}, {
		get(_target, prop) {
			if(typeof prop !== 'string') return undefined
			if (prop in dependencies) return dependencies[prop]
			forwarders[prop] ??= forwarderFunction(prop)
			return forwarders[prop]
		},
	}) as Algorithms
}
