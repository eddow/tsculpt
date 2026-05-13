/**
 * Shared memory utilities for zero-copy data transfer between workers
 */

export interface SharedMeshData {
	vertices: Float32Array
	faces: Uint32Array
}

export class SharedMeshBuffer {
	private vertexBuffer: SharedArrayBuffer
	private faceBuffer: SharedArrayBuffer
	public vertices: Float32Array
	public faces: Uint32Array

	constructor(vertexCount: number, faceCount: number) {
		const vertexBytes = vertexCount * 3 * 4 // 3 floats per vertex, 4 bytes per float
		const faceBytes = faceCount * 3 * 4 // 3 indices per face, 4 bytes per index

		this.vertexBuffer = new SharedArrayBuffer(vertexBytes)
		this.faceBuffer = new SharedArrayBuffer(faceBytes)

		this.vertices = new Float32Array(this.vertexBuffer)
		this.faces = new Uint32Array(this.faceBuffer)
	}

	static fromMeshData(data: SharedMeshData): SharedMeshBuffer {
		const buffer = new SharedMeshBuffer(data.vertices.length / 3, data.faces.length / 3)
		buffer.vertices.set(data.vertices)
		buffer.faces.set(data.faces)
		return buffer
	}

	toMeshData(): SharedMeshData {
		return {
			vertices: this.vertices.slice(),
			faces: this.faces.slice(),
		}
	}

	dispose() {
		// SharedArrayBuffer cannot be explicitly freed, but we can clear references
		// The GC will handle cleanup when no references remain
	}
}

/**
 * Create a shared buffer pool for reusing buffers
 */
export class SharedBufferPool {
	private pools: Map<string, SharedMeshBuffer[]> = new Map()

	acquire(vertexCount: number, faceCount: number): SharedMeshBuffer {
		const key = `${vertexCount}-${faceCount}`
		const pool = this.pools.get(key) || []

		if (pool.length > 0) {
			return pool.pop()!
		}

		return new SharedMeshBuffer(vertexCount, faceCount)
	}

	release(buffer: SharedMeshBuffer, vertexCount: number, faceCount: number) {
		const key = `${vertexCount}-${faceCount}`
		const pool = this.pools.get(key) || []

		// Limit pool size to avoid unbounded memory growth
		if (pool.length < 10) {
			pool.push(buffer)
		}

		this.pools.set(key, pool)
	}
}

// Singleton instance
export const sharedBufferPool = new SharedBufferPool()
