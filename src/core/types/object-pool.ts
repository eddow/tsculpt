import { Vector2, Vector3 } from './bunches'

/**
 * Object pool for reusing Vector3 instances
 */
export class Vector3Pool {
	private pool: Vector3[] = []
	private maxSize: number

	constructor(maxSize: number = 1000) {
		this.maxSize = maxSize
	}

	acquire(x: number, y: number, z: number): Vector3 {
		if (this.pool.length > 0) {
			const v = this.pool.pop()!
			v[0] = x
			v[1] = y
			v[2] = z
			return v
		}
		return [x, y, z] as Vector3
	}

	release(v: Vector3): void {
		if (this.pool.length < this.maxSize) {
			this.pool.push(v)
		}
	}

	size(): number {
		return this.pool.length
	}
}

/**
 * Object pool for reusing Vector2 instances
 */
export class Vector2Pool {
	private pool: Vector2[] = []
	private maxSize: number

	constructor(maxSize: number = 1000) {
		this.maxSize = maxSize
	}

	acquire(x: number, y: number): Vector2 {
		if (this.pool.length > 0) {
			const v = this.pool.pop()!
			v[0] = x
			v[1] = y
			return v
		}
		return [x, y] as Vector2
	}

	release(v: Vector2): void {
		if (this.pool.length < this.maxSize) {
			this.pool.push(v)
		}
	}

	size(): number {
		return this.pool.length
	}
}

// Singleton instances for global use
export const vector3Pool = new Vector3Pool(1000)
export const vector2Pool = new Vector2Pool(1000)
