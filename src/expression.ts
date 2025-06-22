export type OperatorPrecedence = {
	operators: { [symbol: string]: 'binary' | 'nary' }[]
	unary: string[]
}

type Token = { pos: number } & (
	| { type: 'number'; value: number }
	| { type: 'variable'; name: string }
	| { type: 'operator'; symbol: string }
	| { type: 'leftParen' }
	| { type: 'rightParen' }
)

type Operation = { type: 'operation'; operator: string; operands: Expression[] }
type Number = { type: 'number'; value: number }
type Variable = { type: 'variable'; name: string }
type UnaryOperator = { type: 'unaryOperator'; operator: string; operand: Expression }
type Expression = Operation | Number | Variable | UnaryOperator

function tokenize(expr: string): Token[] {
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
			tokens.push({ type: 'number', value: parseFloat(numStr), pos: i })
			continue
		}

		// Handle variables and operators
		if (/[a-zA-Z_$]/.test(char)) {
			let name = ''
			while (i < expr.length && /[a-zA-Z0-9_$]/.test(expr[i])) {
				name += expr[i]
				i++
			}
			tokens.push({ type: 'variable', name, pos: i })
			continue
		}

		// Handle operators (single character for now)
		if (/[^\d\w\s()]/.test(char)) {
			let operator = ''
			while (i < expr.length && /[^\d\w\s()]/.test(expr[i])) {
				operator += expr[i]
				i++
			}
			tokens.push({ type: 'operator', symbol: operator, pos: i })
			continue
		}

		// Unknown character
		throw new Error(`Unexpected character: ${char}`)
	}

	return tokens
}

type Reading = {
	tokens: Token[]
	index: number
}

export function parse(expr: string, precedence: OperatorPrecedence): Expression {
	const tokens = tokenize(expr)
	const reading = { tokens, index: 0 }
	const result = parseExpression(reading, precedence, 0)
	if (reading.index < tokens.length) {
		const token = tokens[reading.index]
		switch(token.type) {
			case 'leftParen': throw new Error('Unexpected closing parenthesis')
			case 'rightParen': throw new Error('Unexpected closing parenthesis')
			case 'number': throw new Error('Unexpected number')
			case 'variable': throw new Error('Unexpected variable')
			case 'operator': throw new Error(`Unexpected operator: ${token.symbol}`)
		}
	}
	return result
}

function parseExpression(reading: Reading, precedence: OperatorPrecedence, precedenceLevel: number): Expression {
	if(precedenceLevel === precedence.operators.length)
		return parseLowerPrecedence(reading, precedence)

	const operand1 = parseExpression(reading, precedence, precedenceLevel + 1)
	return operateExpression(operand1, reading, precedence, precedenceLevel)
}

function operateExpression(operand1: Expression, reading: Reading, precedence: OperatorPrecedence, precedenceLevel: number): Expression {
	// Check if we have more tokens
	if (reading.index >= reading.tokens.length) {
		return operand1
	}

	const token = reading.tokens[reading.index]
	const operators = precedence.operators[precedenceLevel]

	// Only proceed if this is an operator at the current precedence level
	if (token.type !== 'operator') {
		return operand1
	}
/*
	// Check if this operator is known at any precedence level
	const isKnownOperator = precedence.operators.some(level => token.symbol in level) || precedence.unary.includes(token.symbol)
	if (!isKnownOperator) {
		throw new Error(`Unexpected character: ${token.symbol}`)
	}*/

	if (!operators[token.symbol]) {
		return operand1
	}

	reading.index++ // consume the operator

	if(operators[token.symbol] === 'binary') {
		const operand2 = parseExpression(reading, precedence, precedenceLevel+1)
		const result: Operation = { type: 'operation', operator: token.symbol, operands: [operand1, operand2] }
		return operateExpression(result, reading, precedence, precedenceLevel)
	}

	// For n-ary operators
	const operand2 = parseExpression(reading, precedence, precedenceLevel)

	// Check if we can combine with an existing operation of the same type
	if(operand2.type === 'operation' && operand2.operator === token.symbol) {
		operand2.operands.unshift(operand1) // Add to beginning for left associativity
		return operand2
	}

	return { type: 'operation', operator: token.symbol, operands: [operand1, operand2] }
}

function parseLowerPrecedence(reading: Reading, precedence: OperatorPrecedence): Expression {
	const token = reading.tokens[reading.index]
	if (!token) {
		throw new Error('Unexpected end of expression')
	}

	switch (token.type) {
		case 'leftParen':
			// Parse expression inside parentheses
			reading.index++ // consume left parenthesis
			const expr = parseExpression(reading, precedence, 0)
			const nextToken = reading.tokens[reading.index]
			if (!nextToken || nextToken.type !== 'rightParen') {
				throw new Error('Expected closing parenthesis')
			}
			reading.index++ // consume right parenthesis
			return expr

		case 'number':
			reading.index++
			return { type: 'number', value: token.value }

		case 'variable':
			reading.index++
			return { type: 'variable', name: token.name }

		case 'operator':
			// Check if this is a unary operator
			if (precedence.unary.includes(token.symbol)) {
				reading.index++
				const operand = parseLowerPrecedence(reading, precedence)
				return { type: 'unaryOperator', operator: token.symbol, operand }
			}
			throw new Error(`Unexpected operator: ${token.symbol}`)

		case 'rightParen':
			throw new Error('Unexpected closing parenthesis')

		default:
			throw new Error(`Unexpected token: ${token}`)
	}
}

