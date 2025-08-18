import { MaybePromise } from './maybe'

export class Semaphore {
	private count: number
	private queue: ((...args: any[]) => void)[] = []

	constructor(max = 1) {
		this.count = max
	}

	async acquire() {
		if (this.count > 0) {
			this.count--
			return
		}
		return new Promise((resolve) => this.queue.push(resolve))
	}

	release() {
		this.count++
		if (this.queue.length > 0) {
			this.queue.shift()?.()
		}
	}
	execute<T>(fn: () => MaybePromise<T>): Promise<T> {
		return this.acquire()
			.then(() => fn())
			.finally(() => this.release())
	}
}
