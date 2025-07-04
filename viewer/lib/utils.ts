import { GenerationParameters } from '@tsculpt'

export const waiting = Symbol('waiting')
export type MaybePromise<T> = Promise<T> | T
export type Factory<T> = (params?: GenerationParameters) => T
export type MaybeFactory<T> = T | Factory<T>
