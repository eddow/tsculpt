/**
 * Type definitions for csgrs-wasm module
 * Note: This package does not exist on npm as of 2026-05-12
 * Alternative: Consider using @bitbybit-dev/manifold or manifold3d
 */

declare module 'csgrs-wasm' {
	export interface CsgrsModule {
		// Core CSG operations
		union(mesh1: any, mesh2: any): any
		intersect(mesh1: any, mesh2: any): any
		subtract(mesh1: any, mesh2: any): any
		hull(meshes: any[]): any

		// Mesh creation and conversion
		createMesh(vertices: number[], faces: number[]): any
		meshToVerticesFaces(mesh: any): { vertices: number[]; faces: number[] }

		// Utility functions
		freeMesh(mesh: any): void
	}

	export type CsgrsFactoryFunction = (init: {
		locateFile?: (file: string) => string
	}) => Promise<CsgrsModule>

	const factory: CsgrsFactoryFunction
	export default factory
}
