export type TsMathModule = {
	transform_vector(
		x: number,
		y: number,
		z: number,
		m00: number,
		m01: number,
		m02: number,
		m03: number,
		m10: number,
		m11: number,
		m12: number,
		m13: number,
		m20: number,
		m21: number,
		m22: number,
		m23: number,
		m30: number,
		m31: number,
		m32: number,
		m33: number
	): number[]
	cross_product(ax: number, ay: number, az: number, bx: number, by: number, bz: number): number[]
	normalize(x: number, y: number, z: number): number[]
	dot_product(ax: number, ay: number, az: number, bx: number, by: number, bz: number): number
	distance(ax: number, ay: number, az: number, bx: number, by: number, bz: number): number
}

export type TsMathFactoryFunction = (init: {
	locateFile?: (file: string) => string
}) => Promise<TsMathModule>
