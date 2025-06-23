const calculating: { class: new () => any; prop: string }[] = []
export function cached() {
	return (_target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
		const original = descriptor.get
		if (!original) {
			throw new Error('@cached can only be used on getters')
		}

		descriptor.get = function (this: any) {
			const alreadyCalculating = calculating.findIndex(
				(c) => c.class === this && c.prop === propertyKey
			)
			if (alreadyCalculating > -1)
				throw new Error(
					`Circular dependency detected: ${calculating
						.slice(alreadyCalculating)
						.map((c) => `${c.class.name}.${c.prop}`)
						.join(' -> ')} -> again`
				)
			calculating.push({ class: this.constructor, prop: String(propertyKey) })
			try {
				const rv = original.call(this)
				cache(this, propertyKey, rv)
				return rv
			} finally {
				calculating.pop()
			}
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
