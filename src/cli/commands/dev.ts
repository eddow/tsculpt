import { Command } from 'commander'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadConfig, mergeConfig } from '../config'

export const devCommand = new Command('dev')
	.description('Start development server for sculpt files')
	.option('-p, --port <port>', 'Port to run on')
	.option('-h, --host <host>', 'Host to run on')
	.option('-d, --dir <directory>', 'Directory containing sculpt files')
	.option('-e, --export <name>', 'Default export name to use (default: default export)')
	.option('-c, --config <path>', 'Path to config file')
	.action(async (options) => {
		try {
			const config = await loadConfig(options.config ? require('path').dirname(options.config) : undefined)
			const merged = mergeConfig(config, {
				port: options.port,
				host: options.host,
				sculptDir: options.dir,
				defaultExport: options.export,
			})

			const { createServer } = await import('vite')
			const vue = await import('@vitejs/plugin-vue')
			const Components = await import('unplugin-vue-components/vite')
			const { PrimeVueResolver } = await import('@primevue/auto-import-resolver')

			// Import the vite plugins from the project
			const projectRoot = resolve(fileURLToPath(new URL('../../..', import.meta.url)))
			const dependencyInject = await import(`${projectRoot}/src/vite/di.ts`)
			const meshPlugin = await import(`${projectRoot}/src/vite/mesh.ts`)
			const paramMetadataInjector = await import(`${projectRoot}/src/vite/paramMetadata.ts`)

			const sculptDir = merged.sculptDir || '.'

			const server = await createServer({
				plugins: [
					vue.default(),
					paramMetadataInjector.default(),
					meshPlugin.default(),
					Components.default({
						dirs: [`${projectRoot}/src/client/components`],
						globs: ['src/client/**/*.vue'],
						resolvers: [PrimeVueResolver()],
					}),
					dependencyInject.default(['ecmaPoly', 'earcut', 'jscad', 'clipper2', 'ts-extrude', 'ts-csg']),
				],
				define: merged.defaultExport ? {
					'__TSCULPT_DEFAULT_EXPORT__': JSON.stringify(merged.defaultExport)
				} : {},
				root: projectRoot,
				server: {
					port: parseInt(merged.port || '5173', 10),
					host: merged.host || 'localhost',
					fs: {
						allow: [projectRoot, resolve(process.cwd(), sculptDir)],
					},
					headers: {
						'Cross-Origin-Opener-Policy': 'same-origin',
						'Cross-Origin-Embedder-Policy': 'require-corp',
					},
				},
				resolve: {
					alias: {
						'@client': `${projectRoot}/src/client`,
						'@tsculpt': `${projectRoot}/src/core`,
						'@worker': `${projectRoot}/src/worker`,
						'@meta': `${projectRoot}/src/meta.ts`,
					},
				},
				assetsInclude: ['**/*.amf', '**/*.dxf', '**/*.obj', '**/*.stl', '**/*.svg', '**/*.wasm', '**/*.x3d'],
				optimizeDeps: {
					exclude: ['example/*.ts', `${sculptDir}/*.ts`],
				},
			})

			await server.listen()
			console.log(`\n  tsculpt dev server running at http://${merged.host || 'localhost'}:${merged.port || '5173'}`)
			console.log(`  Serving sculpt files from: ${resolve(process.cwd(), sculptDir)}\n`)
		} catch (error) {
			console.error('Failed to start dev server:', error instanceof Error ? error.message : error)
			process.exit(1)
		}
	})
