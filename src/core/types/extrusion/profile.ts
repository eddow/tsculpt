import { distance } from '@tsculpt/math'
import Diamond from 'flat-diamond'
import { Vector2 } from 'three'
import { Contour } from '../contour'
import {
	CompositeTPFactory,
	ConstantTPFactory,
	FunctionalTPFactory,
	TParametric,
} from './tParametric'

export abstract class Profile extends Diamond(TParametric<Contour>) {
	loft(toward: Contour, length: number): Profile {
		const { last } = this
		if (last.length > 1 && last[0].holes.length > 0)
			throw new Error('Cannot yet loft a profile with holes')
		if (toward.length > 1 && toward[0].holes.length > 0)
			throw new Error('Cannot yet loft a profile with holes')

		return new CompositeProfile([this, new FunctionalProfile((_) => toward, length)])
	}
}

export class CompositeProfile extends Diamond(CompositeTPFactory<Contour>(), Profile) {
	// biome-ignore lint/complexity/noUselessConstructor: Diamond fails to declare the correct constructor
	constructor(tps: Profile[]) {
		super(tps)
	}
}
export class ConstantProfile extends Diamond(ConstantTPFactory<Contour>(), Profile) {
	// biome-ignore lint/complexity/noUselessConstructor: Diamond fails to declare the correct constructor
	constructor(contour: Contour, length: number) {
		super(contour, length)
	}
}
export class FunctionalProfile extends Diamond(FunctionalTPFactory<Contour>(), Profile) {
	// biome-ignore lint/complexity/noUselessConstructor: Diamond fails to declare the correct constructor
	constructor(fn: (t: number) => Contour, length: number) {
		super(fn, length)
	}
}
