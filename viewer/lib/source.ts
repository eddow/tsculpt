import { type Ref, ref } from 'vue'

export const modules = import.meta.glob('/**/*.sculpt.ts')

export type Module = Record<string, any>
const moduleCache = new Map<() => Promise<Module>, Ref<Promise<Module>>>()
export function module(path: string) {
	const module = modules[path] as () => Promise<Module>
	if (!module) throw new Error(`Module ${path} not found`)
	if (moduleCache.has(module)) return moduleCache.get(module)!
	const rv = ref(module())
	moduleCache.set(module, rv)
	async function refresh(source: any) {
		rv.value = source?.modules[path]()
		import.meta.hot?.accept(refresh)
	}
	import.meta.hot?.accept(refresh)
	return rv as Ref<Promise<Module>>
}
