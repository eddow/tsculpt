export type MaybeAsync<T> = T | Promise<T>;
export type InvalidationListener = () => void;
export interface Invalidatable {
    invalidate(): void;
    onInvalidate(listener: InvalidationListener): () => void;
}
export interface Computation<T> extends Invalidatable {
    compute(): Promise<T>;
}
export type Computable<T> = T | Promise<T> | Computation<T>;
export type UnknownFunction = (...args: readonly never[]) => unknown;
export type Constructor<Instance extends object = object, Args extends readonly unknown[] = readonly unknown[]> = new (...args: Args) => Instance;
export type AbstractConstructor<Instance extends object = object, Args extends readonly unknown[] = readonly unknown[]> = abstract new (...args: Args) => Instance;
export type ComputedArgs<Args extends readonly unknown[]> = {
    [K in keyof Args]: Computable<Args[K]>;
};
export type ComputedMethod<F> = F extends (...args: infer Args) => infer Result ? (...args: ComputedArgs<Args>) => Computed<Awaited<Result>> : never;
export type ComputedFunction<F> = F extends (...args: infer Args) => infer Result ? (...args: ComputedArgs<Args>) => Computed<Awaited<Result>> : never;
export type ComputedMembers<T> = {
    [K in keyof T as T[K] extends UnknownFunction ? K : never]: ComputedMethod<Extract<T[K], UnknownFunction>>;
};
export type Computed<T> = Computation<T> & (T extends object ? ComputedMembers<T> : {});
export type ComputedInstance<Base extends AbstractConstructor> = Computed<InstanceType<Base>>;
export interface ComputedClass<Base extends Constructor = Constructor> {
    new (...args: ComputedArgs<ConstructorParameters<Base>>): ComputedInstance<Base>;
    readonly Base: Base;
}
export declare const computedClassFactorySymbol: unique symbol;
export interface InternalComputedClass<Base extends Constructor = Constructor> extends ComputedClass<Base> {
    [computedClassFactorySymbol](computation: Computation<InstanceType<Base>>): ComputedInstance<Base>;
}
