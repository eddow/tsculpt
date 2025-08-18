/// <reference types="vitest" />
import { URL, fileURLToPath } from 'node:url'
import { PrimeVueResolver } from '@primevue/auto-import-resolver'
import vue from '@vitejs/plugin-vue'
import Components from 'unplugin-vue-components/vite'
import { defineConfig } from 'vite'
import dependencyInject from './src/vite/di'
import meshPlugin from './src/vite/mesh'
import paramMetadataInjector from './src/vite/paramMetadata'

export default defineConfig({
	plugins: [
		vue(),
		paramMetadataInjector(),
		meshPlugin(),
		Components({
			dirs: ['./src/client/components'],
			globs: ['src/client/**/*.vue'],
			resolvers: [PrimeVueResolver()],
		}),
		dependencyInject(
			process.env.NODE_ENV === 'test' || process.env.VITEST
				? {
						op3: './src/algorithms/op3.tester.ts',
						op2: './src/algorithms/op2.tester.ts',
					}
				: {
						op3: './src/algorithms/jscad.ts',
						op2: './src/algorithms/clipper2.ts',
					}
		),
	],
	worker: {
		format: 'es',
	},
	resolve: {
		alias: {
			'@client': fileURLToPath(new URL('./src/client', import.meta.url)),
			'@tsculpt': fileURLToPath(new URL('./src/core', import.meta.url)),
			'@worker': fileURLToPath(new URL('./src/worker', import.meta.url)),
			'@meta': fileURLToPath(new URL('./src/meta.ts', import.meta.url)),
		},
	},
	css: {
		preprocessorOptions: {
			sass: {
				api: 'modern-compiler',
			},
		},
	},
	server: {
		fs: {
			allow: ['.'],
		},
	},
	build: {
		rollupOptions: {
			output: {
				manualChunks: {
					primevue: ['primevue'],
					themes: ['@primeuix/themes'],
					vue: ['vue', 'vue-router'],
					three: ['three'],
					jscad: ['@jscad/modeling'],
				},
			},
		},
		outDir: 'dist',
		assetsDir: 'assets',
	},
	test: {
		include: ['src/**/*.test.ts'],

		coverage: {
			provider: 'v8',
			reporter: ['text', 'html'],
			include: ['src/**/*.ts'],
			exclude: ['src/**/*.test.ts'],
		},
	},
	optimizeDeps: {
		exclude: ['example/*.ts'],
	},
})
