import { TemplateParser } from './templated'
import { Mesh } from '../types/mesh'
import { Vector3, Vector } from '../types/bunches'
import booleans, { isMesh, type AMesh } from '@booleans'

export class MeshSemanticError extends Error {}

type MeshParameter = { type: 'parameter'; index: number }
type MeshOperation = { type: 'operation'; operator: string; operands: MeshExpression[] }
type MeshLiteral = { type: 'mesh'; value: Mesh }
type VectorLiteral = { type: 'vector'; value: Vector3 }
type NumberLiteral = { type: 'number'; value: number }
type MeshExpression = MeshParameter | MeshOperation | MeshLiteral | VectorLiteral | NumberLiteral

// Define the mesh operations
function translate(mesh: Mesh, vector: Vector3): Mesh {
	return mesh.map(v => v.map((coord, i) => coord + vector[i]) as Vector3)
}

function scale(mesh: Mesh, factor: number | Vector3): Mesh {
	if (typeof factor === 'number') {
		return mesh.map(v => v.map(coord => coord * factor) as Vector3)
	} else {
		return mesh.map(v => v.map((coord, i) => coord * factor[i]) as Vector3)
	}
}

function recur(
	expr: MeshExpression,
	values: (AMesh | Vector3 | number)[]
): AMesh | Vector3 | number {
	switch (expr.type) {
		case 'parameter':
			return values[expr.index]
		case 'operation': {
			const operands = expr.operands.map(op => recur(op, values))

			switch (expr.operator) {
				case '+': {
					const mesh = operands[0] as AMesh
					const second = operands[1]
					if (!(second instanceof Vector3)) {
						throw new MeshSemanticError(`Cannot add mesh to: ${second}`)
					}
					return translate(booleans.result(mesh), second)
				}
				case '*': {
					const mesh = operands[0] as AMesh
					const factor = operands[1]
					if (typeof factor === 'number') {
						return scale(booleans.result(mesh), factor)
					} else if (factor instanceof Vector3) {
						return scale(booleans.result(mesh), factor)
					} else {
						throw new MeshSemanticError(`Cannot multiply mesh by: ${factor}`)
					}
				}
				case '-': {
					const mesh1 = operands[0] as AMesh
					const mesh2 = operands[1] as AMesh
					return booleans.subtract(mesh1, mesh2)
				}
				case '&': {
					const mesh1 = operands[0] as AMesh
					const mesh2 = operands[1] as AMesh
					return booleans.intersect(mesh1, mesh2)
				}
				case '|': {
					const mesh1 = operands[0] as AMesh
					const mesh2 = operands[1] as AMesh
					return booleans.union(mesh1, mesh2)
				}
				default:
					throw new MeshSemanticError(`Unknown operator: ${expr.operator}`)
			}
		}
		case 'mesh':
			return expr.value
		case 'vector':
			return expr.value
		case 'number':
			return expr.value
	}
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
			{ '+': 'binary' },
			{ '*': 'binary' }
		],
		operations: {
			'+': (a: MeshExpression, b: MeshExpression) => ({
				type: 'operation',
				operator: '+',
				operands: [a, b]
			}),
			'*': (a: MeshExpression, b: MeshExpression) => ({
				type: 'operation',
				operator: '*',
				operands: [a, b]
			}),
			'-': (a: MeshExpression, b: MeshExpression) => ({
				type: 'operation',
				operator: '-',
				operands: [a, b]
			}),
			'&': (a: MeshExpression, b: MeshExpression) => ({
				type: 'operation',
				operator: '&',
				operands: [a, b]
			}),
			'|': (a: MeshExpression, b: MeshExpression) => ({
				type: 'operation',
				operator: '|',
				operands: [a, b]
			})
		},
		atomics: [
			{
				rex: /\[([\d \.-]+)\]/s,
				build: (match) => ({ type: 'vector', value: Vector.from(match[1].split(/\s+/).map(Number)) as Vector3 })
			},
			{
				rex: /(?:\d+(:?\.\d+)?)|(?:\.\d+)/,
				build: (match) => ({ type: 'number', value: Number(match[0]) })
			}
		],
		surroundings: [{ open: '(', close: ')' }]
	},
	(index) => ({ type: 'parameter', index }),
	recur
)

function expectMesh(value: unknown): Mesh {
	if (!isMesh(value)) {
		throw new MeshSemanticError(
			`Expected Mesh, got: ${
				typeof value === 'object' ? value?.constructor.name : typeof value
			}`
		)
	}
	return booleans.result(value as AMesh)
}

export function mesh(expr: TemplateStringsArray, ...values: (Mesh | Vector3 | number)[]) {
	const result = meshFormulas.calculate(expr, ...values)
	return expectMesh(result)
}
