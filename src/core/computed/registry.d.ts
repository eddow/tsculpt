import type { Computation, Computed, ComputedClass, Constructor } from './types';
export interface ComputedRegistry {
    register<Base extends Constructor>(baseClass: Base, computedClass: ComputedClass<Base>): void;
    get<Base extends Constructor>(baseClass: Base): ComputedClass<Base> | undefined;
    find(value: object): ComputedClass | undefined;
    wrap<T>(value: T | Promise<T> | Computation<Awaited<T>>): Computed<Awaited<T>>;
}
export declare function wrapComputedValue<T>(value: T | Promise<T> | Computation<Awaited<T>>): Computed<Awaited<T>>;
export declare const computedRegistry: ComputedRegistry;
