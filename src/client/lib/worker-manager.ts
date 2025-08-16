import { cached } from '@tsculpt/ts/decorators'
import { onMounted, onUnmounted, toRaw } from 'vue'

export function recursiveToRaw<T>(obj: T): T {
	if (obj === null || typeof obj !== 'object') return obj
	const raw = toRaw(obj)
	if (Array.isArray(raw)) {
		return raw.map((item) => recursiveToRaw(item)) as T
	}
	const result = {} as T
	for (const key in raw) {
		result[key] = recursiveToRaw(raw[key])
	}
	return result
}

interface WorkerRequest {
	requestId: string
	type: string
	args: any[]
}

interface PendingRequest {
	resolve: (value: any) => void
	reject: (reason: any) => void
	timeout: ReturnType<typeof setTimeout> | false
}
export class WorkerManager<Works extends Record<string, (...args: any[]) => any>> {
	private worker: Worker | null = null
	private pendingRequests = new Map<string, PendingRequest>()
	private requestIdCounter = 0
	public requestTimeout = Number.POSITIVE_INFINITY // 30000 // 30 seconds default timeout, but none for debugging
	constructor(worker: Worker) {
		this.worker = worker
		// Set up message handling
		worker.onmessage = (event) => {
			const { requestId, result, error } = event.data

			// Handle response messages
			if (requestId && (result !== undefined || error !== undefined)) {
				this.handleResponse(requestId, result, error)
				return
			}
		}

		// Handle worker errors
		worker.onerror = (error) => {
			console.error('Worker error:', error)
			for (const [_, pendingRequest] of this.pendingRequests) pendingRequest.reject(error)
			this.pendingRequests.clear()
		}
	}

	public listen<U = any>(listener: (event: U) => void): () => void
	public listen<T>(
		guard: (event: MessageEvent) => T | undefined,
		listener: (event: T) => void
	): () => void
	public listen<T>(a: (event: MessageEvent) => T | undefined, b?: (event: T) => void): () => void {
		const guarded = b
			? (event: MessageEvent) => {
					const data = a(event.data)
					if (data !== undefined) b(data)
				}
			: (event: MessageEvent) => a(event.data)
		onMounted(() => {
			this.worker?.addEventListener('message', guarded)
		})
		const remove = () => {
			this.worker?.removeEventListener('message', guarded)
		}
		onUnmounted(remove)
		return remove
	}

	private handleResponse(requestId: string, result?: any, error?: string) {
		const pendingRequest = this.pendingRequests.get(requestId)
		if (!pendingRequest) {
			console.warn(`Received response for unknown request ID: ${requestId}`)
			return
		}

		// Resolve or reject the promise
		if (error) pendingRequest.reject(new Error(error))
		else pendingRequest.resolve(result)

		this.pendingRequests.delete(requestId)
	}

	private generateRequestId(): string {
		return `req_${++this.requestIdCounter}_${Date.now()}`
	}

	public async get<T>(type: string, ...args: any[]): Promise<T> {
		if (!this.worker) {
			throw new Error('Worker not initialized')
		}

		const requestId = this.generateRequestId()

		return new Promise((resolve, reject) => {
			// Set up timeout
			const timeout =
				this.requestTimeout !== Number.POSITIVE_INFINITY &&
				setTimeout(() => {
					this.pendingRequests.delete(requestId)
					reject(new Error(`Worker request timed out after ${this.requestTimeout}ms`))
				}, this.requestTimeout)

			// Store the pending request
			this.pendingRequests.set(requestId, { resolve, reject, timeout })

			// Send the request
			const request: WorkerRequest = {
				requestId,
				type,
				args: recursiveToRaw(args),
			}

			this.worker!.postMessage(request)
		})
	}

	public sendMessage(message: any) {
		if (this.worker) {
			this.worker.postMessage(message)
		}
	}

	public terminate() {
		// Reject all pending requests
		for (const [_, pendingRequest] of this.pendingRequests) {
			if (pendingRequest.timeout) clearTimeout(pendingRequest.timeout)
			pendingRequest.reject(new Error('Worker terminated'))
		}
		this.pendingRequests.clear()

		if (this.worker) {
			this.worker.terminate()
			this.worker = null
		}
	}
	@cached
	get call() {
		return new Proxy(
			{},
			{
				get: (_, prop) => {
					return (...args: any[]) => this.get(prop as string, ...args)
				},
			}
		) as Works
	}
}
