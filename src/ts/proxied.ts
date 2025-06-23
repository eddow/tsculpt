export interface ProxyHandled {
	getProperty?(prop: string | symbol | number): any
	setProperty?(prop: string | symbol, value: any): boolean
	hasProperty?(prop: string | symbol | number): boolean
	getPropertyKeys?(originals: (string | symbol)[]): (string | symbol)[]
	deleteProperty?(prop: string | symbol | number): boolean
	defineProperty?(prop: string | symbol | number, descriptor: PropertyDescriptor): boolean
	call?(thisArg: any, ...argumentsList: any[]): any
	construct?(argumentsList: any[]): any
	isExtensible?(): boolean
	getOwnPropertyDescriptor?(prop: string | symbol | number): PropertyDescriptor | undefined
	preventExtensions?(): boolean
	getPrototypeOf?(): object | null
	setPrototypeOf?(proto: object | null): boolean
}
function withNumber(prop: string | symbol): string | symbol | number {
	const nProp = Number(prop)
	return `${nProp}` === prop ? nProp : prop
}
export class Proxied implements ProxyHandled {
	constructor() {
		return new Proxy(this, {
			get(target: ProxyHandled, prop) {
				// @ts-expect-error
				if (prop in target) return target[prop]
				return target.getProperty?.(withNumber(prop))
			},
			set(target: ProxyHandled, prop, value) {
				// @ts-expect-error
				if (!target.setProperty?.(withNumber(prop), value)) target[prop] = value
				return true
			},
			has(target: ProxyHandled, prop) {
				if (prop in target) return true
				return target.hasProperty?.(withNumber(prop)) ?? false
			},
			ownKeys(target: ProxyHandled) {
				return target.getPropertyKeys?.(Object.keys(target)) ?? Object.keys(target)
			},
			apply(target: ProxyHandled, thisArg, argumentsList) {
				return target.call!(thisArg, ...argumentsList)
			},
			construct(target: ProxyHandled, argumentsList) {
				return target.construct!(argumentsList)
			},
			deleteProperty(target: ProxyHandled, prop) {
				// @ts-expect-error
				if (prop in target) return delete target[prop]
				return target.deleteProperty?.(withNumber(prop)) ?? false
			},
			defineProperty(target: ProxyHandled, prop, descriptor) {
				if (!target.defineProperty?.(withNumber(prop), descriptor))
					Object.defineProperty(target, prop, descriptor)
				return true
			},
			getOwnPropertyDescriptor(target: ProxyHandled, prop) {
				if (prop in target) return Object.getOwnPropertyDescriptor(target, prop)
				return target.getOwnPropertyDescriptor?.(withNumber(prop))
			},
			isExtensible(target: ProxyHandled) {
				return target.isExtensible?.() ?? true
			},
			preventExtensions(target: ProxyHandled) {
				return target.preventExtensions?.() ?? false
			},
			getPrototypeOf(target: ProxyHandled) {
				return target.getPrototypeOf?.() ?? Object.getPrototypeOf(target)
			},
			setPrototypeOf(target: ProxyHandled, proto: any) {
				return target.setPrototypeOf?.(proto) ?? Object.setPrototypeOf(target, proto)
			},
		})
	}
}
