import booleans from '@booleans'
import { Vector, Vector2, Vector3, isUnity, vecProd } from '../types/bunches'
import { AMesh, Mesh } from '../types/mesh'
import { TemplateParser } from './templated'
export class SemanticError extends Error {}

type LinearParameter = { type: 'parameter'; index: number }
type LinearScale = { type: 'scale'; factor: number | number[]; operands: LinearExpression[] }
type LinearTranslate = { type: 'translate'; terms: LinearExpression[] }
type LinearSubtract = { type: 'subtract'; operands: [LinearExpression, LinearExpression] }
type LinearInvert = { type: 'invert'; operand: LinearExpression }
type LinearIntersect = { type: 'intersect'; operands: LinearExpression[] }
type LinearUnion = { type: 'union'; operands: LinearExpression[] }
type LinearLiteral = { type: 'literal'; value: number | Vector3 }
type LinearExpression =
	| LinearParameter
	| LinearScale
	| LinearTranslate
	| LinearSubtract
	| LinearInvert
	| LinearIntersect
	| LinearUnion
	| LinearLiteral

function recur(
	expr: LinearExpression,
	values: (AMesh | LinearPrimitive)[]
): AMesh | LinearPrimitive {
	switch (expr.type) {
		case 'parameter':
			return values[expr.index]
		case 'literal':
			return expr.value
		case 'scale': {
			let factor: number | readonly number[] = expr.factor
			let mesh: AMesh | undefined
			for (const operand of expr.operands) {
				const result = recur(operand, values)
				if (result instanceof AMesh) {
					if (mesh) throw new SemanticError(`Cannot scale multiple meshes: ${mesh} and ${result}`)
					mesh = result
				} else factor = vecProd(factor, result)
			}
			if (isUnity(factor)) return mesh || 1
			const scale = Array.isArray(factor) ? (Vector.from(factor) as Vector3) : (factor as number)
			return mesh ? mesh.scale(scale) : scale
		}
		case 'translate': {
			let vector: Vector = Vector.from([0, 0, 0])
			let mesh: AMesh | undefined
			for (const term of expr.terms) {
				const result = recur(term, values)
				if (result instanceof AMesh) {
					if (mesh)
						throw new SemanticError(`Cannot translate multiple meshes: ${mesh} and ${result}`)
					mesh = result
				} else if (typeof result === 'number')
					throw new SemanticError(`Cannot translate by number: ${result}`)
				else vector = Vector.add(vector, result)
			}
			return mesh ? mesh.translate(vector as Vector3) : (vector as Vector3)
		}
		case 'subtract': {
			const a = recur(expr.operands[0], values)
			const b = recur(expr.operands[1], values)
			if (a instanceof AMesh && b instanceof AMesh) return booleans.subtract(a, b)
			if (typeof a === 'number' && typeof b === 'number') return a - b
			if (Array.isArray(a) && Array.isArray(b)) return Vector.sub(a, b)
			throw new SemanticError(`Bad operand to subtract: ${a} and ${b}`)
		}
		case 'invert': {
			const result = recur(expr.operand, values)
			if (typeof result === 'number') return 1 / result
			if (Array.isArray(result)) return Vector.from(result.map((v) => 1 / v)) as Vector3
			throw new SemanticError(`Cannot invert non-number and non-vector: ${result}`)
		}
		case 'intersect': {
			const meshes: AMesh[] = []
			for (const operand of expr.operands) {
				const result = recur(operand, values)
				if (!(result instanceof AMesh))
					throw new SemanticError(`Bad operand to intersect: ${result}`)
				meshes.push(result)
			}
			return booleans.intersect(...meshes)
		}
		case 'union': {
			const meshes: AMesh[] = []
			for (const operand of expr.operands) {
				const result = recur(operand, values)
				if (!(result instanceof AMesh)) throw new SemanticError(`Bad operand to union: ${result}`)
				meshes.push(result)
			}
			return booleans.union(...meshes)
		}
	}
}

function translate(...operands: LinearExpression[]): LinearExpression {
	const resultingOperands: LinearExpression[] = []
	let vector: Vector = Vector.from([0, 0, 0])
	function add(expr: LinearExpression) {
		if (expr.type === 'translate') for (const term of expr.terms) add(term)
		else if (expr.type === 'literal') {
			if (typeof expr.value === 'number')
				throw new SemanticError(`Cannot translate by number: ${expr.value}`)
			vector = Vector.add(vector, expr.value)
		} else resultingOperands.push(expr)
	}
	for (const operand of operands) add(operand)
	if (!vector.every((v) => v === 0))
		resultingOperands.push({ type: 'literal', value: vector as Vector3 })
	return resultingOperands.length === 1
		? resultingOperands[0]
		: { type: 'translate', terms: resultingOperands }
}

function scale(...operands: LinearExpression[]): LinearExpression {
	const resultingOperands: LinearExpression[] = []
	let factor: number | readonly number[] = 1
	function add(expr: LinearExpression) {
		if (expr.type === 'scale') {
			factor = vecProd(factor, expr.factor)
			for (const term of expr.operands) add(term)
		} else if (expr.type === 'literal') factor = vecProd(factor, expr.value)
		else resultingOperands.push(expr)
	}
	for (const operand of operands) add(operand)
	return resultingOperands.length === 1 && isUnity(factor)
		? resultingOperands[0]
		: { type: 'scale', factor, operands: resultingOperands }
}

export type LinearPrimitive = Vector2 | Vector3 | number

const formulas = new TemplateParser<
	LinearExpression,
	AMesh | LinearPrimitive,
	AMesh | LinearPrimitive
>(
	{
		precedence: [
			{ '|': 'nary', '&': 'nary' },
			{ '+': 'nary', '-': 'binary' },
			{ '*': 'nary', '/': 'binary' },
		],
		emptyOperator: '*',
		operations: {
			'+': translate,
			'*': scale,
			'/': (a: LinearExpression, b: LinearExpression) => scale(a, { type: 'invert', operand: b }),
			'-': (a: LinearExpression, b: LinearExpression) => ({
				type: 'subtract',
				operands: [a, b],
			}),
			'&': (...operands) => ({
				type: 'intersect',
				operands,
			}),
			'|': (...operands) => ({
				type: 'union',
				operands,
			}),
		},
		atomics: [
			{
				rex: /\[([\d \.-]+)\]/s,
				build: (match) => ({
					type: 'literal',
					value: Vector.from(match[1].split(/\s+/).map(Number)) as Vector3,
				}),
			},
			{
				rex: /(?:\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|(?:\.\d+(?:[eE][+-]?\d+)?)/,
				build: (match) => ({ type: 'literal', value: Number(match[0]) }),
			},
		],
		surroundings: [{ open: '(', close: ')' }],
	},
	(index) => ({ type: 'parameter', index }),
	recur
)

function expectMesh(value: unknown): AMesh {
	if (!(value instanceof AMesh)) {
		throw new SemanticError(
			`Expected Mesh, got: ${typeof value === 'object' ? value?.constructor.name : typeof value}`
		)
	}
	return value as AMesh
}
function expectClass<T>(value: unknown, type: abstract new (...args: any[]) => T) {
	if (!(value instanceof type))
		throw new SemanticError(
			`Expected ${type.name}, got: ${
				typeof value === 'object' ? value?.constructor.name : typeof value
			}`
		)
	return value as T
}
export function mesh(expr: TemplateStringsArray, ...values: readonly (Mesh | LinearPrimitive)[]) {
	const result = formulas.calculate(expr, ...values)
	return expectMesh(result)
}

export function vector(expr: TemplateStringsArray, ...values: readonly LinearPrimitive[]) {
	return expectClass(formulas.calculate(expr, ...values), Vector)
}
