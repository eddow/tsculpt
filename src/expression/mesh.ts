import booleans, { isMesh, type AMesh } from '@booleans'
import { Vector, Vector3 } from '../types/bunches'
import { Mesh } from '../types/mesh'
import { TemplateParser } from './templated'
import { vecProd } from './vectors'

export class MeshSemanticError extends Error {}

type MeshParameter = { type: 'parameter'; index: number }
type MeshScale = { type: 'scale'; factor: number | number[]; operands: MeshExpression[] }
type MeshTranslate = { type: 'translate'; terms: MeshExpression[] }
type MeshSubtract = { type: 'subtract'; operands: [MeshExpression, MeshExpression] }
type MeshIntersect = { type: 'intersect'; operands: MeshExpression[] }
type MeshUnion = { type: 'union'; operands: MeshExpression[] }
type MeshLiteral = { type: 'literal'; value: number | Vector3 }
type MeshExpression =
	| MeshParameter
	| MeshScale
	| MeshTranslate
	| MeshSubtract
	| MeshIntersect
	| MeshUnion
	| MeshLiteral

function isUnity(factor: number | readonly number[]): boolean {
	return Array.isArray(factor) ? factor.every((v) => v === 1) : factor === 1
}

function recur(
	expr: MeshExpression,
	values: (AMesh | Vector3 | number)[]
): AMesh | Vector3 | number {
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
				if (isMesh(result)) {
					if (mesh)
						throw new MeshSemanticError(`Cannot scale multiple meshes: ${mesh} and ${result}`)
					mesh = result
				} else factor = vecProd(factor, result)
			}
			if (isUnity(factor)) return mesh || 1
			const scale = Array.isArray(factor) ? (Vector.from(factor) as Vector3) : (factor as number)
			if (!mesh) return scale

			return booleans.result(mesh).scale(scale)
		}
		case 'translate': {
			let vector: Vector = Vector.from([0, 0, 0])
			let mesh: AMesh | undefined
			for (const term of expr.terms) {
				const result = recur(term, values)
				if (isMesh(result)) {
					if (mesh)
						throw new MeshSemanticError(`Cannot translate multiple meshes: ${mesh} and ${result}`)
					mesh = result
				} else if (typeof result === 'number')
					throw new MeshSemanticError(`Cannot translate by number: ${result}`)
				else vector = vector.add(result)
			}
			if (!mesh) return vector as Vector3
			return booleans.result(mesh).translate(vector as Vector3)
		}
		case 'subtract': {
			const a = recur(expr.operands[0], values)
			const b = recur(expr.operands[1], values)
			if (!isMesh(a)) throw new MeshSemanticError(`Bad operand to subtract from: ${a}`)
			if (!isMesh(b)) throw new MeshSemanticError(`Bad operand to subtract: ${b}`)
			return booleans.subtract(a, b)
		}
		case 'intersect': {
			const meshes: AMesh[] = []
			for (const operand of expr.operands) {
				const result = recur(operand, values)
				if (!isMesh(result)) throw new MeshSemanticError(`Bad operand to intersect: ${result}`)
				meshes.push(result)
			}
			return booleans.intersect(...meshes)
		}
		case 'union': {
			const meshes: AMesh[] = []
			for (const operand of expr.operands) {
				const result = recur(operand, values)
				if (!isMesh(result)) throw new MeshSemanticError(`Bad operand to union: ${result}`)
				meshes.push(result)
			}
			return booleans.union(...meshes)
		}
	}
}

function translate(...operands: MeshExpression[]): MeshExpression {
	const resultingOperands: MeshExpression[] = []
	let vector: Vector = Vector.from([0, 0, 0])
	function add(expr: MeshExpression) {
		if (expr.type === 'translate') for (const term of expr.terms) add(term)
		else if (expr.type === 'literal') {
			if (typeof expr.value === 'number')
				throw new MeshSemanticError(`Cannot translate by number: ${expr.value}`)
			vector = vector.add(expr.value)
		} else resultingOperands.push(expr)
	}
	for (const operand of operands) add(operand)
	if (!vector.every((v) => v === 0))
		resultingOperands.push({ type: 'literal', value: vector as Vector3 })
	return resultingOperands.length === 1
		? resultingOperands[0]
		: { type: 'translate', terms: resultingOperands }
}

function scale(...operands: MeshExpression[]): MeshExpression {
	const resultingOperands: MeshExpression[] = []
	let factor: number | readonly number[] = 1
	function add(expr: MeshExpression) {
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

const meshFormulas = new TemplateParser<
	MeshExpression,
	AMesh | Vector3 | number,
	AMesh | Vector3 | number
>(
	{
		precedence: [
			{ '|': 'nary' },
			{ '&': 'nary' },
			{ '-': 'binary' },
			{ '+': 'nary' },
			{ '*': 'nary' },
		],
		operations: {
			'+': (...operands) => translate(...operands),
			'*': (...operands) => scale(...operands),
			'-': (a: MeshExpression, b: MeshExpression) => ({
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
				rex: /(?:\d+(:?\.\d+)?)|(?:\.\d+)/, // TODO: add support for scientific notation
				build: (match) => ({ type: 'literal', value: Number(match[0]) }),
			},
		],
		surroundings: [{ open: '(', close: ')' }],
	},
	(index) => ({ type: 'parameter', index }),
	recur
)

function expectMesh(value: unknown): Mesh {
	if (!isMesh(value)) {
		throw new MeshSemanticError(
			`Expected Mesh, got: ${typeof value === 'object' ? value?.constructor.name : typeof value}`
		)
	}
	return booleans.result(value as AMesh)
}

export function mesh(expr: TemplateStringsArray, ...values: (Mesh | Vector3 | number)[]) {
	const result = meshFormulas.calculate(expr, ...values)
	return expectMesh(result)
}
