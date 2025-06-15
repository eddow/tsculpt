import type { Vector3 } from './types'

export class Mesh {
	constructor(
		public vertices: Vector3[] = [],
		public faces: [number, number, number][] = []
	) {}

}
