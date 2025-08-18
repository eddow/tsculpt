export const metaKey = 'tsculptMetadata'

export type Module = Record<string, any>
export function parameterizedExports(module: Module) {
	const metadata = module[metaKey]
	if (!metadata) return module

	const out: Module = {}
	for (const [key, value] of Object.entries(module))
		if (key !== metaKey)
			out[key] = metadata[key] ? Object.assign(value, { params: metadata[key] }) : value
	return out
}
