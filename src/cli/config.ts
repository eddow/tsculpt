import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { existsSync } from 'node:fs'

export interface TsculptConfig {
	/** Default export name to use */
	defaultExport?: string
	/** Default output format */
	defaultFormat?: 'stl' | 'obj' | 'amf' | 'dxf' | 'svg' | 'x3d'
	/** Default output directory */
	outputDir?: string
	/** Sculpt files directory */
	sculptDir?: string
	/** Default port for dev server */
	port?: string
	/** Default host for dev server */
	host?: string
	/** Default parameters for sculpt functions */
	defaultParams?: Record<string, unknown>
}

const DEFAULT_CONFIG: TsculptConfig = {
	defaultFormat: 'stl',
	sculptDir: '.',
	port: '5173',
	host: 'localhost',
}

let cachedConfig: TsculptConfig | null = null

export async function loadConfig(cwd?: string): Promise<TsculptConfig> {
	if (cachedConfig) {
		return cachedConfig
	}

	const searchDir = cwd || process.cwd()
	const configPaths = [
		resolve(searchDir, 'tsculpt.config.js'),
		resolve(searchDir, 'tsculpt.config.cjs'),
		resolve(searchDir, 'tsculpt.config.json'),
		resolve(searchDir, 'tsculpt.config.ts'),
	]

	for (const configPath of configPaths) {
		if (existsSync(configPath)) {
			try {
				const content = await readFile(configPath, 'utf-8')

				if (configPath.endsWith('.json')) {
					cachedConfig = { ...DEFAULT_CONFIG, ...JSON.parse(content) }
				} else {
					// For JS/CJS/TS configs, we'd need to eval them
					// For now, we'll just return default config
					cachedConfig = { ...DEFAULT_CONFIG }
				}

				return cachedConfig!
			} catch (error) {
				console.warn(`Failed to load config from ${configPath}:`, error)
			}
		}
	}

	// No config file found, return defaults
	cachedConfig = { ...DEFAULT_CONFIG }
	return cachedConfig
}

export function mergeConfig<T extends Record<string, unknown>>(
	config: TsculptConfig,
	options: T
): T & TsculptConfig {
	return {
		...config,
		...options,
	}
}
