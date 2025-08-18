import { type Decimal, mesh, op3 } from '@tsculpt'
import { box, sphere } from '@tsculpt'

// Test for metadata/vite

async function op({ radius = 5 as Decimal<1, 10>, hulled = false as boolean } = {}) {
	const s1 = sphere({ radius })
	const b1 = box({ radius: 4 })

	// Original boolean subtraction
	const subtracted = await mesh`${s1} - ${b1}`

	return hulled ? op3.hull(subtracted) : subtracted
}

//export default function scene({ radius: size = 5 as Decimal<1, 100>, center = [0, 0, 0] as Vector3 }) {
// TODO Weird thing happen (really long generation + no edges visible) when radius going from 15 to 16
export default ({
	'Sphere radius': radius = 5 as Decimal<1, 10>,
	"Geometries' hull": hulled = false as boolean,
}) => op({ radius, hulled })

export function directFunction({
	'Sphere radius': radius = 5 as Decimal<1, 10>,
	"Geometries' hull": hulled = false as boolean,
}) {
	return op({ radius, hulled })
}

export const constFunction = ({
	'Sphere radius': radius = 5 as Decimal<1, 10>,
	"Geometries' hull": hulled = false as boolean,
}) => op({ radius, hulled })

export { op }

export const opDef = op()
