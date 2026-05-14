export interface CompileOptions {
	/** Output file path (default: stdout) */
	output?: string
	/** Output format (stl, obj, amf, dxf, svg, x3d) */
	format: 'stl' | 'obj' | 'amf' | 'dxf' | 'svg' | 'x3d'
	/** Export name to use (default: default export) */
	exportName?: string
	/** Parameters as JSON string */
	params?: Record<string, unknown>
}

export interface DevOptions {
	/** Port to run on */
	port?: string
	/** Host to run on */
	host?: string
	/** Directory containing sculpt files */
	dir?: string
	/** Default export name to use (default: default export) */
	exportName?: string
}

export function compileMesh(filePath: string, options: CompileOptions): Promise<void>
