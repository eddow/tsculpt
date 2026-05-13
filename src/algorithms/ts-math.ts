import type { TsMathFactoryFunction, TsMathModule } from '../ts-math-wasm'

let module: TsMathModule | null = null

async function ensureTsMathInitialized(): Promise<TsMathModule> {
	if (module) return module

	const tsMathModule = (await import('ts-math-wasm')) as { default: TsMathFactoryFunction }

	module = await tsMathModule.default({
		locateFile: () => '/ts_math_bg.wasm',
	})

	return module
}

export async function transformVector(
	x: number,
	y: number,
	z: number,
	matrix: [
		number,
		number,
		number,
		number,
		number,
		number,
		number,
		number,
		number,
		number,
		number,
		number,
		number,
		number,
		number,
		number,
	]
): Promise<[number, number, number]> {
	const mod = await ensureTsMathInitialized()
	const result = mod.transform_vector(x, y, z, ...matrix)
	return [result[0], result[1], result[2]]
}

export async function crossProduct(
	ax: number,
	ay: number,
	az: number,
	bx: number,
	by: number,
	bz: number
): Promise<[number, number, number]> {
	const mod = await ensureTsMathInitialized()
	const result = mod.cross_product(ax, ay, az, bx, by, bz)
	return [result[0], result[1], result[2]]
}

export async function normalize(
	x: number,
	y: number,
	z: number
): Promise<[number, number, number]> {
	const mod = await ensureTsMathInitialized()
	const result = mod.normalize(x, y, z)
	return [result[0], result[1], result[2]]
}

export async function dotProduct(
	ax: number,
	ay: number,
	az: number,
	bx: number,
	by: number,
	bz: number
): Promise<number> {
	const mod = await ensureTsMathInitialized()
	return mod.dot_product(ax, ay, az, bx, by, bz)
}

export async function distance(
	ax: number,
	ay: number,
	az: number,
	bx: number,
	by: number,
	bz: number
): Promise<number> {
	const mod = await ensureTsMathInitialized()
	return mod.distance(ax, ay, az, bx, by, bz)
}

export default {
	transformVector,
	crossProduct,
	normalize,
	dotProduct,
	distance,
}
