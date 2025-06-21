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
		for (let part of term.split(/\s*[* ]\s*/)) {
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
