import { describe, expect, it } from 'vitest'
import {
	parse,
	type OperatorPrecedence
} from './expression'

describe('Expression Parser', () => {
	// Define a simple precedence table for testing
	const precedence: OperatorPrecedence = {
		operators: [
			{ '+': 'nary', '-': 'binary' },
			{ '*': 'nary', '/': 'binary' },
			{ '^': 'binary' }
		],
		unary: ['-'] // Unary minus
	}

	describe('Number parsing', () => {
		it('should parse simple numbers', () => {
			const result = parse('42', precedence)
			expect(result.type).toBe('number')
			expect((result as any).value).toBe(42)
		})

		it('should parse decimal numbers', () => {
			const result = parse('3.14', precedence)
			expect(result.type).toBe('number')
			expect((result as any).value).toBe(3.14)
		})

		it('should parse zero', () => {
			const result = parse('0', precedence)
			expect(result.type).toBe('number')
			expect((result as any).value).toBe(0)
		})
	})

	describe('Variable parsing', () => {
		it('should parse simple variables', () => {
			const result = parse('x', precedence)
			expect(result.type).toBe('variable')
			expect((result as any).name).toBe('x')
		})

		it('should parse multi-character variables', () => {
			const result = parse('variable', precedence)
			expect(result.type).toBe('variable')
			expect((result as any).name).toBe('variable')
		})

		it('should parse variables with numbers', () => {
			const result = parse('var123', precedence)
			expect(result.type).toBe('variable')
			expect((result as any).name).toBe('var123')
		})

		it('should parse variables starting with underscore', () => {
			const result = parse('_private', precedence)
			expect(result.type).toBe('variable')
			expect((result as any).name).toBe('_private')
		})

		it('should parse variables starting with dollar sign', () => {
			const result = parse('$special', precedence)
			expect(result.type).toBe('variable')
			expect((result as any).name).toBe('$special')
		})
	})

	describe('Binary operator parsing', () => {
		it('should parse simple addition', () => {
			const result = parse('1 + 2', precedence)
			expect(result.type).toBe('operation')
			const binOp = result as any
			expect(binOp.operator).toBe('+')
			expect(binOp.operands[0].type).toBe('number')
			expect(binOp.operands[1].type).toBe('number')
			expect(binOp.operands[0].value).toBe(1)
			expect(binOp.operands[1].value).toBe(2)
		})

		it('should parse simple multiplication', () => {
			const result = parse('3 * 4', precedence)
			expect(result.type).toBe('operation')
			const binOp = result as any
			expect(binOp.operator).toBe('*')
			expect(binOp.operands[0].value).toBe(3)
			expect(binOp.operands[1].value).toBe(4)
		})

		it('should parse multiple operations with correct precedence', () => {
			const result = parse('1 + 2 * 3', precedence)
			expect(result.type).toBe('operation')
			const binOp = result as any
			expect(binOp.operator).toBe('+')
			expect(binOp.operands[0].value).toBe(1)
			expect(binOp.operands[1].type).toBe('operation')
			const rightOp = binOp.operands[1] as any
			expect(rightOp.operator).toBe('*')
			expect(rightOp.operands[0].value).toBe(2)
			expect(rightOp.operands[1].value).toBe(3)
		})

		it('should handle left associativity for same precedence', () => {
			const result = parse('1 - 2 - 3', precedence)
			expect(result.type).toBe('operation')
			const binOp = result as any
			expect(binOp.operator).toBe('-')
			// It became (1-2)-3
			// Check left associativity: ((1-2)-3)
			// Root is '-'
			expect(binOp.operator).toBe('-')
			// Left operand is an operation '-'
			expect(binOp.operands[0].type).toBe('operation')
			const leftOp = binOp.operands[0]
			expect(leftOp.operator).toBe('-')
			// Leftmost operand is 1
			expect(leftOp.operands[0].value).toBe(1)
			// Right operand of leftOp is 2
			expect(leftOp.operands[1].value).toBe(2)
			// Rightmost operand is 3
			expect(binOp.operands[1].value).toBe(3)
		})
	})

	describe('N-ary operator parsing', () => {
		it('should parse multiple additions as n-ary', () => {
			const result = parse('1 + 2 + 3', precedence)
			expect(result.type).toBe('operation')
			const naryOp = result as any
			expect(naryOp.operator).toBe('+')
			expect(naryOp.operands).toHaveLength(3)
			expect(naryOp.operands[0].value).toBe(1)
			expect(naryOp.operands[1].value).toBe(2)
			expect(naryOp.operands[2].value).toBe(3)
		})

		it('should parse multiple multiplications as n-ary', () => {
			const result = parse('2 * 3 * 4', precedence)
			expect(result.type).toBe('operation')
			const naryOp = result as any
			expect(naryOp.operator).toBe('*')
			expect(naryOp.operands).toHaveLength(3)
			expect(naryOp.operands[0].value).toBe(2)
			expect(naryOp.operands[1].value).toBe(3)
			expect(naryOp.operands[2].value).toBe(4)
		})

		it('should handle mixed n-ary and binary operators', () => {
			const result = parse('1 + 2 + 3 * 4', precedence)
			expect(result.type).toBe('operation')
			const naryOp = result as any
			expect(naryOp.operator).toBe('+')
			expect(naryOp.operands).toHaveLength(3)
			expect(naryOp.operands[2].type).toBe('operation')
		})

		it('should handle n-ary operators with variables', () => {
			const result = parse('a + b + c', precedence)
			expect(result.type).toBe('operation')
			const naryOp = result as any
			expect(naryOp.operator).toBe('+')
			expect(naryOp.operands).toHaveLength(3)
			expect(naryOp.operands[0].name).toBe('a')
			expect(naryOp.operands[1].name).toBe('b')
			expect(naryOp.operands[2].name).toBe('c')
		})
	})

	describe('Unary operator parsing', () => {
		it('should parse unary minus', () => {
			const result = parse('-5', precedence)
			expect(result.type).toBe('unaryOperator')
			const unOp = result as any
			expect(unOp.operator).toBe('-')
			expect(unOp.operand.type).toBe('number')
			expect(unOp.operand.value).toBe(5)
		})

		it('should handle unary minus with higher precedence', () => {
			const result = parse('-2 * 3', precedence)
			expect(result.type).toBe('operation')
			const binOp = result as any
			expect(binOp.operator).toBe('*')
			expect(binOp.operands[0].type).toBe('unaryOperator')
			expect(binOp.operands[1].value).toBe(3)
		})
	})

	describe('Parentheses parsing', () => {
		it('should parse simple parentheses', () => {
			const result = parse('(1 + 2)', precedence)
			expect(result.type).toBe('operation')
			const binOp = result as any
			expect(binOp.operator).toBe('+')
			expect(binOp.operands[0].value).toBe(1)
			expect(binOp.operands[1].value).toBe(2)
		})

		it('should override operator precedence with parentheses', () => {
			const result = parse('(1 + 2) * 3', precedence)
			expect(result.type).toBe('operation')
			const binOp = result as any
			expect(binOp.operator).toBe('*')
			expect(binOp.operands[0].type).toBe('operation')
			expect(binOp.operands[1].value).toBe(3)
		})

		it('should handle nested parentheses', () => {
			const result = parse('((1 + 2) * 3) + 4', precedence)
			expect(result.type).toBe('operation')
			const binOp = result as any
			expect(binOp.operator).toBe('+')
			expect(binOp.operands[1].value).toBe(4)
		})

		it('should handle complex nested expressions', () => {
			const result = parse('(a + b) * (c - d)', precedence)
			expect(result.type).toBe('operation')
			const binOp = result as any
			expect(binOp.operator).toBe('*')
			expect(binOp.operands[0].type).toBe('operation')
			expect(binOp.operands[1].type).toBe('operation')
		})
	})

	describe('Complex expressions', () => {
		it('should parse expression with variables and numbers', () => {
			const result = parse('x + 2 * y', precedence)
			expect(result.type).toBe('operation')
			const binOp = result as any
			expect(binOp.operator).toBe('+')
			expect(binOp.operands[0].type).toBe('variable')
			expect(binOp.operands[0].name).toBe('x')
		})

		it('should handle expression with unary and binary operators', () => {
			const result = parse('-x + y * 2', precedence)
			expect(result.type).toBe('operation')
			const binOp = result as any
			expect(binOp.operator).toBe('+')
			expect(binOp.operands[0].type).toBe('unaryOperator')
			expect(binOp.operands[1].type).toBe('operation')
		})

		it('should handle whitespace correctly', () => {
			const result1 = parse('1+2', precedence)
			const result2 = parse('1 + 2', precedence)
			const result3 = parse(' 1 + 2 ', precedence)

			expect(result1.type).toBe('operation')
			expect(result2.type).toBe('operation')
			expect(result3.type).toBe('operation')
		})
	})

	describe('Error handling', () => {
		it('should throw on mismatched parentheses', () => {
			expect(() => parse('(1 + 2', precedence)).toThrow('Expected closing parenthesis')
			expect(() => parse('1 + 2)', precedence)).toThrow('Unexpected closing parenthesis')
		})

		it('should throw on unknown operators', () => {
			expect(() => parse('1 @ 2', precedence)).toThrow('Unexpected operator: @')
		})

		it('should throw on invalid expressions', () => {
			expect(() => parse('1 +', precedence)).toThrow('Unexpected end of expression')
			expect(() => parse('+ 1', precedence)).toThrow('Unexpected operator: +')
		})

		it('should throw on not enough operands', () => {
			// This would be caught during operator application
			expect(() => parse('1 + + 2', precedence)).toThrow('Unexpected operator: +')
		})
	})

	describe('Operator precedence', () => {
		it('should respect multiplication over addition', () => {
			const result = parse('1 + 2 * 3', precedence)
			expect(result.type).toBe('operation')
			const binOp = result as any
			expect(binOp.operator).toBe('+')
			expect(binOp.operands[1].type).toBe('operation')
			const rightOp = binOp.operands[1] as any
			expect(rightOp.operator).toBe('*')
		})

		it('should respect exponentiation over multiplication', () => {
			const result = parse('2 * 3 ^ 2', precedence)
			expect(result.type).toBe('operation')
			const binOp = result as any
			expect(binOp.operator).toBe('*')
			expect(binOp.operands[1].type).toBe('operation')
			const rightOp = binOp.operands[1] as any
			expect(rightOp.operator).toBe('^')
		})

		it('should handle unary minus with highest precedence', () => {
			const result = parse('-2 + 3', precedence)
			expect(result.type).toBe('operation')
			const binOp = result as any
			expect(binOp.operator).toBe('+')
			expect(binOp.operands[0].type).toBe('unaryOperator')
		})
	})

	describe('Edge cases', () => {
		it('should handle single number', () => {
			const result = parse('42', precedence)
			expect(result.type).toBe('number')
		})

		it('should handle single variable', () => {
			const result = parse('x', precedence)
			expect(result.type).toBe('variable')
		})

		it('should handle empty parentheses', () => {
			expect(() => parse('()', precedence)).toThrow('Unexpected closing parenthesis')
		})

		it('should handle multiple spaces', () => {
			const result = parse('  1   +   2  ', precedence)
			expect(result.type).toBe('operation')
		})
	})
})
