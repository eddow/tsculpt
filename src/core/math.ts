import { Vector2, Vector3 } from './types'

export function lerp(a: Vector3, b: Vector3, t: number): Vector3
export function lerp(a: Vector2, b: Vector2, t: number): Vector2
export function lerp(a: number, b: number, t: number): number
export function lerp(a: Vector3 | Vector2 | number, b: Vector3 | Vector2 | number, t: number) {
	if (typeof a === 'number' && typeof b === 'number') {
		return a * (1 - t) + b * t
	}
	if (a instanceof Vector2 && b instanceof Vector2) {
		return new Vector2(a.x * (1 - t) + b.x * t, a.y * (1 - t) + b.y * t)
	}
	if (a instanceof Vector3 && b instanceof Vector3) {
		return new Vector3(a.x * (1 - t) + b.x * t, a.y * (1 - t) + b.y * t, a.z * (1 - t) + b.z * t)
	}
	throw new Error('Invalid lerp arguments')
}

export function clamp(value: number, min = 0, max = 1) {
	return Math.max(min, Math.min(value, max))
}
