import type { Module, SourceFiles } from '@client/lib/source'
import { AMesh, GenerationParameters, ParametersConfig } from '@tsculpt'
import { withGlobals } from '@tsculpt/globals'
import { MaybePromise } from '@tsculpt/ts/maybe'
import { MeshPack, packMesh } from '../client/lib/pack'
import expose from './workerRef'

const actualPath = (path: string) => `/${path}.sculpt.ts`
const logicalPath = (path: string) => path.match(/^\/(.*)\.sculpt\.ts$/)?.[1]

const modules = import.meta.glob('/**/*.sculpt.ts')
const moduleCache = new Map<() => Promise<Module>, Promise<Module>>()
/*export function module(path: string) {
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
function readModule(path: string): Promise<Module> {
	path = actualPath(path)
	const evaluate = modules[path] as () => Promise<Module>
	if (!evaluate) throw new Error(`Module ${path} not found`)
	if (moduleCache.has(evaluate)) return moduleCache.get(evaluate)!
	const module = evaluate()
	moduleCache.set(evaluate, module)
	import.meta.hot?.accept(() => {
		self.postMessage({
			type: 'module-changed',
			path: logicalPath(path),
		})
		moduleCache.delete(evaluate)
	})
	return module
}
expose<SourceFiles>({
	modules() {
		// TODO vite fileWatcherPlugin?
		return Object.keys(modules)
			.map(logicalPath)
			.filter((path): path is string => path !== undefined)
	},
	async entries(path: string): Promise<Record<string, ParametersConfig>> {
		const module = await readModule(path)
		return Object.fromEntries(
			Object.entries(module).map(([key, value]) => [
				key,
				(typeof value === 'function' && (value.params as ParametersConfig)) || {},
			])
		)
	},
	async render(path: string, entry: string, parameters: GenerationParameters): Promise<MeshPack> {
		const module = await readModule(path)
		entry ??= 'default'
		if (!module[entry]) throw new Error(`Entry ${entry} not found in module ${path}`)
		const generator = module[entry] as
			| ((parameters: GenerationParameters) => MaybePromise<AMesh>)
			| MaybePromise<AMesh>
		const generated =
			typeof generator === 'function'
				? withGlobals(() => generator(parameters), parameters)
				: generator
		return packMesh(await generated)
	},
})

// Send initial ready message when worker starts
self.postMessage({
	type: 'worker-ready',
	message: 'Worker is ready to work!',
	timestamp: Date.now(),
})
