import { type Decimal, type Vector3, mesh, hull } from '@tsculpt'
import { box, sphere } from '@tsculpt/geometry'
/*TODO:
export default ({
	radius = 15 as Decimal<0>,
	center = [0, 0, 0] as Vector3,
})=> {
 */
// TODO Weird thing happen (really long generation + no edges visible) when radius going from 15 to 16
export default function scene({ radius = 5 as Decimal<1, 100>, center = [0, 0, 0] as Vector3 }) {
	const s1 = sphere({ radius, center })
	const b1 = box({ radius: radius * 0.8, center })

	// Original boolean subtraction
	const subtracted = mesh`${b1} - ${s1}`

	// New hull operation - creates convex hull around both shapes
	const hulled = hull(s1, b1)

	return subtracted
}
