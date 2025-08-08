export class ParserError<Built> extends Error {
	constructor(message: string, reading: Reading<Built>) {
		super(`${reading.source}\n${' '.repeat(reading.index)}^-- ${message}`)
	}
}

export type OperationExpression<Built> = {
	type: 'operation'
	operator: string
	operands: AST<Built>[]
}
export type BuiltExpression<Built> = { type: 'built'; value: Built }
export type AST<Built> = OperationExpression<Built> | BuiltExpression<Built>
interface Surrounding<Built> {
	open: string
	close: string
	build?: (operand: Built) => Built
}
export type ParseSpecs<Built> = {
	precedence: { [symbol: string]: 'binary' | 'nary' }[]
	operations: { [symbol: string]: (...operands: Built[]) => Built }
	prefix?: Record<string, (operand: Built) => Built>
	postfix?: Record<string, (operand: Built) => Built>
	emptyOperator?: string
	atomics: { rex: RegExp; build: (match: RegExpMatchArray) => Built }[]
	surroundings: Surrounding<Built>[]
}

type Token<Built> = { pos: number } & (
	| { type: 'atomic'; value: Built }
	| { type: 'operator'; symbol: string }
	| { type: 'open'; symbol: string }
	| { type: 'close'; symbol: string }
)

type Reading<Built> = {
	source: string
	tokens: Token<Built>[]
	index: number
}

export class Parser<Built> {
	private opRegexp: RegExp
	private surroundings: Record<string, Surrounding<Built>> = {}
	constructor(private readonly specs: ParseSpecs<Built>) {
		const operators = new Set<string>()
		for (const op in this.specs.operations) operators.add(op)
		for (const op in this.specs.prefix) operators.add(op)
		for (const op in this.specs.postfix) operators.add(op)
		const surrounding = new Set<string>()
		for (const { open, close, build } of this.specs.surroundings) {
			surrounding.add(open)
			surrounding.add(close)
			this.surroundings[open] = { open, close, build }
		}

		this.opRegexp = new RegExp(
			`(${[...Array.from(operators), ...Array.from(surrounding)]
				.sort((a, b) => b.length - a.length)
				.map((op) => op.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
				.join(')|(')})`,
			'y'
		)

		for (const atomic of this.specs.atomics)
			if (!atomic.rex.flags.includes('y'))
				atomic.rex = new RegExp(atomic.rex.source, `y${atomic.rex.flags}`)
	}

	public parse(expr: string): Built {
		const tokens = this.tokenize(expr)
		const reading = { tokens, index: 0, source: expr }
		const result = this.parseExpression(reading, 0)
		if (reading.index < tokens.length) {
			throw new ParserError('Expected end of expression', reading)
		}
		return this.build(result)
	}
	private tokenize(expr: string): Token<Built>[] {
		const tokens: Token<Built>[] = []
		let i = 0
		const operators = new Set<string>()
		for (const op in this.specs.operations) operators.add(op)
		for (const op in this.specs.prefix) operators.add(op)
		for (const op in this.specs.postfix) operators.add(op)
		const surrounding = new Set<string>()
		for (const { open, close } of this.specs.surroundings) {
			surrounding.add(open)
			surrounding.add(close)
		}

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
			for (const atomic of this.specs.atomics)
				if (tokenCase(atomic.rex, (match) => ({ type: 'atomic', value: atomic.build(match) }))) {
					found = true
					break
				}
			if (found) continue
			// Handle operators (single character for now)
			this.opRegexp.lastIndex = i
			const match = this.opRegexp.exec(expr)
			if (match) {
				const operator = match[0]
				i += operator.length

				// Check if this is a surrounding token (parentheses, etc.)
				const surrounding = this.specs.surroundings.find(
					(s) => s.open === operator || s.close === operator
				)
				if (surrounding) {
					if (surrounding.open === operator) {
						tokens.push({ type: 'open', symbol: operator, pos: i - operator.length })
					} else {
						tokens.push({ type: 'close', symbol: operator, pos: i - operator.length })
					}
					continue
				}

				// Check if this contains multiple postfix operators
				if (this.specs.postfix && operator.length > 1) {
					// Try to split into multiple postfix operators
					const sortedPostfix = Object.keys(this.specs.postfix).sort((a, b) => b.length - a.length)
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
				throw new ParserError(`Unexpected character: ${expr[i]}`, {
					source: expr,
					index: i,
					tokens,
				})
		}

		return tokens
	}

	private build(parsed: AST<Built>): Built {
		if (parsed.type === 'built') return parsed.value
		if (parsed.type === 'operation')
			return this.specs.operations[parsed.operator](
				...parsed.operands.map((operand) => this.build(operand))
			)
		throw new Error('Invalid parsed expression')
	}

	private parseExpression(reading: Reading<Built>, precedenceLevel: number): AST<Built> {
		if (precedenceLevel === this.specs.precedence.length) return this.parseLowerPrecedence(reading)

		const operand1 = this.parseExpression(reading, precedenceLevel + 1)
		return this.operateExpression(operand1, reading, precedenceLevel)
	}

	private operateExpression(
		operand1: AST<Built>,
		reading: Reading<Built>,
		precedenceLevel: number
	): AST<Built> {
		// Check if we have more tokens
		if (reading.index >= reading.tokens.length) {
			return operand1
		}

		let token = reading.tokens[reading.index]
		let empty = false
		const operators = this.specs.precedence[precedenceLevel]
		const eo = this.specs.emptyOperator
		if (eo && operators[eo] && ['atomic', 'open'].includes(token.type)) {
			token = { type: 'operator', symbol: eo, pos: token.pos }
			empty = true
		}

		// Only proceed if this is an operator at the current precedence level
		if (token.type !== 'operator' || !operators[token.symbol]) {
			return operand1
		}

		if (!empty) reading.index++ // consume the operator

		if (operators[token.symbol] === 'binary') {
			const operand2 = this.parseExpression(reading, precedenceLevel + 1)
			const result: OperationExpression<Built> = {
				type: 'operation',
				operator: token.symbol,
				operands: [operand1, operand2],
			}
			return this.operateExpression(result, reading, precedenceLevel)
		}
		// For n-ary operators
		const operand2 = this.parseExpression(reading, precedenceLevel)
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

	private parseLowerPrecedence(reading: Reading<Built>): AST<Built> {
		const unit = this.parseUnit(reading)

		// Handle postfix operators (highest precedence)
		let result = unit
		while (reading.index < reading.tokens.length) {
			const token = reading.tokens[reading.index]
			const postfix = token.type === 'operator' && this.specs.postfix?.[token.symbol]
			if (!postfix) break
			reading.index++
			result = { type: 'built', value: postfix(this.build(result)) }
		}

		return result
	}

	private parseUnit(reading: Reading<Built>): AST<Built> {
		const token = reading.tokens[reading.index]
		if (!token) {
			throw new ParserError('Unexpected end of expression', reading)
		}

		switch (token.type) {
			case 'open': {
				// Parse expression inside parentheses
				reading.index++ // consume left parenthesis
				const expr = this.parseExpression(reading, 0)
				const nextToken = reading.tokens[reading.index]
				const { close, build } = this.surroundings[token.symbol]
				if (!nextToken || nextToken.type !== 'close' || nextToken.symbol !== close) {
					throw new ParserError(`Expected closing '${close}'`, reading)
				}
				reading.index++ // consume right parenthesis

				return { type: 'built', value: build ? build(this.build(expr)) : this.build(expr) }
			}

			case 'atomic':
				reading.index++
				return { type: 'built', value: token.value }

			case 'operator': {
				// Check if this is a unary operator
				const prefix = this.specs.prefix?.[token.symbol]
				if (prefix) {
					reading.index++
					const operand = this.parseLowerPrecedence(reading)
					return { type: 'built', value: prefix(this.build(operand)) }
				}
				throw new ParserError(`Unexpected operator: ${token.symbol}`, reading)
			}
			default:
				throw new ParserError(`Unexpected token: ${token.type}`, reading)
		}
	}
}
