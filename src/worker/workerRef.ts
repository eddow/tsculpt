export type GenericGetter<Output> = (path: string, ...args: any[]) => Output | Promise<Output>

type Awaited<T> = T extends Promise<infer U> ? Awaited<U> | Promise<U> : T
type AwaitedFunctions<APIs> = {
	[K in keyof APIs]: APIs[K] extends (...args: any[]) => infer R
		? (...args: any[]) => Awaited<R>
		: APIs[K]
}

/**
 * Expose a worker function to the worker context.
 * @param self - The worker instance.
 * @param works - The worker functions to expose.
 * @returns The worker instance.
 * Should be called after setting `self.onmessage` to the original function.
 */
export default function expose<
	Works extends Record<string, (...args: any[]) => any> = Record<string, (...args: any[]) => any>,
>(works: AwaitedFunctions<Works> | ((path: string, ...args: any[]) => any)) {
	const { onmessage } = self
	self.onmessage = async (event: MessageEvent) => {
		const { requestId, type, args } = event.data

		if (!requestId || !type) return onmessage?.call(self, event)
		let work: () => any = () => undefined
		if (typeof works === 'function') work = () => works(type, args)
		else {
			const worker = works[type]
			if (!worker) return onmessage?.call(self, event)
			work = () => worker(...args)
		}

		try {
			const result = await work()
			self.postMessage({
				requestId,
				result,
			})
		} catch (error) {
			console.error(error)
			self.postMessage({
				requestId,
				error: error instanceof Error ? error.message : String(error),
			})
		}
	}
}
