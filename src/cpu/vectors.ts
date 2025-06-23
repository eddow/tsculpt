import { Expression, cachedParser } from '../expression'
import type { Vector3, VectorD } from '../types/vectors'
export function equals<Vector extends VectorD>(a: Vector, b: Vector): boolean {
	return a.length === b.length && a.every((value, index) => value === b[index])
}

export function normalize<Vector extends VectorD>(v: Vector): Vector {
	const length = Math.sqrt(v.reduce((sum, x) => sum + x * x, 0))
	return v.map((x) => x / length) as unknown as Vector
}

export function linear<Vector extends VectorD>(...vectors: [number, Vector][]): Vector {
	// Calculate weighted sum of vectors
	const result = vectors.reduce((sum, [scale, vec]) => {
		const newSum = [...sum]
		while (newSum.length < vec.length) newSum.push(0)
		return newSum.map((s, i) => s + scale * vec[i])
	}, [] as number[])
	return result as unknown as Vector
}

export function translate<Vector extends VectorD>(vertices: Vector[], offset: Vector): Vector[] {
	if (offset.every((v) => v === 0)) return vertices
	return vertices.map((vertex) => {
		return vector`${vertex} + ${offset}`
	})
}

export function scale<Vector extends VectorD>(vertices: Vector[], scale: number): Vector[] {
	if (scale === 1) return vertices
	return vertices.map((vertex) => {
		return linear([scale, vertex])
	})
}

export function rotate3(vertices: Vector3[], angle: number, axis: Vector3): Vector3[] {
	if (angle === 0 || axis.every((v) => v === 0)) return vertices
	const [x, y, z] = axis
	const cos = Math.cos(angle)
	const sin = Math.sin(angle)
	const ux = x * x
	const uy = y * y
	const uz = z * z
	// Rotation matrix components
	const uxy = x * y * (1 - cos)
	const uxz = x * z * (1 - cos)
	const uyz = y * z * (1 - cos)
	const xs = x * sin
	const ys = y * sin
	const zs = z * sin

	// Apply rotation matrix to each vertex
	return vertices.map((vertex) => {
		const [vx, vy, vz] = vertex
		return [
			vx * (cos + ux * (1 - cos)) + vy * (uxy - zs) + vz * (uxz + ys),
			vx * (uxy + zs) + vy * (cos + uy * (1 - cos)) + vz * (uyz - xs),
			vx * (uxz - ys) + vy * (uyz + xs) + vz * (cos + uz * (1 - cos)),
		] as Vector3
	})
}

function calculate(
	expr: Expression,
	values: (number | readonly number[])[]
): number | readonly number[] {
	switch (expr.type) {
		case 'operation':
			switch (expr.operator) {
				case '+':
					const addTerms = expr.operands.map((operand) => calculate(operand, values))
					// If all terms are numbers, add them
					if (addTerms.every((term) => typeof term === 'number')) {
						return (addTerms as number[]).reduce((sum, term) => sum + term, 0)
					}
					// If all terms are vectors, add them component-wise
					if (addTerms.every((term) => Array.isArray(term))) {
						const vectors = addTerms as readonly number[][]
						const maxLength = Math.max(...vectors.map((v) => v.length))
						const result = new Array(maxLength).fill(0)
						for (const vector of vectors) {
							for (let i = 0; i < vector.length; i++) {
								result[i] += vector[i]
							}
						}
						return result
					}
					throw new Error('Cannot add mixed types')

				case '-':
					if (expr.operands.length !== 2) {
						throw new Error('Subtraction requires exactly 2 operands')
					}
					const left = calculate(expr.operands[0], values)
					const right = calculate(expr.operands[1], values)

					// If both are numbers
					if (typeof left === 'number' && typeof right === 'number') {
						return left - right
					}
					// If both are vectors
					if (Array.isArray(left) && Array.isArray(right)) {
						const maxLength = Math.max(left.length, right.length)
						const result = new Array(maxLength).fill(0)
						for (let i = 0; i < left.length; i++) {
							result[i] = left[i]
						}
						for (let i = 0; i < right.length; i++) {
							result[i] -= right[i]
						}
						return result
					}
					throw new Error('Cannot subtract mixed types')

				case '*':
					const mulTerms = expr.operands.map((operand) => calculate(operand, values))
					// If all terms are numbers, multiply them
					if (mulTerms.every((term) => typeof term === 'number')) {
						return (mulTerms as number[]).reduce((product, term) => product * term, 1)
					}
					// If we have a number and a vector, scale the vector
					const numbers = mulTerms.filter((term) => typeof term === 'number') as number[]
					const vectors = mulTerms.filter((term) => Array.isArray(term)) as readonly number[][]

					if (numbers.length === 1 && vectors.length === 1) {
						const scale = numbers[0]
						const vector = vectors[0]
						return vector.map((v) => scale * v)
					}
					throw new Error('Invalid multiplication: need exactly one number and one vector')

				default:
					throw new Error(`Unknown operator: ${expr.operator}`)
			}
		case 'number':
			return expr.value
		case 'paramIndex':
			return values[expr.index]
		default:
			throw new Error(`Unknown expression type: ${(expr as any).type}`)
	}
}
export const vector = cachedParser<readonly number[], number | readonly number[], Expression>(
	{
		operators: [{ '+': 'nary', '-': 'binary' }, { '*': 'nary' }],
		emptyOperator: '*',
		paramIndexes: true,
	},
	(expr) => expr,
	(expr, values) => {
		const result = calculate(expr, values)
		if (!(result instanceof Array)) throw new Error(`Invalid vector expression: ${expr}`)
		return result
	}
) as <Vector extends VectorD>(
	expr: TemplateStringsArray,
	...values: readonly (number | Vector)[]
) => Vector
/*
export function vector<Vector extends VectorD>(
	strings: TemplateStringsArray,
	...values: (Vector | number)[]
): Vector {
	// Combine the strings and values into a single expression
	let expr = strings[0]
	for (let i = 0; i < values.length; i++) {
		expr += ` $${i} ${strings[i + 1]}`
	}
	expr = expr.trim()

	// Split on + or - but keep the signs
	const terms = expr.split('+').flatMap((term) => {
		const [first, ...rest] = term.split('-').map((part) => part.trim())
		return [first, ...rest.map((part) => `-${part}`)]
	})
	if (!terms) throw new Error(`Invalid vector expression: ${expr}`)
	const rv: number[] = []
	for (let term of terms) {
		let factor = term[0] === '-' ? -1 : 1
		if (term[0] === '-') term = term.slice(1)
		let vector: Vector | undefined
		for (let part of term.split(/\s*[* ]\s* /)) {
			part = part.trim()
			if (part.startsWith('$')) {
				const index = Number.parseInt(part.slice(1))
				if (Number.isNaN(index) || index >= values.length)
					throw new Error(`Invalid variable reference: ${part}`)
				if (typeof values[index] === 'number') factor *= values[index]
				else if (vector) throw new Error(`Multiple vectors in term: ${term}\n${expr}`)
				else vector = values[index] as Vector
			} else {
				const nr = Number.parseFloat(part)
				if (Number.isNaN(nr)) throw new Error(`Invalid number: ${part}`)
				factor *= nr
			}
		}
		if (!vector) throw new Error(`No vector in term: ${term}\n${expr}`)
		while (rv.length < vector.length) rv.push(0)
		for (let i = 0; i < vector.length; i++) rv[i] += factor * vector[i]
	}
	return rv as unknown as Vector
}
*/
