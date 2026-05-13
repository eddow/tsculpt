export type ExtrusionResult = {
	vertices: Float32Array
	faces: Uint32Array
}

export type TsExtrudeModule = {
	extrude_wasm(
		path_origins: Float32Array,
		path_x_axes: Float32Array,
		path_y_axes: Float32Array,
		contour_vertices: Float32Array,
		contour_offsets: Uint32Array,
		contour_lengths: Uint32Array,
		caps: boolean
	): ExtrusionResult
	extrude_segment_wasm(
		path_origins: Float32Array,
		path_x_axes: Float32Array,
		path_y_axes: Float32Array,
		contour_vertices: Float32Array,
		contour_offsets: Uint32Array,
		contour_lengths: Uint32Array,
		segment_start: number,
		segment_end: number,
		caps: boolean,
		is_first_segment: boolean,
		is_last_segment: boolean
	): ExtrusionResult
}

export type TsExtrudeFactoryFunction = (init: {
	locateFile?: (file: string) => string
}) => Promise<TsExtrudeModule>
