import { MaybePromise } from '@tsculpt/ts/maybe'
import { ParseSpecs, Parser } from './expression'

export const paramMarker = '\u200B'
export class TemplateParser<Built, Value, Result> extends Parser<Built> {
	constructor(
		specs: ParseSpecs<Built>,
		parameter: (index: number) => Built,
		private readonly calculus: (cached: Built, values: Value[]) => Result | Promise<Result>
	) {
		const paramDSpecs: ParseSpecs<Built> = {
			...specs,
			atomics: [
				...specs.atomics,
				{
					rex: new RegExp(`\\${paramMarker}(.)`, 'y'),
					build: (match) => parameter(match[1].codePointAt(0)!),
				},
			],
		}
		super(paramDSpecs)
	}
	private cachedTSA = new WeakMap<TemplateStringsArray, Built>()

	public calculate(expr: TemplateStringsArray, ...values: Value[]): MaybePromise<Result> {
		let cached = this.cachedTSA.get(expr)
		if (!cached) {
			const parts = [...expr]
			const last = parts.pop()
			const $ = parts.map((part, i) => `${part}${paramMarker}${String.fromCodePoint(i)}`)
			const constructed = [...$, last].join('')
			cached = this.parse(constructed)
			this.cachedTSA.set(expr, cached)
		}
		return this.calculus(cached, values)
	}
}
