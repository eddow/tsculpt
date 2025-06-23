export class ParserError extends Error {
	constructor(message: string, reading: Reading) {
		super(`${reading.source}\n${' '.repeat(reading.index)}^-- ${message}`)
	}
}

export type OperatorPrecedence = {
	operators: { [symbol: string]: 'binary' | 'nary' }[]
	prefix?: string[]
	postfix?: string[]
	emptyOperator?: string
	variables?: true
	paramIndexes?: true
}

type Token = { pos: number } & (
	| { type: 'number'; value: number }
	| { type: 'variable'; name: string }
	| { type: 'paramIndex'; index: number }
	| { type: 'operator'; symbol: string }
	| { type: 'leftParen' }
	| { type: 'rightParen' }
)

export type OperationExpression = { type: 'operation'; operator: string; operands: Expression[] }
export type NumberExpression = { type: 'number'; value: number }
export type VariableExpression = { type: 'variable'; name: string }
export type ParamIndexExpression = { type: 'paramIndex'; index: number }
export type PrefixExpression = { type: 'prefix'; operator: string; operand: Expression }
export type PostfixExpression = { type: 'postfix'; operator: string; operand: Expression }
export type Expression =
	| OperationExpression
	| NumberExpression
	| VariableExpression
	| ParamIndexExpression
	| PrefixExpression
	| PostfixExpression

function tokenize(expr: string, precedence: OperatorPrecedence): Token[] {
	const tokens: Token[] = []
	let i = 0

	while (i < expr.length) {
		const char = expr[i]

		// Skip whitespace
		if (/\s/.test(char)) {
			i++
			continue
		}

		// Handle parentheses
		if (char === '(') {
			tokens.push({ type: 'leftParen', pos: i })
			i++
			continue
		}

		if (char === ')') {
			tokens.push({ type: 'rightParen', pos: i })
			i++
			continue
		}

		// Handle numbers
		if (/\d(\.\d*)?/.test(char)) {
			let numStr = ''
			while (i < expr.length && (/\d/.test(expr[i]) || expr[i] === '.')) {
				numStr += expr[i]
				i++
			}
			tokens.push({ type: 'number', value: Number.parseFloat(numStr), pos: i })
			continue
		}

		if (precedence.variables && /[a-zA-Z_]/.test(char)) {
			let name = ''
			while (i < expr.length && /[a-zA-Z0-9_$]/.test(expr[i])) {
				name += expr[i]
				i++
			}
			tokens.push({ type: 'variable', name, pos: i })
			continue
		}

		if (precedence.paramIndexes && char === '$') {
			i++ // consume the $
			let index = ''
			while (i < expr.length && /\d/.test(expr[i])) {
				index += expr[i]
				i++
			}
			if (index.length === 0)
				throw new ParserError('Invalid param index', { source: expr, index: i - 1, tokens })
			tokens.push({ type: 'paramIndex', index: Number(index), pos: i })
			continue
		}
		const opRegexp = /[^\d\w\s$_()]/
		// Handle operators (single character for now)
		if (opRegexp.test(char)) {
			let operator = ''
			while (i < expr.length && opRegexp.test(expr[i])) {
				operator += expr[i]
				i++
			}

			// Check if this contains multiple postfix operators
			if (precedence.postfix && operator.length > 1) {
				// Try to split into multiple postfix operators
				const sortedPostfix = precedence.postfix.sort((a, b) => b.length - a.length)
				let remaining = operator
				let pos = i - operator.length

				while (remaining.length > 0) {
					let found = false
					for (const postfixOp of sortedPostfix) {
						if (remaining.startsWith(postfixOp)) {
							tokens.push({ type: 'operator', symbol: postfixOp, pos: pos + postfixOp.length })
							remaining = remaining.slice(postfixOp.length)
							pos += postfixOp.length
							found = true
							break
						}
					}
					if (!found) {
						// If no postfix operator matches, treat the rest as a single operator
						tokens.push({ type: 'operator', symbol: remaining, pos: i })
						break
					}
				}
			} else {
				tokens.push({ type: 'operator', symbol: operator, pos: i })
			}
			continue
		}

		// Unknown character
		throw new ParserError(`Unexpected character: ${char}`, { source: expr, index: i, tokens })
	}

	return tokens
}

type Reading = {
	source: string
	tokens: Token[]
	index: number
}

export function parse(expr: string, precedence: OperatorPrecedence): Expression {
	const tokens = tokenize(expr, precedence)
	const reading = { tokens, index: 0, source: expr }
	const result = parseExpression(reading, precedence, 0)
	if (reading.index < tokens.length) {
		const token = tokens[reading.index]
		switch (token.type) {
			case 'leftParen':
				throw new ParserError('Unexpected opening parenthesis', reading)
			case 'rightParen':
				throw new ParserError('Unexpected closing parenthesis', reading)
			case 'number':
				throw new ParserError('Unexpected number', reading)
			case 'variable':
				throw new ParserError('Unexpected variable', reading)
			case 'operator':
				throw new ParserError(`Unexpected operator: ${token.symbol}`, reading)
		}
	}
	return result
}

function parseExpression(
	reading: Reading,
	precedence: OperatorPrecedence,
	precedenceLevel: number
): Expression {
	if (precedenceLevel === precedence.operators.length)
		return parseLowerPrecedence(reading, precedence)

	const operand1 = parseExpression(reading, precedence, precedenceLevel + 1)
	return operateExpression(operand1, reading, precedence, precedenceLevel)
}

function operateExpression(
	operand1: Expression,
	reading: Reading,
	precedence: OperatorPrecedence,
	precedenceLevel: number
): Expression {
	// Check if we have more tokens
	if (reading.index >= reading.tokens.length) {
		return operand1
	}

	let token = reading.tokens[reading.index]
	let empty = false
	const operators = precedence.operators[precedenceLevel]
	const eo = precedence.emptyOperator
	if (
		eo &&
		operators[eo] &&
		['number', 'variable', 'paramIndex', 'leftParen'].includes(token.type)
	) {
		token = { type: 'operator', symbol: eo, pos: token.pos }
		empty = true
	}

	// Only proceed if this is an operator at the current precedence level
	if (token.type !== 'operator' || !operators[token.symbol]) {
		return operand1
	}

	if (!empty) reading.index++ // consume the operator

	if (operators[token.symbol] === 'binary') {
		const operand2 = parseExpression(reading, precedence, precedenceLevel + 1)
		const result: OperationExpression = {
			type: 'operation',
			operator: token.symbol,
			operands: [operand1, operand2],
		}
		return operateExpression(result, reading, precedence, precedenceLevel)
	}
	// For n-ary operators
	const operand2 = parseExpression(reading, precedence, precedenceLevel)
	const operands =
		operand1.type === 'operation' && operand1.operator === token.symbol
			? [...operand1.operands]
			: [operand1]
	// Check if we can combine with an existing operation of the same type
	if (operand2.type === 'operation' && operand2.operator === token.symbol) {
		operands.push(...operand2.operands) // Add to beginning for left associativity
	} else {
		operands.push(operand2)
	}

	return { type: 'operation', operator: token.symbol, operands }
}

function parseLowerPrecedence(reading: Reading, precedence: OperatorPrecedence): Expression {
	const unit = parseUnit(reading, precedence)

	// Handle postfix operators (highest precedence)
	let result = unit
	while (reading.index < reading.tokens.length) {
		const token = reading.tokens[reading.index]
		if (token.type !== 'operator' || !precedence.postfix?.includes(token.symbol)) {
			break
		}
		reading.index++
		result = { type: 'postfix', operator: token.symbol, operand: result }
	}

	return result
}

function parseUnit(reading: Reading, precedence: OperatorPrecedence): Expression {
	const token = reading.tokens[reading.index]
	if (!token) {
		throw new ParserError('Unexpected end of expression', reading)
	}

	switch (token.type) {
		case 'leftParen':
			// Parse expression inside parentheses
			reading.index++ // consume left parenthesis
			const expr = parseExpression(reading, precedence, 0)
			const nextToken = reading.tokens[reading.index]
			if (!nextToken || nextToken.type !== 'rightParen') {
				throw new ParserError('Expected closing parenthesis', reading)
			}
			reading.index++ // consume right parenthesis
			return expr

		case 'number':
			reading.index++
			return { type: 'number', value: token.value }

		case 'variable':
			reading.index++
			return { type: 'variable', name: token.name }

		case 'paramIndex':
			reading.index++
			return { type: 'paramIndex', index: token.index }

		case 'operator':
			// Check if this is a unary operator
			if (precedence.prefix?.includes(token.symbol)) {
				reading.index++
				const operand = parseLowerPrecedence(reading, precedence)
				return { type: 'prefix', operator: token.symbol, operand }
			}
			throw new ParserError(`Unexpected operator: ${token.symbol}`, reading)

		case 'rightParen':
			throw new ParserError('Unexpected closing parenthesis', reading)

		default:
			throw new ParserError(`Unexpected token: ${token}`, reading)
	}
}
