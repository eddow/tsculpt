export type ComputedReturnMode = 'self' | 'registry' | 'value'
export interface ComputedDecoratorOptions {
	returns?: ComputedReturnMode
}
export declare function markComputedMethod(
	target: object,
	propertyKey: PropertyKey,
	options?: ComputedDecoratorOptions
): void
export declare function computed(options?: ComputedDecoratorOptions): MethodDecorator
export declare function getComputedMethodOptions(
	target: object
): ReadonlyMap<PropertyKey, ComputedDecoratorOptions>
