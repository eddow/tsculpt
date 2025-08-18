/*import { type Ref, ref } from 'vue'

export const modules = import.meta.glob('/** /*.sculpt.ts')

const moduleCache = new Map<() => Promise<Module>, Ref<Promise<Module>>>()
export function module(path: string) {
	const module = modules[path] as () => Promise<Module>
	if (!module) throw new Error(`Module ${path} not found`)
	if (moduleCache.has(module)) return moduleCache.get(module)!
	const rv = ref(module())
	moduleCache.set(module, rv)
	async function refresh(source: any) {
		rv.value = source?.modules[path]()
		import.meta.hot?.accept(path, refresh)
	}
	import.meta.hot?.accept(path, refresh)
	return rv as Ref<Promise<Module>>
}
*/

import { MeshPack } from '@client/lib/pack'
import type { GenerationParameters, ParametersConfig } from '@tsculpt'
import { WorkerManager } from './worker-manager'

export type SourceFiles = {
	modules(): Promise<string[]>
	entries(module: string): Promise<Record<string, ParametersConfig>>
	render(module: string, entry: string, parameters: GenerationParameters): Promise<MeshPack>
}
const viteWorker = new WorkerManager<SourceFiles>(
	new Worker(new URL('@worker/vite.worker.ts', import.meta.url), {
		type: 'module',
	})
)

export const { modules, entries, render } = viteWorker.call
export const onModuleChanged = (path: string, cb: () => void) =>
	viteWorker.listen((data) => data.type === 'module-changed' && data.path === path && cb())
