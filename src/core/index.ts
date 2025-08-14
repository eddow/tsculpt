export * from './types'
export { generation, type GenerationParameters } from './globals'
export * from './expression/linear'

import boolean from '@booleans'

export const { union, intersect, subtract, hull } = boolean
