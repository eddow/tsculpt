/// <reference types="vitest" />
import { URL, fileURLToPath } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import meshPlugin from './src/client/vite-plugin-mesh'
import paramMetadataInjector from './src/client/vite-plugin-param-metadata'

export default defineConfig({
	plugins: [vue(), paramMetadataInjector(), meshPlugin()],
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
				manualChunks: undefined,
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
