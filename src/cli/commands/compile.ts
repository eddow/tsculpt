import { Command } from 'commander'
import { compileMesh } from '../compiler'
import { loadConfig, mergeConfig } from '../config'

export const compileCommand = new Command('compile')
	.description('Compile a sculpt file to a mesh')
	.argument('<file>', 'Path to the sculpt file')
	.option('-o, --output <file>', 'Output file path (default: stdout)')
	.option('-f, --format <format>', 'Output format (stl, obj, amf, dxf, svg, x3d)')
	.option('-e, --export <name>', 'Export name to use (default: default export)')
	.option('--params <json>', 'Parameters as JSON string')
	.option('-c, --config <path>', 'Path to config file')
	.action(async (file, options) => {
		try {
			const config = await loadConfig(options.config ? require('path').dirname(options.config) : undefined)
			const merged = mergeConfig(config, {
				output: options.output,
				format: options.format,
				exportName: options.export,
			})

			const params = options.params ? JSON.parse(options.params) : undefined
			const finalParams = { ...config.defaultParams, ...params }

			await compileMesh(file, {
				output: merged.output,
				format: merged.format as 'stl' | 'obj' | 'amf' | 'dxf' | 'svg' | 'x3d',
				exportName: merged.exportName,
				params: finalParams,
			})
		} catch (error) {
			console.error('Compilation failed:', error instanceof Error ? error.message : error)
			process.exit(1)
		}
	})
