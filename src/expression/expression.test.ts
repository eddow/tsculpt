import { describe, expect, it } from 'vitest'
import { type OperatorPrecedence, parse } from './expression'

describe('Expression Parser', () => {
	// Define a simple precedence table for testing
	const precedence: OperatorPrecedence = {
		operators: [{ '+': 'nary', '-': 'binary' }, { '*': 'nary', '/': 'binary' }, { '^': 'binary' }],
		prefix: ['-'],
		postfix: ['!', '++'],
		emptyOperator: '*',
		variables: true,
		paramIndexes: true,
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
			expect(result.type).toBe('prefix')
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
			expect(binOp.operands[0].type).toBe('prefix')
			expect(binOp.operands[1].value).toBe(3)
		})
	})

	describe('Postfix operator parsing', () => {
		it('should parse single postfix operator', () => {
			const result = parse('5!', precedence)
			expect(result.type).toBe('postfix')
			const postOp = result as any
			expect(postOp.operator).toBe('!')
			expect(postOp.operand.type).toBe('number')
			expect(postOp.operand.value).toBe(5)
		})

		it('should parse multiple postfix operators', () => {
			const result = parse('5!++', precedence)
			expect(result.type).toBe('postfix')
			const postOp = result as any
			expect(postOp.operator).toBe('++')
			expect(postOp.operand.type).toBe('postfix')
			expect(postOp.operand.operator).toBe('!')
			expect(postOp.operand.operand.type).toBe('number')
			expect(postOp.operand.operand.value).toBe(5)
		})

		it('should handle postfix with prefix operators', () => {
			const result = parse('-5!', precedence)
			expect(result.type).toBe('prefix')
			const preOp = result as any
			expect(preOp.operator).toBe('-')
			expect(preOp.operand.type).toBe('postfix')
			expect(preOp.operand.operator).toBe('!')
			expect(preOp.operand.operand.type).toBe('number')
			expect(preOp.operand.operand.value).toBe(5)
		})

		it('should handle postfix with variables', () => {
			const result = parse('x!', precedence)
			expect(result.type).toBe('postfix')
			const postOp = result as any
			expect(postOp.operator).toBe('!')
			expect(postOp.operand.type).toBe('variable')
			expect(postOp.operand.name).toBe('x')
		})

		it('should handle postfix with parentheses', () => {
			const result = parse('(1 + 2)!', precedence)
			expect(result.type).toBe('postfix')
			const postOp = result as any
			expect(postOp.operator).toBe('!')
			expect(postOp.operand.type).toBe('operation')
			expect(postOp.operand.operator).toBe('+')
		})

		it('should handle postfix with paramIndex', () => {
			const result = parse('$0!', precedence)
			expect(result.type).toBe('postfix')
			const postOp = result as any
			expect(postOp.operator).toBe('!')
			expect(postOp.operand.type).toBe('paramIndex')
			expect(postOp.operand.index).toBe(0)
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
			expect(binOp.operands[0].type).toBe('prefix')
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
			expect(binOp.operands[0].type).toBe('prefix')
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

	describe('Empty operator parsing', () => {
		it('should handle empty operator for implicit multiplication', () => {
			const result = parse('2x', precedence)
			expect(result.type).toBe('operation')
			const op = result as any
			expect(op.operator).toBe('*')
			expect(op.operands[0].value).toBe(2)
			expect(op.operands[1].name).toBe('x')
		})

		it('should handle empty operator with parentheses', () => {
			const result = parse('3(x+1)', precedence)
			expect(result.type).toBe('operation')
			const op = result as any
			expect(op.operator).toBe('*')
			expect(op.operands[0].value).toBe(3)
			expect(op.operands[1].type).toBe('operation')
		})

		it('should handle multiple empty operators', () => {
			const result = parse('2x 3y', precedence)
			expect(result.type).toBe('operation')
			const op = result as any
			expect(op.operator).toBe('*')
			expect(op.operands[0].value).toBe(2)
			expect(op.operands[1].name).toBe('x')
			expect(op.operands[2].value).toBe(3)
			expect(op.operands[3].name).toBe('y')
		})

		it('should respect precedence with empty operator', () => {
			const result = parse('2x + 3y', precedence)
			expect(result.type).toBe('operation')
			const op = result as any
			expect(op.operator).toBe('+')
			expect(op.operands[0].type).toBe('operation')
			expect(op.operands[1].type).toBe('operation')
		})

		it('should handle empty operator with unary operators', () => {
			const result = parse('-2x', precedence)
			expect(result.type).toBe('operation')
			const op = result as any
			expect(op.operator).toBe('*')
			expect(op.operands[0].type).toBe('prefix')
			expect(op.operands[1].name).toBe('x')
		})

		it('should cumulate also empty operator', () => {
			const result = parse('-2x*3y', precedence)
			expect(result.type).toBe('operation')
			const op = result as any
			expect(op.operator).toBe('*')
			expect(op.operands[0].type).toBe('prefix')
			expect(op.operands[1].name).toBe('x')
			expect(op.operands[2].value).toBe(3)
			expect(op.operands[3].name).toBe('y')
		})

		it('should handle empty operator with complex expressions', () => {
			const result = parse('2(x+y)', precedence)
			expect(result.type).toBe('operation')
			const op = result as any
			expect(op.operator).toBe('*')
			expect(op.operands[0].value).toBe(2)
			expect(op.operands[1].type).toBe('operation')
		})

		it('should handle empty operator precedence correctly', () => {
			const result = parse('2x^2', precedence)
			expect(result.type).toBe('operation')
			const op = result as any
			expect(op.operator).toBe('*')
			expect(op.operands[0].value).toBe(2)
			expect(op.operands[1].type).toBe('operation')
			expect(op.operands[1].operator).toBe('^')
			expect(op.operands[1].operands[0].name).toBe('x')
			expect(op.operands[1].operands[1].value).toBe(2)
		})
	})

	describe('ParamIndex parsing', () => {
		it('should parse simple paramIndex', () => {
			const result = parse('$0', precedence)
			expect(result.type).toBe('paramIndex')
			expect((result as any).index).toBe(0)
		})

		it('should parse multi-digit paramIndex', () => {
			const result = parse('$42', precedence)
			expect(result.type).toBe('paramIndex')
			expect((result as any).index).toBe(42)
		})

		it('should parse paramIndex with operations', () => {
			const result = parse('$0 + $1', precedence)
			expect(result.type).toBe('operation')
			const op = result as any
			expect(op.operator).toBe('+')
			expect(op.operands[0].type).toBe('paramIndex')
			expect(op.operands[0].index).toBe(0)
			expect(op.operands[1].type).toBe('paramIndex')
			expect(op.operands[1].index).toBe(1)
		})

		it('should parse paramIndex with numbers', () => {
			const result = parse('$0 * 2', precedence)
			expect(result.type).toBe('operation')
			const op = result as any
			expect(op.operator).toBe('*')
			expect(op.operands[0].type).toBe('paramIndex')
			expect(op.operands[0].index).toBe(0)
			expect(op.operands[1].type).toBe('number')
			expect(op.operands[1].value).toBe(2)
		})

		it('should parse paramIndex with variables', () => {
			const result = parse('$0 + x', precedence)
			expect(result.type).toBe('operation')
			const op = result as any
			expect(op.operator).toBe('+')
			expect(op.operands[0].type).toBe('paramIndex')
			expect(op.operands[0].index).toBe(0)
			expect(op.operands[1].type).toBe('variable')
			expect(op.operands[1].name).toBe('x')
		})

		it('should parse paramIndex in parentheses', () => {
			const result = parse('($0 + $1) * 2', precedence)
			expect(result.type).toBe('operation')
			const op = result as any
			expect(op.operator).toBe('*')
			expect(op.operands[0].type).toBe('operation')
			expect(op.operands[1].type).toBe('number')
			expect(op.operands[1].value).toBe(2)
		})

		it('should parse paramIndex with unary operators', () => {
			const result = parse('-$0', precedence)
			expect(result.type).toBe('prefix')
			const unOp = result as any
			expect(unOp.operator).toBe('-')
			expect(unOp.operand.type).toBe('paramIndex')
			expect(unOp.operand.index).toBe(0)
		})

		it('should parse complex paramIndex expressions', () => {
			const result = parse('$0 * $1 + $2', precedence)
			expect(result.type).toBe('operation')
			const op = result as any
			expect(op.operator).toBe('+')
			expect(op.operands[0].type).toBe('operation')
			expect(op.operands[1].type).toBe('paramIndex')
			expect(op.operands[1].index).toBe(2)
		})

		it('should parse paramIndex with empty operator', () => {
			const result = parse('2$0', precedence)
			expect(result.type).toBe('operation')
			const op = result as any
			expect(op.operator).toBe('*')
			expect(op.operands[0].type).toBe('number')
			expect(op.operands[0].value).toBe(2)
			expect(op.operands[1].type).toBe('paramIndex')
			expect(op.operands[1].index).toBe(0)
		})

		it('should handle paramIndex precedence correctly', () => {
			const result = parse('$0 + $1 * $2', precedence)
			expect(result.type).toBe('operation')
			const op = result as any
			expect(op.operator).toBe('+')
			expect(op.operands[0].type).toBe('paramIndex')
			expect(op.operands[0].index).toBe(0)
			expect(op.operands[1].type).toBe('operation')
			expect(op.operands[1].operator).toBe('*')
		})

		it('should parse multiple paramIndexes in sequence', () => {
			const result = parse('$0$1$2', precedence)
			expect(result.type).toBe('operation')
			const op = result as any
			expect(op.operator).toBe('*')
			expect(op.operands[0].type).toBe('paramIndex')
			expect(op.operands[0].index).toBe(0)
			expect(op.operands[1].index).toBe(1)
			expect(op.operands[2].index).toBe(2)
		})
	})

	describe('ParamIndex error handling', () => {
		it('should throw on invalid paramIndex syntax', () => {
			expect(() => parse('$', precedence)).toThrow('Invalid param index')
		})

		it('should throw on paramIndex with non-numeric index', () => {
			expect(() => parse('$abc', precedence)).toThrow('Invalid param index')
		})

		it('should throw on paramIndex with decimal', () => {
			expect(() => parse('$1.5', precedence)).toThrow('Unexpected operator: .')
		})

		it('should handle paramIndex with leading zeros', () => {
			const result = parse('$001', precedence)
			expect(result.type).toBe('paramIndex')
			expect((result as any).index).toBe(1)
		})

		it('should handle paramIndex with large numbers', () => {
			const result = parse('$999999', precedence)
			expect(result.type).toBe('paramIndex')
			expect((result as any).index).toBe(999999)
		})
	})
})
