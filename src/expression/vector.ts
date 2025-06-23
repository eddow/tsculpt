import { VectorD } from '@tsculpt/types'
import { cachedParser } from './expression'

export class SemanticError extends Error {}

type LinearParameter = { type: 'parameter'; index: number }
type LinearSum = { type: 'sum'; terms: LinearExpression[] }
type LinearProd = { type: 'prod'; factor: number; factors: LinearExpression[] }
type LinearExpression = LinearParameter | LinearSum | LinearProd

function neg(a: LinearExpression): LinearExpression {
	switch (a.type) {
		case 'prod':
			return { type: 'prod', factor: -a.factor, factors: a.factors }
		case 'sum':
			return { type: 'sum', terms: a.terms.map(neg) }
		default:
			return { type: 'prod', factor: -1, factors: [a] }
	}
}
function sum(...operands: LinearExpression[]): LinearExpression {
	const resultingOperands: LinearExpression[] = []
	for (const operand of operands) {
		if (operand.type === 'sum') resultingOperands.push(...operand.terms)
		else resultingOperands.push(operand)
	}
	return resultingOperands.length === 1
		? resultingOperands[0]
		: { type: 'sum', terms: resultingOperands }
}
function calculate(
	expr: LinearExpression,
	values: (number | readonly number[])[]
): number | readonly number[] {
	switch (expr.type) {
		case 'parameter':
			return values[expr.index]
		case 'sum': {
			let result = [] as number[]
			for (const term of expr.terms) {
				const calc = calculate(term, values)
				if (!Array.isArray(calc)) throw new SemanticError(`Cannot sum non-vector values: ${calc}`)
				while (result.length < calc.length) result.push(0)
				result = result.map((r, i) => r + (calc[i] ?? 0))
			}
			return result
		}
		case 'prod': {
			let numeric = expr.factor
			let vector: readonly number[] | undefined
			for (const factor of expr.factors) {
				const calc = calculate(factor, values)
				if (typeof calc === 'number') numeric *= calc
				else if (vector) throw new SemanticError(`Cannot vectors: ${calc}`)
				else vector = calc
			}
			if (!vector) throw new SemanticError(`No vector in expression: ${expr}`)
			return vector.map((v) => v * numeric)
		}
	}
}
export const vector = cachedParser<number | readonly number[], LinearExpression, readonly number[]>(
	{
		operators: [{ '+': 'nary', '-': 'binary' }, { '*': 'nary' }],
		emptyOperator: '*',
		prefix: {
			'-': (a) => neg(a),
		},
		operations: {
			'+': (...operands) => sum(...operands),
			'-': (a, b) => sum(a, neg(b)),
			'*'(...operands) {
				let factor = 1
				const factors: LinearExpression[] = []
				for (const operand of operands) {
					if (operand.type === 'prod') {
						factor *= operand.factor
						factors.push(...operand.factors)
					} else factors.push(operand)
				}
				if (factors.length === 1 && factor === 1) return factors[0]
				return { type: 'prod', factor, factors }
			},
		},
		atomics: [
			{
				rex: /(?:\d+(:?\.\d+)?)|(?:\.\d+)/,
				build: (match) => ({ type: 'prod', factor: Number(match[0]), factors: [] }),
			},
			{ rex: /\$(\d+)/, build: (match) => ({ type: 'parameter', index: Number(match[1]) }) },
		],
	},
	(expr, values) => {
		const result = calculate(expr, values)
		if (!Array.isArray(result)) throw new Error(`Invalid vector expression: ${expr}`)
		return result
	}
) as <Vector extends VectorD>(
	expr: TemplateStringsArray,
	...values: readonly (number | Vector)[]
) => Vector
