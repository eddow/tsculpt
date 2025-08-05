import { NumberBunch, Vector } from '../types/bunches'
import { TemplateParser } from './templated'

export class SemanticError extends Error {}

type LinearParameter = { type: 'parameter'; index: number }
type LinearSum = { type: 'sum'; terms: LinearExpression[] }
type LinearProd = { type: 'prod'; factor: number; factors: LinearExpression[] }
type LinearInline = { type: 'vec'; coords: number[] }
type LinearExpression = LinearParameter | LinearSum | LinearProd | LinearInline

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
function recur(
	expr: LinearExpression,
	values: (number | readonly number[])[]
): number | readonly number[] {
	switch (expr.type) {
		case 'parameter':
			return values[expr.index]
		case 'sum': {
			let result = [] as number[]
			for (const term of expr.terms) {
				const calc = recur(term, values)
				if (!(calc instanceof Vector))
					throw new SemanticError(`Cannot sum non-vector values: ${calc}`)
				while (result.length < calc.length) result.push(0)
				result = result.map((r, i) => r + (calc[i] ?? 0))
			}
			return Vector.from(result)
		}
		case 'prod': {
			let numeric = expr.factor
			let vector: readonly number[] | undefined
			for (const factor of expr.factors) {
				const calc = recur(factor, values)
				if (typeof calc === 'number') numeric *= calc
				else if (vector) throw new SemanticError(`Cannot multiply vectors: ${calc}`)
				else vector = calc
			}
			if (!vector) throw new SemanticError(`No vector in expression: ${expr}`)
			return Vector.from(vector.map((v) => v * numeric))
		}
		case 'vec':
			return Vector.from(expr.coords)
	}
}

const formulas = new TemplateParser<
	LinearExpression,
	number | readonly number[],
	number | readonly number[]
>(
	{
		precedence: [{ '+': 'nary', '-': 'binary' }, { '*': 'nary' }],
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
			{
				rex: /\[([\d \.-]+)\]/s,
				build: (match) => ({ type: 'vec', coords: match[1].split(/\s+/).map(Number) }),
			},
		],
		surroundings: [{ open: '(', close: ')' }],
	},
	(index) => ({ type: 'parameter', index }),
	recur
)

function expectClass<T>(value: unknown, type: abstract new (...args: any[]) => T) {
	if (!(value instanceof type))
		throw new SemanticError(
			`Expected ${type.name}, got: ${
				typeof value === 'object' ? value?.constructor.name : typeof value
			}`
		)
	return value as T
}
export function vector(expr: TemplateStringsArray, ...values: readonly NumberBunch[]) {
	return expectClass(formulas.calculate(expr, ...values), Vector)
}
