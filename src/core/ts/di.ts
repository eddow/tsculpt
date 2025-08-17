const dependencies: Record<string, any> = {}
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

function forwarderFunction(serviceName: string, functionName: string) {
	return (...args: any[]) => {
		const service = dependencies[serviceName]
		if (!service) throw new DIError(`Service ${String(serviceName)} not yet loaded`)
		const functionToCall = service[functionName]
		if (!functionToCall)
			throw new DIError(
				`Function ${String(functionName)} not found in service ${String(serviceName)}`
			)
		return functionToCall.apply(service, args)
	}
}

function forwarderService(name: string) {
	return new Proxy(
		{},
		{
			get(_target, prop) {
				const service = dependencies[name]
				if (service) {
					if (prop in service) return service[prop]
					throw new DIError(`Function ${String(prop)} not found in service ${String(name)}`)
				}
				return forwarderFunction(name, String(prop))
			},
		}
	)
}

export default function get<T extends Record<string, any>>() {
	return new Proxy(dependencies, {
		get(_target, prop) {
			if (prop in dependencies) return dependencies[String(prop)]
			if (!forwarders[String(prop)]) {
				forwarders[String(prop)] = forwarderService(String(prop))
			}
			return forwarders[String(prop)]
		},
	}) as T
}
