import { Expression, OperatorPrecedence, parse } from './expression'

export function cachedParser<Result, Value, Cached>(
	precedence: OperatorPrecedence,
	toCache: (parsed: Expression) => Cached,
	calculus: (cached: Cached, values: Value[]) => Result
): (expr: TemplateStringsArray, ...values: Value[]) => Result {
	const cache = new WeakMap<TemplateStringsArray, Cached>()
	return (expr: TemplateStringsArray, ...values: Value[]) => {
		let cached = cache.get(expr)
		if (!cached) {
			const parts = [...expr]
			const last = parts.pop()
			const $ = parts.map((part, i) => `${part} $${i}`)
			const constructed = [...$, last].join('')
			cached = toCache(parse(constructed, precedence))
			cache.set(expr, cached)
		}
		return calculus(cached, values)
	}
}
