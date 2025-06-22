import { fromJscad, toJscad, type Decimal, type Vector3 } from '@tsculpt'
import { box, sphere } from '@tsculpt/geometry'
import { booleans } from '@jscad/modeling'
const { subtract } = booleans
/*TODO:
export default ({
	radius = 15 as Decimal<0>,
	center = [0, 0, 0] as Vector3,
})=> {
 */
// TODO Weird thing happen (really long generation + no edges visible) when going from 15 to 16
export default function scene({
	radius = 5 as Decimal<1, 100>,
	center = [0, 0, 0] as Vector3,
}) {
	const s1 = sphere({ radius, center })
	const s1jsc = toJscad(s1)
	const b1 = box({ size: radius * 0.8, center })
	const b1jsc = toJscad(b1)
	const sub = subtract(b1jsc, s1jsc)
	return fromJscad(sub)
}
