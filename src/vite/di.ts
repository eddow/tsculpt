import type { Plugin } from 'vite'

export default function diInject(deps: Record<string, string>): Plugin {
	const virtualModuleId = 'virtual:di-registrations'
	const resolvedVirtualModuleId = `\0${virtualModuleId}`

	return {
		name: 'vite-plugin-di-inject',

		resolveId(id) {
			if (id === virtualModuleId) {
				return resolvedVirtualModuleId
			}
		},

		load(id) {
			if (id === resolvedVirtualModuleId) {
				// Default: Generate a minimal DI registration
				return `
import { register } from '@tsculpt/ts/di';
${Object.entries(deps)
	.map(([name, path]) => `import ${name} from '${path}'`)
	.join('\n')}

// Register dependencies
register({${Object.keys(deps).join(',')}});
				`
			}
		},
		// 3. Inject into ALL entry points (app + tests)
		transform(code, id) {
			// Inject into main.ts/main.js
			const entryPoint =
				id.endsWith('main.ts') ||
				id.includes('worker_file') ||
				id.includes('.spec.') ||
				id.includes('.test.') ||
				id.includes('__tests__')

			return entryPoint ? `import '${virtualModuleId}';${code}` : code
		},

		// 4. Force Vitest to include the virtual module
		config() {
			return {
				optimizeDeps: {
					include: [virtualModuleId], // Ensure it's pre-bundled
				},
				build: {
					rollupOptions: {
						external: [virtualModuleId], // Prevent tree-shaking
					},
				},
			}
		},
	}
}
