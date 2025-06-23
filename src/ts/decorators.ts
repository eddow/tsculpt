export function cached(...needed: PropertyKey[]) {
	return (_target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
		const original = descriptor.get
		if (!original) {
			throw new Error('@cached can only be used on getters')
		}

		descriptor.get = function (this: any) {
			const missing = needed.filter((p) => !isCached(this, p))
			if (missing.length)
				throw new Error(
					`Missing properties to calculate ${String(propertyKey)}: ${missing.join(', ')}`
				)
			const rv = original.call(this)
			cache(this, propertyKey, rv)
			return rv
		}

		return descriptor
	}
}

export function isCached(object: Object, propertyKey: PropertyKey) {
	return !!Object.getOwnPropertyDescriptor(object, propertyKey)
}

export function cache(object: Object, propertyKey: PropertyKey, value: any) {
	Object.defineProperty(object, propertyKey, { value })
}
