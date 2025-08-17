import type Op3 from '@tsculpt/op3'
import di from '@tsculpt/ts/di'
import { Vector, Vector2, Vector3, isUnity, product } from '../types/bunches'
import { AMesh, Mesh } from '../types/mesh'
import { TemplateParser, paramMarker } from './templated'
import { maybeAwait, MaybePromise } from '@tsculpt/ts/maybe'

const { op3 } = di<{ op3: Op3 }>()

export class SemanticError extends Error {}

type LinearParameter = { type: 'parameter'; index: number }
type LinearScale = { type: 'scale'; factor: number | number[]; operands: LinearExpression[] }
type LinearTranslate = { type: 'translate'; terms: LinearExpression[] }
type LinearSubtract = { type: 'subtract'; operands: [LinearExpression, LinearExpression] }
type LinearInvert = { type: 'invert'; operand: LinearExpression }
type LinearRotate = {
	type: 'rotate'
	mesh: LinearExpression
	axis: LinearExpression
	angle?: LinearExpression
}
type LinearIntersect = { type: 'intersect'; operands: LinearExpression[] }
type LinearUnion = { type: 'union'; operands: LinearExpression[] }
type LinearLiteral = { type: 'literal'; value: number | Vector3 }
type LinearVectorWithParams = {
	type: 'vectorWithParams'
	components: (number | LinearExpression)[]
}
type LinearExpression =
	| LinearParameter
	| LinearScale
	| LinearTranslate
	| LinearSubtract
	| LinearInvert
	| LinearRotate
	| LinearIntersect
	| LinearUnion
	| LinearLiteral
	| LinearVectorWithParams

function recur(
	expr: LinearExpression,
	values: (AMesh | LinearPrimitive)[]
): MaybePromise<AMesh | LinearPrimitive> {
	switch (expr.type) {
		case 'parameter':
			return values[expr.index]
		case 'literal':
			return expr.value
		case 'scale': {
			let factor: number | readonly number[] = expr.factor
			let mesh: AMesh | undefined
			return maybeAwait(expr.operands.map(operand=> recur(operand, values)), (results)=> {
				for (const result of results) {
					if (result instanceof AMesh) {
						if (mesh) throw new SemanticError(`Cannot scale multiple meshes: ${mesh} and ${result}`)
						mesh = result
					} else factor = product(factor, result)
				}
				if (isUnity(factor)) return mesh || 1
				const scale = Array.isArray(factor) ? (Vector.from(factor) as Vector3) : (factor as number)
				return mesh ? mesh.scale(scale) : scale
			})
		}
		case 'translate': {
			let vector: Vector = Vector.from([0, 0, 0])
			let mesh: AMesh | undefined
			return maybeAwait(expr.terms.map(term=> recur(term, values)), (results)=> {
				for (const result of results) {
				if (result instanceof AMesh) {
					if (mesh)
						throw new SemanticError(`Cannot translate multiple meshes: ${mesh} and ${result}`)
					mesh = result
				} else if (typeof result === 'number')
					throw new SemanticError(`Cannot translate by number: ${result}`)
					else vector = Vector.add(vector, result)
				}
				return mesh ? mesh.translate(vector as Vector3) : (vector as Vector3)
			})
		}
		case 'subtract': {
			return maybeAwait(expr.operands.map(operand=> recur(operand, values)), (results)=> {
				const [a, b] = results
				if (a instanceof AMesh && b instanceof AMesh) return maybeAwait([op3.subtract(a, b)], ([result]) => result)
				if (typeof a === 'number' && typeof b === 'number') return a - b
				if (Array.isArray(a) && Array.isArray(b)) return Vector.sub(a, b)
				throw new SemanticError(`Bad operand to subtract: ${a} and ${b}`)
			})
		}
		case 'invert': {
			return maybeAwait([recur(expr.operand, values)], ([result]) => {
				if (typeof result === 'number') return 1 / result
				if (Array.isArray(result)) return Vector.from(result.map((v) => 1 / v)) as Vector3
				throw new SemanticError(`Cannot invert non-number and non-vector: ${result}`)
			})
		}
		case 'rotate': {
			const operands = [recur(expr.mesh, values), recur(expr.axis, values)]
			if (expr.angle) operands.push(recur(expr.angle, values))
			return maybeAwait(operands, ([mesh, axis, angle]) => {
				// The mesh should be an AMesh
				if (!(mesh instanceof AMesh)) {
					throw new SemanticError(`Cannot rotate non-mesh: ${mesh}`)
				}

				// The axis should be a vector
				if (!Array.isArray(axis)) {
					throw new SemanticError(`Rotation axis must be a vector: ${axis}`)
				}
				const rotationAxis = axis as Vector3

				// If angle is provided, use it; otherwise use the length of the axis vector
				let rotationAngle: number
				if (angle !== undefined) {
					if (typeof angle !== 'number') {
						throw new SemanticError(`Rotation angle must be a number: ${angle}`)
					}
					rotationAngle = angle
				} else {
					rotationAngle = rotationAxis.size
				}

				return mesh.rotate(rotationAxis, rotationAngle)
			})
		}
		case 'intersect': {
			return maybeAwait(expr.operands.map(operand => recur(operand, values)), (results) => {
				const meshes: AMesh[] = []
				for (const result of results) {
					if (!(result instanceof AMesh))
						throw new SemanticError(`Bad operand to intersect: ${result}`)
					meshes.push(result)
				}
				return op3.intersect(...meshes)
			})
		}
		case 'union': {
			return maybeAwait(expr.operands.map(operand => recur(operand, values)), (results) => {
				const meshes: AMesh[] = []
				for (const result of results) {
					if (!(result instanceof AMesh)) throw new SemanticError(`Bad operand to union: ${result}`)
					meshes.push(result)
				}
				return op3.union(...meshes)
			})
		}
		case 'vectorWithParams': {
			const operands = expr.components.map(component =>
				typeof component === 'number' ? component : recur(component, values)
			)
			return maybeAwait(operands, (results) => {
				const components: number[] = []
				for (let i = 0; i < expr.components.length; i++) {
					const component = expr.components[i]
					if (typeof component === 'number') {
						components.push(component)
					} else {
						const result = results[i]
						if (typeof result !== 'number') {
							throw new SemanticError(`Vector component must be a number: ${result}`)
						}
						components.push(result)
					}
				}
				return Vector.from(components) as Vector3
			})
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
			factor = product(factor, expr.factor)
			for (const term of expr.operands) add(term)
		} else if (expr.type === 'literal') factor = product(factor, expr.value)
		else resultingOperands.push(expr)
	}
	for (const operand of operands) add(operand)
	return resultingOperands.length === 1 && isUnity(factor)
		? resultingOperands[0]
		: { type: 'scale', factor, operands: resultingOperands }
}

function rotate(
	mesh: LinearExpression,
	axis: LinearExpression,
	angle?: LinearExpression
): LinearExpression {
	// This creates a rotate expression where:
	// - mesh is the mesh to rotate
	// - axis is the rotation axis (vector)
	// - angle is optional (if not provided, use axis length)
	return { type: 'rotate', mesh, axis, angle }
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
			{ '^': 'binary' },
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
			'^': (a: LinearExpression, b: LinearExpression) => rotate(a, b), // Only uses vector length as angle
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
				rex: new RegExp(`\\[([\\d \\-.]*\\${paramMarker}.[\\d \\-.]*)\\]`, 'sy'),
				build: (match) => {
					const content = match[1]
					const components: (number | LinearExpression)[] = []
					const parts = content.split(/\s+/)

					for (const part of parts) {
						if (part.includes(paramMarker)) {
							// This part contains a parameter marker
							const paramMatch = part.match(new RegExp(`\\${paramMarker}(.)`))
							if (paramMatch) {
								const codePoint = paramMatch[1].codePointAt(0)!
								components.push({ type: 'parameter', index: codePoint })
							} else {
								// Mixed content like "0.5§0" - extract the number and parameter
								const numberMatch = part.match(/^([\d.-]+)/)
								if (numberMatch) {
									components.push(Number.parseFloat(numberMatch[1]))
								}
								const paramMatch2 = part.match(new RegExp(`\\${paramMarker}(.)`))
								if (paramMatch2) {
									const codePoint = paramMatch2[1].codePointAt(0)!
									components.push({ type: 'parameter', index: codePoint })
								}
							}
						} else if (part.trim()) {
							// Regular number
							components.push(Number.parseFloat(part))
						}
					}

					return { type: 'vectorWithParams', components }
				},
			},
			{
				rex: /\[([\d \.-]+)\]/sy,
				build: (match) => ({
					type: 'literal',
					value: Vector.from(match[1].split(/\s+/).map(Number)) as Vector3,
				}),
			},
			{
				rex: /(?:\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|(?:\.\d+(?:[eE][+-]?\d+)?)/y,
				build: (match) => ({ type: 'literal', value: Number(match[0]) }),
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

export function mesh(expr: TemplateStringsArray, ...values: readonly (Mesh | LinearPrimitive)[]) {
	return maybeAwait([formulas.calculate(expr, ...values)], ([result])=> expectClass(result, AMesh))
}

export function vector(expr: TemplateStringsArray, ...values: readonly LinearPrimitive[]) {
	return maybeAwait([formulas.calculate(expr, ...values)], ([result])=> expectClass(result, Vector))
}
