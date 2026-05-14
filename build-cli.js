import { execSync } from 'node:child_process'
import { mkdirSync, existsSync, readFileSync, writeFileSync, chmodSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Create dist directory if it doesn't exist
const distDir = join(__dirname, 'dist')
if (!existsSync(distDir)) {
	mkdirSync(distDir, { recursive: true })
}

// Build CLI with esbuild
console.log('Building CLI with esbuild...')

try {
	// Build CJS bundle for better compatibility with commander.js
	execSync('npx esbuild src/cli/index.ts --bundle --platform=node --target=node20 --format=cjs --outfile=dist/cli/index.bundle.cjs --external:@jscad/* --external:typescript --external:vite --external:@vitejs/plugin-vue --external:unplugin-vue-components --external:@primevue/auto-import-resolver --external:three --external:primevue --external:vue --external:vue-router --external:clipper2-wasm --external:earcut --external:flat-diamond --external:ts-morph', {
		stdio: 'inherit',
		cwd: __dirname
	})

	// Create a wrapper script with shebang (must be .cjs because package.json has "type": "module")
	const wrapperPath = join(distDir, 'cli', 'index.cjs')
	const wrapperContent = `#!/usr/bin/env node
require('./index.bundle.cjs');
`
	writeFileSync(wrapperPath, wrapperContent)

	// Make the wrapper executable
	chmodSync(wrapperPath, 0o755)

	console.log('✓ CLI built successfully')
} catch (error) {
	console.error('✗ CLI build failed:', error)
	process.exit(1)
}
