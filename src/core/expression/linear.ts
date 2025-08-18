import type Op2 from '@tsculpt/op2'
import type Op3 from '@tsculpt/op3'
import di from '@tsculpt/ts/di'
import { MaybePromise, maybeAwait } from '@tsculpt/ts/maybe'
import { Vector, Vector2, Vector3, isUnity, product } from '../types/bunches'
import { AContour, Contour } from '../types/contour'
import { AMesh, Mesh } from '../types/mesh'
import { TemplateParser } from './templated'

const { op3, op2 } = di<{ op3: Op3; op2: Op2 }>()

export class SemanticError extends Error {}

// Helper functions for vector rotation
function rotateVector2(vector: Vector2, angle: number): Vector2 {
	const cos = Math.cos(angle)
	const sin = Math.sin(angle)
	return new Vector2(vector.x * cos - vector.y * sin, vector.x * sin + vector.y * cos)
}

function rotateVector3(vector: Vector3, axis: Vector3, angle: number): Vector3 {
	const cos = Math.cos(angle)
	const sin = Math.sin(angle)
	const oneMinusCos = 1 - cos

	// Rodrigues' rotation formula
	const rotated = new Vector3(
		vector.x * (cos + axis.x * axis.x * oneMinusCos) +
			vector.y * (axis.x * axis.y * oneMinusCos - axis.z * sin) +
			vector.z * (axis.x * axis.z * oneMinusCos + axis.y * sin),

		vector.x * (axis.y * axis.x * oneMinusCos + axis.z * sin) +
			vector.y * (cos + axis.y * axis.y * oneMinusCos) +
			vector.z * (axis.y * axis.z * oneMinusCos - axis.x * sin),

		vector.x * (axis.z * axis.x * oneMinusCos - axis.y * sin) +
			vector.y * (axis.z * axis.y * oneMinusCos + axis.x * sin) +
			vector.z * (cos + axis.z * axis.z * oneMinusCos)
	)

	return rotated
}

type LinearParameter = { type: 'parameter'; index: number }
type LinearScale = { type: 'scale'; factor: number | number[]; operands: LinearExpression[] }
type LinearTranslate = { type: 'translate'; terms: LinearExpression[] }
type LinearSubtract = { type: 'subtract'; operands: [LinearExpression, LinearExpression] }
type LinearInvert = { type: 'invert'; operand: LinearExpression }
type LinearRotate = {
	type: 'rotate'
	object: LinearExpression
	axis: LinearExpression
}
type LinearIntersect = { type: 'intersect'; operands: LinearExpression[] }
type LinearUnion = { type: 'union'; operands: LinearExpression[] }
type LinearLiteral = { type: 'literal'; value: number | Vector2 | Vector3 }
type LinearCompose = { type: 'compose'; operands: LinearExpression[] }
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
	| LinearCompose

function recur(
	expr: LinearExpression,
	values: (AMesh | AContour | LinearPrimitive)[]
): MaybePromise<AMesh | AContour | LinearPrimitive> {
	switch (expr.type) {
		case 'parameter':
			return values[expr.index]
		case 'literal':
			return expr.value
		case 'scale': {
			let factor: number | readonly number[] = expr.factor
			let geometry: AMesh | AContour | undefined
			return maybeAwait(
				expr.operands.map((operand) => recur(operand, values)),
				(results) => {
					for (const result of results) {
						if (result instanceof AMesh || result instanceof AContour) {
							if (geometry)
								throw new SemanticError(
									`Cannot scale multiple geometries: ${geometry} and ${result}`
								)
							geometry = result
						} else factor = product(factor, result)
					}
					if (isUnity(factor)) return geometry || 1
					const scale = Array.isArray(factor)
						? (Vector.from(factor) as Vector3)
						: (factor as number)
					if (geometry) return geometry.scale(scale)
					return scale
				}
			)
		}
		case 'compose': {
			return maybeAwait(
				expr.operands.map((operand) => recur(operand, values)),
				(results) => {
					if (!results.every((result) => typeof result === 'number'))
						throw new SemanticError(`Cannot compose non-numbers: ${results}`)
					if (![2, 3].includes(results.length))
						throw new SemanticError('Cannot only compose 2 or 3 numbers')
					return Vector.from(results) as Vector2 | Vector3
				}
			)
		}
		case 'translate': {
			let vector: Vector = Vector.from([0, 0, 0])
			let geometry: AMesh | AContour | undefined
			return maybeAwait(
				expr.terms.map((term) => recur(term, values)),
				(results) => {
					for (const result of results) {
						if (result instanceof AMesh || result instanceof AContour) {
							if (geometry)
								throw new SemanticError(
									`Cannot translate multiple geometries: ${geometry} and ${result}`
								)
							geometry = result
						} else if (typeof result === 'number')
							throw new SemanticError(`Cannot translate by number: ${result}`)
						else vector = Vector.add(vector, result)
					}
					return geometry
						? geometry instanceof AMesh
							? geometry.translate(vector as Vector3)
							: geometry.translate(vector as Vector2)
						: (vector as Vector3)
				}
			)
		}
		case 'subtract': {
			return maybeAwait(
				expr.operands.map((operand) => recur(operand, values)),
				(results) => {
					const [a, b] = results
					if (a instanceof AMesh && b instanceof AMesh)
						return maybeAwait([op3.subtract(a, b)], ([result]) => result)
					if (a instanceof AContour && b instanceof AContour)
						return maybeAwait([op2.subtract(a, b)], ([result]) => result)
					if (typeof a === 'number' && typeof b === 'number') return a - b
					if (Array.isArray(a) && Array.isArray(b)) return Vector.sub(a, b)
					if (a === 0 && Array.isArray(b)) return Vector.from(b.map((v) => -v)) as Vector3 | Vector2
					throw new SemanticError(`Bad operand to subtract: ${a} and ${b}`)
				}
			)
		}
		case 'invert': {
			return maybeAwait([recur(expr.operand, values)], ([result]) => {
				if (typeof result === 'number') return 1 / result
				if (Array.isArray(result)) return Vector.from(result.map((v) => 1 / v)) as Vector3 | Vector2
				throw new SemanticError(`Cannot invert non-number and non-vector: ${result}`)
			})
		}
		case 'rotate': {
			return maybeAwait(
				[recur(expr.object, values), recur(expr.axis, values)],
				([object, axis]) => {
					// Handle AMesh rotation
					if (object instanceof AMesh) {
						// For 3D meshes, axis should be a Vector3
						if (!Array.isArray(axis)) {
							throw new SemanticError(`Rotation axis must be a vector for meshes: ${axis}`)
						}
						const rotationAxis = axis as Vector3
						// Use the length of the axis vector as the angle
						return object.rotate(rotationAxis)
					}

					// Handle AContour rotation
					if (object instanceof AContour) {
						// For 2D contours, axis should be a number (angle in radians)
						if (typeof axis !== 'number') {
							throw new SemanticError(`Rotation angle must be a number for contours: ${axis}`)
						}
						// Use radians directly for the contour's rotate method
						return object.rotate(axis)
					}

					// Handle Vector3 rotation
					if (Array.isArray(object) && object.length === 3) {
						// For Vector3, axis should be a Vector3
						if (!Array.isArray(axis)) {
							throw new SemanticError(`Rotation axis must be a vector for Vector3: ${axis}`)
						}
						const vector = object as Vector3
						const rotationAxis = axis as Vector3
						// Use the length of the axis vector as the angle
						const rotationAngle = rotationAxis.size
						// Implement Vector3 rotation around axis
						return rotateVector3(vector, rotationAxis.normalized(), rotationAngle)
					}

					// Handle Vector2 rotation
					if (Array.isArray(object) && object.length === 2) {
						// For Vector2, axis should be a number (angle in radians)
						if (typeof axis !== 'number') {
							throw new SemanticError(`Rotation angle must be a number for Vector2: ${axis}`)
						}
						const vector = object as Vector2
						// Use radians directly for Vector2 rotation
						return rotateVector2(vector, axis)
					}

					throw new SemanticError(`Cannot rotate unsupported type: ${object}`)
				}
			)
		}
		case 'intersect': {
			return maybeAwait(
				expr.operands.map((operand) => recur(operand, values)),
				(results) => {
					const meshes: AMesh[] = []
					const contours: AContour[] = []
					for (const result of results) {
						if (result instanceof AMesh) {
							meshes.push(result)
						} else if (result instanceof AContour) {
							contours.push(result)
						} else {
							throw new SemanticError(`Bad operand to intersect: ${result}`)
						}
					}
					if (meshes.length > 0 && contours.length > 0) {
						throw new SemanticError('Cannot intersect meshes and contours together')
					}
					if (meshes.length > 0) {
						return op3.intersect(...meshes)
					}
					if (contours.length > 0) {
						return op2.intersect(...contours)
					}
					throw new SemanticError('No valid operands for intersection')
				}
			)
		}
		case 'union': {
			return maybeAwait(
				expr.operands.map((operand) => recur(operand, values)),
				(results) => {
					const meshes: AMesh[] = []
					const contours: AContour[] = []
					for (const result of results) {
						if (result instanceof AMesh) {
							meshes.push(result)
						} else if (result instanceof AContour) {
							contours.push(result)
						} else {
							throw new SemanticError(`Bad operand to union: ${result}`)
						}
					}
					if (meshes.length > 0 && contours.length > 0) {
						throw new SemanticError('Cannot union meshes and contours together')
					}
					if (meshes.length > 0) {
						return op3.union(...meshes)
					}
					if (contours.length > 0) {
						return op2.union(...contours)
					}
					throw new SemanticError('No valid operands for union')
				}
			)
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

function rotate(mesh: LinearExpression, axis: LinearExpression): LinearExpression {
	// This creates a rotate expression where:
	// - mesh is the mesh to rotate
	// - axis is the rotation axis (Vector3 for meshes, number for contours)
	return { type: 'rotate', object: mesh, axis }
}

export type LinearPrimitive = Vector2 | Vector3 | number

const formulas = new TemplateParser<
	LinearExpression,
	AMesh | AContour | LinearPrimitive,
	AMesh | AContour | LinearPrimitive
>(
	{
		precedence: [
			{ '|': 'nary', '&': 'nary' },
			{ ',': 'nary' },
			{ '+': 'nary', '-': 'binary' },
			{ '^': 'binary' },
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
			'^': (a: LinearExpression, b: LinearExpression) => rotate(a, b), // Uses number as angle
			',': (...operands) => ({
				type: 'compose',
				operands,
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
		prefix: {
			'-': (operand: LinearExpression) => ({
				type: 'subtract',
				operands: [{ type: 'literal', value: 0 }, operand],
			}),
		},
		atomics: [
			{
				rex: /\[([\d \.-]+)\]/sy,
				build: (match) => ({
					type: 'literal',
					value: Vector.from(match[1].split(/\s+/).map(Number)) as Vector3,
				}),
			},
			{
				rex: /π|π|pi/iy,
				build: () => ({ type: 'literal', value: Math.PI }),
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

export function mesh(
	expr: TemplateStringsArray,
	...values: readonly (Mesh | Contour | LinearPrimitive)[]
) {
	return maybeAwait([formulas.calculate(expr, ...values)], ([result]) => expectClass(result, AMesh))
}

export function contour(
	expr: TemplateStringsArray,
	...values: readonly (Mesh | Contour | LinearPrimitive)[]
) {
	return maybeAwait([formulas.calculate(expr, ...values)], ([result]) =>
		expectClass(result, AContour)
	)
}

export function vector(expr: TemplateStringsArray, ...values: readonly LinearPrimitive[]) {
	return maybeAwait([formulas.calculate(expr, ...values)], ([result]) =>
		expectClass(result, Vector)
	)
}
