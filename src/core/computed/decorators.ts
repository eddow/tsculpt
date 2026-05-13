export type ComputedReturnMode = 'self' | 'registry' | 'value'

export interface ComputedDecoratorOptions {
	returns?: ComputedReturnMode
}

export interface ComputedMethodMetadata {
	readonly returns: ComputedReturnMode
}

const computedMethodMetadata = new WeakMap<object, Map<PropertyKey, ComputedMethodMetadata>>()

function normalizeComputedOptions(options: ComputedDecoratorOptions): ComputedMethodMetadata {
	return {
		returns: options.returns ?? 'registry',
	}
}

export function markComputedMethod(
	target: object,
	propertyKey: PropertyKey,
	options: ComputedDecoratorOptions = {}
): void {
	const descriptor = Object.getOwnPropertyDescriptor(target, propertyKey)
	if (!descriptor || typeof descriptor.value !== 'function') {
		throw new Error(`Cannot mark ${String(propertyKey)} as computed: expected an instance method`)
	}

	const metadata = normalizeComputedOptions(options)
	const targetMetadata =
		computedMethodMetadata.get(target) ?? new Map<PropertyKey, ComputedMethodMetadata>()
	targetMetadata.set(propertyKey, metadata)
	computedMethodMetadata.set(target, targetMetadata)
}

export function computed(options: ComputedDecoratorOptions = {}): MethodDecorator {
	return (target, propertyKey, descriptor) => {
		if (!descriptor || typeof descriptor.value !== 'function') {
			throw new Error('@computed() can only decorate instance methods')
		}

		markComputedMethod(target, propertyKey, options)
	}
}

export function getComputedMethodMetadata(
	target: object,
	propertyKey: PropertyKey
): ComputedMethodMetadata | undefined {
	for (
		let current: object | null = target;
		current && current !== Object.prototype;
		current = Object.getPrototypeOf(current)
	) {
		const metadata = computedMethodMetadata.get(current)?.get(propertyKey)
		if (metadata) {
			return metadata
		}
	}

	return undefined
}

export function listComputedMethodMetadata(
	target: object
): ReadonlyMap<PropertyKey, ComputedMethodMetadata> {
	const metadata = new Map<PropertyKey, ComputedMethodMetadata>()
	const prototypes: object[] = []

	for (
		let current: object | null = target;
		current && current !== Object.prototype;
		current = Object.getPrototypeOf(current)
	) {
		prototypes.unshift(current)
	}

	for (const prototype of prototypes) {
		for (const [propertyKey, propertyMetadata] of computedMethodMetadata.get(prototype) ?? []) {
			metadata.set(propertyKey, propertyMetadata)
		}
	}

	return metadata
}

export function getComputedMethodOptions(
	target: object
): ReadonlyMap<PropertyKey, ComputedDecoratorOptions> {
	const options = new Map<PropertyKey, ComputedDecoratorOptions>()

	for (const [propertyKey, metadata] of listComputedMethodMetadata(target)) {
		options.set(propertyKey, metadata.returns === 'registry' ? {} : { returns: metadata.returns })
	}

	return options
}
