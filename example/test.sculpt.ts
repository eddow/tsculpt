import type { Decimal, Vector3 } from '@tsculpt'
import { sphere } from '@tsculpt/geometry'

/*TODO:
export default ({
	radius = 15 as Decimal<0>,
	center = [0, 0, 0] as Vector3,
})=> {
 */
// TODO Weird thing happen (really long generation + no edges visible) when going from 15 to 16
export default function scene({
	radius = 15 as Decimal<1, 100>,
	center = [0, 0, 0] as Vector3,
}) {
	console.log('reloaded-23')
	return sphere({ radius, center })
}
