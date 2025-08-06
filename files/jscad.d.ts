type JSCADGeometry = {
	polygons: Array<{
		vertices: number[][]
		plane: number[]
	}>
	transforms: number[]
	color?: any
}
type JSCADResult = JSCADGeometry | JSCADGeometry[]
declare module '@jscad/stl-deserializer' {
	export function deserialize(options: { output?: string, filename?: string }, data: Buffer): JSCADResult
}

declare module '@jscad/stl-serializer' {
	export function serialize(geom3: JSCADGeometry): ArrayBuffer
}

declare module '@jscad/obj-deserializer' {
	export function deserialize(options: { output?: string, filename?: string }, data: Buffer): JSCADResult
}

declare module '@jscad/obj-serializer' {
	export function serialize(geom3: JSCADGeometry): ArrayBuffer
}

declare module '@jscad/amf-deserializer' {
	export function deserialize(options: { output?: string, filename?: string }, data: Buffer): JSCADResult
}

declare module '@jscad/dxf-deserializer' {
	export function deserialize(options: { output?: string, filename?: string }, data: Buffer): JSCADResult
}

declare module '@jscad/svg-deserializer' {
	export function deserialize(options: { output?: string, filename?: string }, data: Buffer): JSCADResult
}

declare module '@jscad/x3d-deserializer' {
	export function deserialize(options: { output?: string, filename?: string }, data: Buffer): JSCADResult
}

declare module '@jscad/amf-serializer' {
	export function serialize(geom3: JSCADGeometry): ArrayBuffer
}

declare module '@jscad/dxf-serializer' {
	export function serialize(geom3: JSCADGeometry): ArrayBuffer
}

declare module '@jscad/svg-serializer' {
	export function serialize(geom3: JSCADGeometry): ArrayBuffer
}

declare module '@jscad/x3d-serializer' {
	export function serialize(geom3: JSCADGeometry): ArrayBuffer
}
