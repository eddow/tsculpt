import { MaybePromise, Resolved } from './maybe'

type DIService = Record<string, (...args: any[]) => MaybePromise<any>>
type Service = MaybePromise<DIService> | (() => MaybePromise<DIService>)

const dependencies: Record<string, Service> = {}
const forwarders: Record<string, any> = {}

export class DIError extends Error {
	constructor(message: string) {
		super(message)
		this.name = 'DIError'
	}
}

export function register(newDependencies: Record<string, any>) {
	Object.assign(dependencies, newDependencies)
}
function assertService(service: Service, serviceName: string) {
	if (typeof service !== 'object' || service instanceof Promise)
		throw new DIError(`Service ${String(serviceName)} is not yet loaded`)
	return service
}
function forwarderFunction(serviceName: string, functionName: string) {
	return (...args: any[]) => {
		let service = dependencies[serviceName]
		if (!service) throw new DIError(`Service ${String(serviceName)} not yet registered`)
		if (typeof service === 'function') service = dependencies[serviceName] = service()
		if (typeof service !== 'object')
			throw new DIError(`Service ${String(serviceName)} is not a service`)
		function forward() {
			service = assertService(service, serviceName)
			const functionToCall = service[functionName]
			if (!functionToCall)
				throw new DIError(
					`Function ${String(functionName)} not found in service ${String(serviceName)}`
				)
			return functionToCall.apply(service, args)
		}
		return service instanceof Promise
			? service.then((resolvedService) => {
					dependencies[serviceName] = service = resolvedService
					return forward()
				})
			: forward()
	}
}

function forwarderService(name: string) {
	return new Proxy(
		{},
		{
			get(_target, prop) {
				if (typeof prop !== 'string') return undefined
				const service = dependencies[name]
				if (service && typeof service === 'object' && !(service instanceof Promise)) {
					if (prop in service) return service[prop]
					throw new DIError(`Function ${String(prop)} not found in service ${String(name)}`)
				}
				return forwarderFunction(name, String(prop))
			},
		}
	)
}
type ServiceMethods<T> = {
	[K in keyof T as T[K] extends (...args: any[]) => MaybePromise<any> ? K : never]: T[K] extends (
		...args: infer A
	) => infer R
		? (...args: A) => MaybePromise<Resolved<R>>
		: never
}
export default function di<T extends Record<string, any>>() {
	return new Proxy(dependencies, {
		get(_target, prop) {
			if (prop in dependencies) return dependencies[String(prop)]
			if (!forwarders[String(prop)]) {
				forwarders[String(prop)] = forwarderService(String(prop))
			}
			return forwarders[String(prop)]
		},
	}) as { [K in keyof T]: ServiceMethods<T[K]> }
}
