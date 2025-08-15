/// <reference types="vitest" />
import { URL, fileURLToPath } from 'node:url'
import { PrimeVueResolver } from '@primevue/auto-import-resolver'
import vue from '@vitejs/plugin-vue'
import Components from 'unplugin-vue-components/vite'
import { defineConfig } from 'vite'
import meshPlugin from './src/client/vite-plugin-mesh'
import paramMetadataInjector from './src/client/vite-plugin-param-metadata'

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
	],
	resolve: {
		alias: {
			'@': fileURLToPath(new URL('./src/client', import.meta.url)),
			'@tsculpt': fileURLToPath(new URL('./src/core', import.meta.url)),
			'@booleans': fileURLToPath(new URL('./src/booleans/jscad.ts', import.meta.url)),
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
		alias: {
			'@booleans': fileURLToPath(new URL('./src/booleans/tester.ts', import.meta.url)),
		},
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
