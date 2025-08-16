import { type Decimal, type Vector3, hull, mesh } from '@tsculpt'
import { box, sphere } from '@tsculpt'
/*TODO:
export default ({
	radius = 15 as Decimal<0>,
	center = [0, 0, 0] as Vector3,
})=> {
 */
// TODO: param {extName: intName = dft} uses `intName` but should expose `extName`
//export default function scene({ radius: size = 5 as Decimal<1, 100>, center = [0, 0, 0] as Vector3 }) {
// TODO Weird thing happen (really long generation + no edges visible) when radius going from 15 to 16
//up
export default function scene({ radius = 5 as Decimal<1, 100>, hulled = false }) {
	const s1 = sphere({ radius })
	const b1 = box({ radius: radius * 0.8 })

	// Original boolean subtraction
	const subtracted = mesh`${s1} - ${b1}`


	return hulled ? hull(subtracted) : subtracted
}
