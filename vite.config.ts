/// <reference types="vitest" />
import { URL, fileURLToPath } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import paramMetadataInjector from './viewer/vite-plugin-param-metadata'
import meshPlugin from './files/vite-plugin-mesh'

export default defineConfig({
	plugins: [vue(), paramMetadataInjector(), meshPlugin()],
	resolve: {
		alias: {
			'@': fileURLToPath(new URL('./viewer', import.meta.url)),
			'@tsculpt': fileURLToPath(new URL('./src', import.meta.url)),
			'@booleans': fileURLToPath(new URL('./booleans/jscad.ts', import.meta.url)),
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
			'@booleans': fileURLToPath(new URL('./booleans/tester.ts', import.meta.url)),
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
