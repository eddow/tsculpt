import { Vector2, Vector3, v2, v3 } from './types'

export const epsilon = 1e-6
export function lerp(a: Vector3, b: Vector3, t: number): Vector3
export function lerp(a: Vector2, b: Vector2, t: number): Vector2
export function lerp(a: number, b: number, t: number): number
export function lerp(a: Vector3 | Vector2 | number, b: Vector3 | Vector2 | number, t: number) {
	if (typeof a === 'number' && typeof b === 'number') {
		return a * (1 - t) + b * t
	}
	if (a instanceof Vector2 && b instanceof Vector2) {
		return v2(a.x * (1 - t) + b.x * t, a.y * (1 - t) + b.y * t)
	}
	if (a instanceof Vector3 && b instanceof Vector3) {
		return v3(a.x * (1 - t) + b.x * t, a.y * (1 - t) + b.y * t, a.z * (1 - t) + b.z * t)
	}
	throw new Error('Invalid lerp arguments')
}

export function clamp(value: number, min = 0, max = 1) {
	return Math.max(min, Math.min(value, max))
}

// Type guards
export function isVector2(v: Vector2 | Vector3): v is Vector2 {
	return v instanceof Vector2
}

export function isVector3(v: Vector2 | Vector3): v is Vector3 {
	return v instanceof Vector3
}

// Numbers and angles
export function degToRad(degrees: number): number {
	return (degrees * Math.PI) / 180
}

export function radToDeg(radians: number): number {
	return (radians * 180) / Math.PI
}

export function mod(n: number, m: number): number {
	return ((n % m) + m) % m
}

export function wrapAngle(angleRadians: number, range: 'pi' | '2pi' = 'pi'): number {
	const twoPi = Math.PI * 2
	const a = mod(angleRadians, twoPi)
	return range === '2pi' ? a : a > Math.PI ? a - twoPi : a
}

export function isNearlyZero(value: number, absEpsilon = epsilon): boolean {
	return Math.abs(value) <= absEpsilon
}

export function epsilonEquals(
	a: number,
	b: number,
	options?: { absEpsilon?: number; relEpsilon?: number }
): boolean {
	const absEpsilon = options?.absEpsilon ?? epsilon
	const relEpsilon = options?.relEpsilon ?? epsilon
	const diff = Math.abs(a - b)
	if (diff <= absEpsilon) return true
	return diff <= Math.max(Math.abs(a), Math.abs(b)) * relEpsilon
}

export function snap(value: number, step: number, start = 0): number {
	if (step === 0) return value
	return Math.round((value - start) / step) * step + start
}

export function roundToTolerance(value: number, tolerance = epsilon): number {
	if (tolerance <= 0) return value
	return Math.round(value / tolerance) * tolerance
}

export function mapRange(
	value: number,
	inMin: number,
	inMax: number,
	outMin: number,
	outMax: number
): number {
	const t = (value - inMin) / (inMax - inMin)
	return outMin + (outMax - outMin) * t
}

export function smoothStep(edge0: number, edge1: number, x: number): number {
	if (edge0 === edge1) return x < edge0 ? 0 : 1
	const t = clamp((x - edge0) / (edge1 - edge0))
	return t * t * (3 - 2 * t)
}

export function smootherStep(edge0: number, edge1: number, x: number): number {
	if (edge0 === edge1) return x < edge0 ? 0 : 1
	const t = clamp((x - edge0) / (edge1 - edge0))
	return t * t * t * (t * (t * 6 - 15) + 10)
}

// Vector basics
export function dot(a: Vector2, b: Vector2): number
export function dot(a: Vector3, b: Vector3): number
export function dot(a: Vector2 | Vector3, b: Vector2 | Vector3): number {
	if (a.length !== b.length) throw new Error('Dot product requires vectors of equal length')
	let sum = 0
	for (let i = 0; i < a.length; i++) sum += a[i] * b[i]
	return sum
}

export function cross(a: Vector3, b: Vector3): Vector3 {
	return new Vector3(
		a[1] * b[2] - a[2] * b[1],
		a[2] * b[0] - a[0] * b[2],
		a[0] * b[1] - a[1] * b[0]
	)
}

export function length(v: Vector2 | Vector3): number {
	return Math.sqrt(lengthSquared(v))
}

export function lengthSquared(v: Vector2 | Vector3): number {
	let sum = 0
	for (let i = 0; i < v.length; i++) sum += v[i] * v[i]
	return sum
}

export function normalize(v: Vector2): Vector2
export function normalize(v: Vector3): Vector3
export function normalize(v: Vector2 | Vector3): Vector2 | Vector3 {
	const size = length(v)
	if (size === 0) return isVector3(v) ? v3(0, 0, 0) : v2(0, 0)
	return isVector3(v) ? v3(v.x / size, v.y / size, v.z / size) : v2(v.x / size, v.y / size)
}

export function distance(a: Vector2, b: Vector2): number
export function distance(a: Vector3, b: Vector3): number
export function distance(a: Vector2 | Vector3, b: Vector2 | Vector3): number {
	return Math.sqrt(distanceSquared(a as any, b as any))
}

export function distanceSquared(a: Vector2, b: Vector2): number
export function distanceSquared(a: Vector3, b: Vector3): number
export function distanceSquared(a: Vector2 | Vector3, b: Vector2 | Vector3): number {
	if (a.length !== b.length) throw new Error('Distance requires vectors of equal length')
	let sum = 0
	for (let i = 0; i < a.length; i++) {
		const d = a[i] - b[i]
		sum += d * d
	}
	return sum
}

export function angleBetween(a: Vector2, b: Vector2): number
export function angleBetween(a: Vector3, b: Vector3): number
export function angleBetween(a: Vector2 | Vector3, b: Vector2 | Vector3): number {
	const denom = length(a) * length(b)
	if (denom === 0) return 0
	const c = clamp(dot(a as any, b as any) / denom, -1, 1)
	return Math.acos(c)
}

export function project(u: Vector2, onto: Vector2): Vector2
export function project(u: Vector3, onto: Vector3): Vector3
export function project(u: Vector2 | Vector3, onto: Vector2 | Vector3): Vector2 | Vector3 {
	const denom = dot(onto as any, onto as any)
	if (denom === 0) return isVector3(onto) ? v3(0, 0, 0) : v2(0, 0)
	const scale = dot(u as any, onto as any) / denom
	return isVector3(onto)
		? v3((onto as Vector3).x * scale, (onto as Vector3).y * scale, (onto as Vector3).z * scale)
		: v2((onto as Vector2).x * scale, (onto as Vector2).y * scale)
}

export function reflect(v: Vector2, normal: Vector2): Vector2
export function reflect(v: Vector3, normal: Vector3): Vector3
export function reflect(v: Vector2 | Vector3, normal: Vector2 | Vector3): Vector2 | Vector3 {
	const n2 = normalize(normal as any)
	const scale = 2 * dot(v as any, n2 as any)
	if (isVector3(normal)) {
		const n = n2 as Vector3
		const vv = v as Vector3
		return v3(vv.x - scale * n.x, vv.y - scale * n.y, vv.z - scale * n.z)
	}
	const n = n2 as Vector2
	const vv = v as Vector2
	return v2(vv.x - scale * n.x, vv.y - scale * n.y)
}

export function rotate2D(p: Vector2, angleRadians: number, center: Vector2 = v2(0, 0)): Vector2 {
	const cos = Math.cos(angleRadians)
	const sin = Math.sin(angleRadians)
	const x = p.x - center.x
	const y = p.y - center.y
	return v2(x * cos - y * sin + center.x, x * sin + y * cos + center.y)
}

export function rotateAroundAxis(
	p: Vector3,
	axis: Vector3,
	angleRadians: number,
	origin: Vector3 = v3(0, 0, 0)
): Vector3 {
	const a = normalize(axis) as Vector3
	const cos = Math.cos(angleRadians)
	const sin = Math.sin(angleRadians)
	const px = p.x - origin.x
	const py = p.y - origin.y
	const pz = p.z - origin.z
	const dotAP = px * a.x + py * a.y + pz * a.z
	const cx = a.y * pz - a.z * py
	const cy = a.z * px - a.x * pz
	const cz = a.x * py - a.y * px
	const rx = px * cos + cx * sin + a.x * dotAP * (1 - cos)
	const ry = py * cos + cy * sin + a.y * dotAP * (1 - cos)
	const rz = pz * cos + cz * sin + a.z * dotAP * (1 - cos)
	return v3(rx + origin.x, ry + origin.y, rz + origin.z)
}
