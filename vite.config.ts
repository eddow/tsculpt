/// <reference types="vitest" />
import { URL, fileURLToPath } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import paramMetadataInjector from './viewer/vite-plugin-param-metadata'
// https://vitejs.dev/config/
export default defineConfig({
	plugins: [vue(), paramMetadataInjector()],
	resolve: {
		alias: {
			'@': fileURLToPath(new URL('./viewer', import.meta.url)),
			'@tsculpt': fileURLToPath(new URL('./src', import.meta.url)),
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
		coverage: {
			provider: 'v8',
			reporter: ['text', 'html'],
			include: ['src/**/*.ts'],
			exclude: ['src/**/*.test.ts'],
		},
	},
	optimizeDeps: {
		exclude: ['example/test.ts'],
	},
})
