import { type Ref, ref } from 'vue'

export const modules = import.meta.glob('/**/*.sculpt.ts')

export type Module = Record<string, any>
export function module(path: string) {
	const module = modules[path]
	if (!module) throw new Error(`Module ${path} not found`)
	const rv = ref(module())
	async function refresh(source: any) {
		rv.value = source?.modules[path]()
		import.meta.hot?.accept(refresh)
	}
	import.meta.hot?.accept(refresh)
	return rv as Ref<Promise<Module>>
}
