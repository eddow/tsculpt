import type { Computable, Computation, Computed, InvalidationListener, MaybeAsync } from './types';
export interface ComputedProxyOptions<T> {
    getMethod?: (property: string) => ((...args: readonly unknown[]) => unknown) | undefined;
}
export declare function isComputation(value: unknown): value is Computation<unknown>;
export declare function isComputed(value: unknown): value is Computed<unknown>;
export declare function resolveComputable<T>(value: Computable<T>): Promise<Awaited<T>>;
export declare function resolveInputs(inputs: readonly unknown[]): Promise<readonly unknown[]>;
export declare function collectComputations(inputs: readonly unknown[]): readonly Computation<unknown>[];
export declare abstract class AbstractComputation<T> implements Computation<T> {
    abstract compute(): Promise<T>;
    abstract invalidate(): void;
    abstract onInvalidate(listener: InvalidationListener): () => void;
}
export declare class RuntimeComputation<T> extends AbstractComputation<T> {
    #private;
    constructor(computer: () => MaybeAsync<T>, dependencies?: readonly Computation<unknown>[]);
    compute(): Promise<T>;
    invalidate(): void;
    onInvalidate(listener: InvalidationListener): () => void;
    get dependencySubscriptions(): readonly (() => void)[];
}
export declare function createComputation<T>(computer: () => MaybeAsync<T>, dependencies?: readonly unknown[]): Computation<T>;
export declare function createDerivedComputation<T>(inputs: readonly unknown[], computer: (resolvedInputs: readonly unknown[]) => MaybeAsync<T>): Computation<T>;
export declare abstract class AbstractComputed<T> extends AbstractComputation<T> {
}
export declare class ComputedValue<T> extends AbstractComputed<T> {
    protected readonly computation: Computation<T>;
    constructor(computation: Computation<T>, options?: ComputedProxyOptions<T>);
    compute(): Promise<T>;
    invalidate(): void;
    onInvalidate(listener: InvalidationListener): () => void;
}
export declare class ComputedObject<T extends object> extends ComputedValue<T> {
}
