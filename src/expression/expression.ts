export class ParserError<Built> extends Error {
	constructor(message: string, reading: Reading<Built>) {
		super(`${reading.source}\n${' '.repeat(reading.index)}^-- ${message}`)
	}
}

export type OperationExpression<Built> = {
	type: 'operation'
	operator: string
	operands: ParsedExpression<Built>[]
}
export type BuiltExpression<Built> = { type: 'built'; value: Built }
export type ParsedExpression<Built> = OperationExpression<Built> | BuiltExpression<Built>

export type OperatorPrecedence<Built> = {
	operators: { [symbol: string]: 'binary' | 'nary' }[]
	operations: { [symbol: string]: (...operands: Built[]) => Built }
	prefix?: Record<string, (operand: Built) => Built>
	postfix?: Record<string, (operand: Built) => Built>
	emptyOperator?: string
	atomics: { rex: RegExp; build: (match: RegExpMatchArray) => Built }[]
}

type Token<Built> = { pos: number } & (
	| { type: 'atomic'; value: Built }
	| { type: 'operator'; symbol: string }
	| { type: 'leftParen' }
	| { type: 'rightParen' }
)

function tokenize<Built>(expr: string, precedence: OperatorPrecedence<Built>): Token<Built>[] {
	const tokens: Token<Built>[] = []
	let i = 0
	const operators = new Set<string>()
	for (const op in precedence.operations) operators.add(op)
	for (const op in precedence.prefix) operators.add(op)
	for (const op in precedence.postfix) operators.add(op)

	const opRegexp = new RegExp(
		`(${Array.from(operators)
			.sort((a, b) => b.length - a.length)
			.map((op) => op.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
			.join(')|(')})`,
		'y'
	)

	for (const atomic of precedence.atomics)
		if (!atomic.rex.flags.includes('y'))
			atomic.rex = new RegExp(atomic.rex.source, `y${atomic.rex.flags}`)

	function tokenCase(
		rex: RegExp,
		tokenizer?: Partial<Token<Built>> | ((match: RegExpMatchArray) => Partial<Token<Built>>)
	): true | undefined {
		rex.lastIndex = i
		const match = rex.exec(expr)
		if (match) {
			if (tokenizer)
				tokens.push({
					...(typeof tokenizer === 'function' ? tokenizer(match) : tokenizer),
					pos: i,
				} as Token<Built>)
			i += match[0].length
			return true
		}
	}

	while (i < expr.length) {
		let found = false
		// Skip whitespace
		if (tokenCase(/\s+/y)) continue

		if (tokenCase(/\(/y, { type: 'leftParen' })) continue
		if (tokenCase(/\)/y, { type: 'rightParen' })) continue
		for (const atomic of precedence.atomics)
			if (tokenCase(atomic.rex, (match) => ({ type: 'atomic', value: atomic.build(match) }))) {
				found = true
				break
			}
		if (found) continue
		// Handle operators (single character for now)
		opRegexp.lastIndex = i
		const match = opRegexp.exec(expr)
		if (match) {
			const operator = match[0]
			i += operator.length

			// Check if this contains multiple postfix operators
			if (precedence.postfix && operator.length > 1) {
				// Try to split into multiple postfix operators
				const sortedPostfix = Object.keys(precedence.postfix).sort((a, b) => b.length - a.length)
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
		if (!found)
			throw new ParserError(`Unexpected character: ${expr[i]}`, { source: expr, index: i, tokens })
	}

	return tokens
}

type Reading<Built> = {
	source: string
	tokens: Token<Built>[]
	index: number
}

function build<Built>(
	parsed: ParsedExpression<Built>,
	precedence: OperatorPrecedence<Built>
): Built {
	if (parsed.type === 'built') return parsed.value
	if (parsed.type === 'operation')
		return precedence.operations[parsed.operator](
			...parsed.operands.map((operand) => build(operand, precedence))
		)
	throw new Error('Invalid parsed expression')
}

export function parse<Built>(expr: string, precedence: OperatorPrecedence<Built>): Built {
	const tokens = tokenize(expr, precedence)
	const reading = { tokens, index: 0, source: expr }
	const result = parseExpression(reading, precedence, 0)
	if (reading.index < tokens.length) {
		throw new ParserError('Expected end of expression', reading)
	}
	return build(result, precedence)
}

function parseExpression<Built>(
	reading: Reading<Built>,
	precedence: OperatorPrecedence<Built>,
	precedenceLevel: number
): ParsedExpression<Built> {
	if (precedenceLevel === precedence.operators.length)
		return parseLowerPrecedence(reading, precedence)

	const operand1 = parseExpression(reading, precedence, precedenceLevel + 1)
	return operateExpression(operand1, reading, precedence, precedenceLevel)
}

function operateExpression<Built>(
	operand1: ParsedExpression<Built>,
	reading: Reading<Built>,
	precedence: OperatorPrecedence<Built>,
	precedenceLevel: number
): ParsedExpression<Built> {
	// Check if we have more tokens
	if (reading.index >= reading.tokens.length) {
		return operand1
	}

	let token = reading.tokens[reading.index]
	let empty = false
	const operators = precedence.operators[precedenceLevel]
	const eo = precedence.emptyOperator
	if (eo && operators[eo] && ['atomic', 'leftParen'].includes(token.type)) {
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
		const result: OperationExpression<Built> = {
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

function parseLowerPrecedence<Built>(
	reading: Reading<Built>,
	precedence: OperatorPrecedence<Built>
): ParsedExpression<Built> {
	const unit = parseUnit(reading, precedence)

	// Handle postfix operators (highest precedence)
	let result = unit
	while (reading.index < reading.tokens.length) {
		const token = reading.tokens[reading.index]
		const postfix = token.type === 'operator' && precedence.postfix?.[token.symbol]
		if (!postfix) break
		reading.index++
		result = { type: 'built', value: postfix(build(result, precedence)) }
	}

	return result
}

function parseUnit<Built>(
	reading: Reading<Built>,
	precedence: OperatorPrecedence<Built>
): ParsedExpression<Built> {
	const token = reading.tokens[reading.index]
	if (!token) {
		throw new ParserError('Unexpected end of expression', reading)
	}

	switch (token.type) {
		case 'leftParen': {
			// Parse expression inside parentheses
			reading.index++ // consume left parenthesis
			const expr = parseExpression(reading, precedence, 0)
			const nextToken = reading.tokens[reading.index]
			if (!nextToken || nextToken.type !== 'rightParen') {
				throw new ParserError('Expected closing parenthesis', reading)
			}
			reading.index++ // consume right parenthesis
			return expr
		}

		case 'atomic':
			reading.index++
			return { type: 'built', value: token.value }

		case 'operator': {
			// Check if this is a unary operator
			const prefix = precedence.prefix?.[token.symbol]
			if (prefix) {
				reading.index++
				const operand = parseLowerPrecedence(reading, precedence)
				return { type: 'built', value: prefix(build(operand, precedence)) }
			}
			throw new ParserError(`Unexpected operator: ${token.symbol}`, reading)
		}
		case 'rightParen':
			throw new ParserError('Unexpected closing parenthesis', reading)

		default:
			throw new ParserError(`Unexpected token: ${token}`, reading)
	}
}
export function cachedParser<Value, Cached, Result>(
	precedence: OperatorPrecedence<Cached>,
	calculus: (cached: Cached, values: Value[]) => Result
): (expr: TemplateStringsArray, ...values: Value[]) => Result {
	const cache = new WeakMap<TemplateStringsArray, Cached>()
	return (expr: TemplateStringsArray, ...values: Value[]) => {
		let cached = cache.get(expr)
		if (!cached) {
			const parts = [...expr]
			const last = parts.pop()
			const $ = parts.map((part, i) => `${part} $${i}`)
			const constructed = [...$, last].join('')
			cached = parse(constructed, precedence)
			cache.set(expr, cached)
		}
		return calculus(cached, values)
	}
}
