declare module '*.stl' {
	import { Mesh } from './types/mesh'
	const mesh: Mesh
	export default mesh
}

declare module '*.obj' {
	import { Mesh } from './types/mesh'
	const mesh: Mesh
	export default mesh
}
