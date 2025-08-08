import { describe, expect, it } from 'vitest'
import { Parser } from './expression'

type BinaryExpression =
	| { '-': { left: ParsedExpression; right: ParsedExpression } }
	| { '/': { left: ParsedExpression; right: ParsedExpression } }
type NaryExpression =
	| { '+': ParsedExpression[] }
	| { '*': ParsedExpression[] }
	| { '^': ParsedExpression[] }
type NumberExpression = { number: number }
type VariableExpression = { variable: string }
type ParamExpression = { param: number }
type PrefixExpression = { '-': ParsedExpression }
type PostfixExpression = { '!': ParsedExpression } | { '++': ParsedExpression }
type SurroundedExpression = { '[.]': ParsedExpression }
type ParsedExpression =
	| NaryExpression
	| BinaryExpression
	| NumberExpression
	| VariableExpression
	| ParamExpression
	| PrefixExpression
	| PostfixExpression
	| SurroundedExpression

describe('Expression Parser', () => {
	// Define a simple precedence table for testing
	const parser = new Parser<ParsedExpression>({
		precedence: [{ '+': 'nary', '-': 'binary' }, { '*': 'nary', '/': 'binary' }, { '^': 'binary' }],
		prefix: { '-': (operand) => ({ '-': operand }) },
		postfix: {
			'!': (operand) => ({ '!': operand }),
			'++': (operand) => ({ '++': operand }),
		},
		operations: {
			'+': (...operands) => ({ '+': operands }),
			'-': (...operands) => {
				expect(operands.length).toBe(2)
				return { '-': { left: operands[0], right: operands[1] } }
			},
			'*': (...operands) => ({ '*': operands }),
			'/': (left, right) => ({ '/': { left, right } }),
			'^': (...operands) => ({ '^': operands }),
		},
		emptyOperator: '*',
		atomics: [
			{ rex: /\d+(:?\.\d+)?/, build: (match) => ({ number: Number(match[0]) }) },
			{ rex: /[a-zA-Z_][a-zA-Z0-9_]*/, build: (match) => ({ variable: match[0] }) },
			{
				rex: /\$\d+/,
				build: (match) => ({ param: Number(match[0].slice(1)) }),
			},
		],
		surroundings: [
			{
				open: '(',
				close: ')',
				build: (operand) => operand,
			},
			{
				open: '[',
				close: ']',
				build: (operand) => ({ '[.]': operand }),
			},
		],
	})

	describe('Number parsing', () => {
		it('should parse simple numbers', () => {
			const result = parser.parse('42')
			expect(result).toEqual({ number: 42 })
		})

		it('should parse decimal numbers', () => {
			const result = parser.parse('3.14')
			expect(result).toEqual({ number: 3.14 })
		})

		it('should parse zero', () => {
			const result = parser.parse('0')
			expect(result).toEqual({ number: 0 })
		})
	})

	describe('Variable parsing', () => {
		it('should parse simple variables', () => {
			const result = parser.parse('x')
			expect(result).toEqual({ variable: 'x' })
		})

		it('should parse multi-character variables', () => {
			const result = parser.parse('variable')
			expect(result).toEqual({ variable: 'variable' })
		})

		it('should parse variables with numbers', () => {
			const result = parser.parse('var123')
			expect(result).toEqual({ variable: 'var123' })
		})

		it('should parse variables starting with underscore', () => {
			const result = parser.parse('_private')
			expect(result).toEqual({ variable: '_private' })
		})
	})

	describe('Binary operator parsing', () => {
		it('should handle left associativity for same precedence', () => {
			const result = parser.parse('1 - 2 - 3')
			expect(result).toEqual({
				'-': {
					left: { '-': { left: { number: 1 }, right: { number: 2 } } },
					right: { number: 3 },
				},
			})
		})
	})

	describe('N-ary operator parsing', () => {
		it('should parse multiple additions as n-ary', () => {
			const result = parser.parse('1 + 2 + 3')
			expect(result).toEqual({
				'+': [{ number: 1 }, { number: 2 }, { number: 3 }],
			})
		})

		it('should parse multiple multiplications as n-ary', () => {
			const result = parser.parse('2 * 3 * 4')
			expect(result).toEqual({
				'*': [{ number: 2 }, { number: 3 }, { number: 4 }],
			})
		})

		it('should handle mixed n-ary and binary operators', () => {
			const result = parser.parse('1 + 2 + 3 * 4')
			expect(result).toEqual({
				'+': [{ number: 1 }, { number: 2 }, { '*': [{ number: 3 }, { number: 4 }] }],
			})
		})

		it('should handle n-ary operators with variables', () => {
			const result = parser.parse('a + b + c')
			expect(result).toEqual({
				'+': [{ variable: 'a' }, { variable: 'b' }, { variable: 'c' }],
			})
		})
	})

	describe('Prefix operator parsing', () => {
		it('should parse unary minus', () => {
			const result = parser.parse('-5')
			expect(result).toEqual({
				'-': { number: 5 },
			})
		})

		it('should handle unary minus with higher precedence', () => {
			const result = parser.parse('-5 * 3')
			expect(result).toEqual({
				'*': [{ '-': { number: 5 } }, { number: 3 }],
			})
		})
	})

	describe('Postfix operator parsing', () => {
		it('should parse a single postfix operator', () => {
			const result = parser.parse('5!')
			expect(result).toEqual({
				'!': { number: 5 },
			})
		})

		it('should parse multiple postfix operators', () => {
			const result = parser.parse('5!++')
			expect(result).toEqual({
				'++': { '!': { number: 5 } },
			})
		})

		it('should handle postfix expressions with prefix operators', () => {
			const result = parser.parse('-5!')
			expect(result).toEqual({
				'-': { '!': { number: 5 } },
			})
		})

		it('should handle postfix expressions with variables', () => {
			const result = parser.parse('x!')
			expect(result).toEqual({
				'!': { variable: 'x' },
			})
		})

		it('should handle postfix expressions with parentheses', () => {
			const result = parser.parse('(1 + 2)!')
			expect(result).toEqual({
				'!': { '+': [{ number: 1 }, { number: 2 }] },
			})
		})

		it('should handle postfix expressions with parameter indices', () => {
			const result = parser.parse('$0!')
			expect(result).toEqual({
				'!': { param: 0 },
			})
		})
	})

	describe('Parentheses parsing', () => {
		it('should parse simple parentheses', () => {
			const result = parser.parse('(1 + 2)')
			expect(result).toEqual({
				'+': [{ number: 1 }, { number: 2 }],
			})
		})

		it('should override operator precedence with parentheses', () => {
			const result = parser.parse('(1 + 2) * 3')
			expect(result).toEqual({
				'*': [{ '+': [{ number: 1 }, { number: 2 }] }, { number: 3 }],
			})
		})

		it('should handle nested parentheses', () => {
			const result = parser.parse('((1 + 2) * 3) + 4')
			expect(result).toEqual({
				'+': [{ '*': [{ '+': [{ number: 1 }, { number: 2 }] }, { number: 3 }] }, { number: 4 }],
			})
		})

		it('should handle complex nested expressions', () => {
			const result = parser.parse('(a + b) * (c - d)')
			expect(result).toEqual({
				'*': [
					{ '+': [{ variable: 'a' }, { variable: 'b' }] },
					{ '-': { left: { variable: 'c' }, right: { variable: 'd' } } },
				],
			})
		})
	})

	describe('Complex expressions', () => {
		it('should handle complex expression with all operators', () => {
			const result = parser.parse('-a! + b * (c - d)')
			expect(result).toEqual({
				'+': [
					{ '-': { '!': { variable: 'a' } } },
					{
						'*': [
							{ variable: 'b' },
							{ '-': { left: { variable: 'c' }, right: { variable: 'd' } } },
						],
					},
				],
			})
		})

		it('should handle expression with parameter indices', () => {
			const result = parser.parse('$0 + $1 * $2')
			expect(result).toEqual({
				'+': [{ param: 0 }, { '*': [{ param: 1 }, { param: 2 }] }],
			})
		})

		it('should handle mixed numbers and variables', () => {
			const result = parser.parse('2 * x + 3 * y')
			expect(result).toEqual({
				'+': [
					{ '*': [{ number: 2 }, { variable: 'x' }] },
					{ '*': [{ number: 3 }, { variable: 'y' }] },
				],
			})
		})

		it('should handle expression with unary and binary operators', () => {
			const result = parser.parse('-x + y * 2')
			expect(result).toEqual({
				'+': [{ '-': { variable: 'x' } }, { '*': [{ variable: 'y' }, { number: 2 }] }],
			})
		})

		it('should handle whitespace correctly', () => {
			const result1 = parser.parse('1+2')
			const result2 = parser.parse('1 + 2')
			const result3 = parser.parse(' 1 + 2 ')
			expect(result1).toEqual({ '+': [{ number: 1 }, { number: 2 }] })
			expect(result2).toEqual({ '+': [{ number: 1 }, { number: 2 }] })
			expect(result3).toEqual({ '+': [{ number: 1 }, { number: 2 }] })
		})
	})

	describe('Error handling', () => {
		it('should throw on mismatched parentheses', () => {
			expect(() => parser.parse('(1 + 2')).toThrow("Expected closing ')'")
			expect(() => parser.parse('1 + 2)')).toThrow('Expected end of expression')
		})

		it('should throw on unknown operators', () => {
			expect(() => parser.parse('1 @ 2')).toThrow('Unexpected character: @')
		})

		it('should throw on invalid expressions', () => {
			expect(() => parser.parse('1 +')).toThrow('Unexpected end of expression')
			expect(() => parser.parse('+ 1')).toThrow('Unexpected operator: +')
		})

		it('should throw on not enough operands', () => {
			// This would be caught during operator application
			expect(() => parser.parse('1 + + 2')).toThrow('Unexpected operator: +')
		})
	})

	describe('Operator precedence', () => {
		it('should respect multiplication over addition', () => {
			const result = parser.parse('1 + 2 * 3')
			expect(result).toEqual({
				'+': [{ number: 1 }, { '*': [{ number: 2 }, { number: 3 }] }],
			})
		})

		it('should respect exponentiation over multiplication', () => {
			const result = parser.parse('2 * 3 ^ 2')
			expect(result).toEqual({
				'*': [{ number: 2 }, { '^': [{ number: 3 }, { number: 2 }] }],
			})
		})

		it('should handle unary minus with highest precedence', () => {
			const result = parser.parse('-2 + 3')
			expect(result).toEqual({
				'+': [{ '-': { number: 2 } }, { number: 3 }],
			})
		})
	})

	describe('Edge cases', () => {
		it('should handle single variable', () => {
			const result = parser.parse('x')
			expect(result).toEqual({ variable: 'x' })
		})

		it('should handle empty parentheses', () => {
			expect(() => parser.parse('()')).toThrow('Unexpected token: close')
		})

		it('should handle multiple spaces', () => {
			const result = parser.parse('  1   +   2  ')
			expect(result).toEqual({
				'+': [{ number: 1 }, { number: 2 }],
			})
		})
	})

	describe('Empty operator parsing', () => {
		it('should handle empty operator for implicit multiplication', () => {
			const result = parser.parse('2x')
			expect(result).toEqual({
				'*': [{ number: 2 }, { variable: 'x' }],
			})
		})

		it('should handle empty operator with parentheses', () => {
			const result = parser.parse('3(x+1)')
			expect(result).toEqual({
				'*': [{ number: 3 }, { '+': [{ variable: 'x' }, { number: 1 }] }],
			})
		})

		it('should handle multiple empty operators', () => {
			const result = parser.parse('2x 3y')
			expect(result).toEqual({
				'*': [{ number: 2 }, { variable: 'x' }, { number: 3 }, { variable: 'y' }],
			})
		})

		it('should respect precedence with empty operator', () => {
			const result = parser.parse('2x + 3y')
			expect(result).toEqual({
				'+': [
					{ '*': [{ number: 2 }, { variable: 'x' }] },
					{ '*': [{ number: 3 }, { variable: 'y' }] },
				],
			})
		})

		it('should handle empty operator with unary operators', () => {
			const result = parser.parse('-2x')
			expect(result).toEqual({
				'*': [{ '-': { number: 2 } }, { variable: 'x' }],
			})
		})

		it('should cumulate also empty operator', () => {
			const result = parser.parse('-2x*3y')
			expect(result).toEqual({
				'*': [{ '-': { number: 2 } }, { variable: 'x' }, { number: 3 }, { variable: 'y' }],
			})
		})

		it('should handle empty operator with complex expressions', () => {
			const result = parser.parse('2(x+y)')
			expect(result).toEqual({
				'*': [{ number: 2 }, { '+': [{ variable: 'x' }, { variable: 'y' }] }],
			})
		})

		it('should handle empty operator precedence correctly', () => {
			const result = parser.parse('2x^2')
			expect(result).toEqual({
				'*': [{ number: 2 }, { '^': [{ variable: 'x' }, { number: 2 }] }],
			})
		})
	})

	describe('Param parsing', () => {
		it('should parse simple param', () => {
			const result = parser.parse('$0')
			expect(result).toEqual({ param: 0 })
		})

		it('should parse multi-digit param', () => {
			const result = parser.parse('$42')
			expect(result).toEqual({ param: 42 })
		})

		it('should parse param with operations', () => {
			const result = parser.parse('$0 + $1')
			expect(result).toEqual({
				'+': [{ param: 0 }, { param: 1 }],
			})
		})

		it('should parse param with numbers', () => {
			const result = parser.parse('$0 * 2')
			expect(result).toEqual({
				'*': [{ param: 0 }, { number: 2 }],
			})
		})

		it('should parse param with variables', () => {
			const result = parser.parse('$0 + x')
			expect(result).toEqual({
				'+': [{ param: 0 }, { variable: 'x' }],
			})
		})

		it('should parse param in parentheses', () => {
			const result = parser.parse('($0 + $1) * 2')
			expect(result).toEqual({
				'*': [{ '+': [{ param: 0 }, { param: 1 }] }, { number: 2 }],
			})
		})

		it('should parse param with unary operators', () => {
			const result = parser.parse('-$0')
			expect(result).toEqual({ '-': { param: 0 } })
		})

		it('should parse complex param expressions', () => {
			const result = parser.parse('$0 * $1 + $2')
			expect(result).toEqual({
				'+': [{ '*': [{ param: 0 }, { param: 1 }] }, { param: 2 }],
			})
		})

		it('should parse param with empty operator', () => {
			const result = parser.parse('2$0')
			expect(result).toEqual({
				'*': [{ number: 2 }, { param: 0 }],
			})
		})

		it('should handle param precedence correctly', () => {
			const result = parser.parse('$0 + $1 * $2')
			expect(result).toEqual({
				'+': [{ param: 0 }, { '*': [{ param: 1 }, { param: 2 }] }],
			})
		})

		it('should parse multiple params in sequence', () => {
			const result = parser.parse('$0$1$2')
			expect(result).toEqual({
				'*': [{ param: 0 }, { param: 1 }, { param: 2 }],
			})
		})
	})

	describe('Surrounding tokens', () => {
		it('should parse [.] surrounding tokens', () => {
			const result = parser.parse('[x + y]')
			expect(result).toEqual({
				'[.]': { '+': [{ variable: 'x' }, { variable: 'y' }] },
			})
		})

		it('should parse nested [.] surrounding tokens', () => {
			const result = parser.parse('[[x]]')
			expect(result).toEqual({
				'[.]': { '[.]': { variable: 'x' } },
			})
		})

		it('should parse [.] with complex expressions', () => {
			const result = parser.parse('[x * y + z]')
			expect(result).toEqual({
				'[.]': { '+': [{ '*': [{ variable: 'x' }, { variable: 'y' }] }, { variable: 'z' }] },
			})
		})

		it('should handle [.] with numbers', () => {
			const result = parser.parse('[42]')
			expect(result).toEqual({
				'[.]': { number: 42 },
			})
		})

		it('should handle [.] with variables', () => {
			const result = parser.parse('[x]')
			expect(result).toEqual({
				'[.]': { variable: 'x' },
			})
		})

		it('should handle [.] with unary operators', () => {
			const result = parser.parse('[-x]')
			expect(result).toEqual({
				'[.]': { '-': { variable: 'x' } },
			})
		})

		it('should handle [.] with postfix operators', () => {
			const result = parser.parse('[x!]')
			expect(result).toEqual({
				'[.]': { '!': { variable: 'x' } },
			})
		})

		it('should handle [.] with paramIndex', () => {
			const result = parser.parse('[$0]')
			expect(result).toEqual({
				'[.]': { param: 0 },
			})
		})

		it('should handle mixed surrounding tokens', () => {
			const result = parser.parse('([x + y])')
			expect(result).toEqual({
				'[.]': { '+': [{ variable: 'x' }, { variable: 'y' }] },
			})
		})

		it('should handle [.] with empty operator', () => {
			const result = parser.parse('2[x]')
			expect(result).toEqual({
				'*': [{ number: 2 }, { '[.]': { variable: 'x' } }],
			})
		})
	})

	describe('Surrounding error handling', () => {
		it('should throw on mismatched [.] tokens', () => {
			expect(() => parser.parse('[x + y')).toThrow('Expected closing')
			expect(() => parser.parse('x + y]')).toThrow('Expected end of expression')
		})

		it('should throw on empty [.] tokens', () => {
			expect(() => parser.parse(']')).toThrow('Unexpected token: close')
		})
	})
})
