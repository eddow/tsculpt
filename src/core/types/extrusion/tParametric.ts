import { cached } from '@tsculpt/ts/decorators'
import Diamond from 'flat-diamond'

export abstract class TParametric<T> extends Diamond() {
	abstract towards(t: number): T
	from(t: number): T {
		return this.towards(t)
	}
	@cached
	get last(): T {
		return this.towards(this.length)
	}
	next(t: number): number {
		return t < this.length ? this.length : Number.POSITIVE_INFINITY
	}
	abstract readonly length: number
}

// Convenience classes using the mixins
export const ConstantTPFactory = <T>() =>
	class ConstantTP extends Diamond(TParametric<T>) {
		value: T
		readonly length: number

		constructor(value: T, length: number) {
			super()
			this.value = value
			this.length = length
		}

		towards(_: number): T {
			return this.value
		}
	}

export const FunctionalTPFactory = <T>() =>
	class FunctionalTP extends Diamond(TParametric<T>) {
		fn: (t: number) => T
		readonly length: number

		constructor(fn: (t: number) => T, length: number) {
			super()
			this.fn = fn
			this.length = length
		}

		towards(t: number): T {
			return this.fn(t / this.length)
		}
	}

export const CompositeTPFactory = <T>() =>
	class CompositeTP extends Diamond(TParametric<T>) {
		readonly length: number
		tps: TParametric<T>[]

		constructor(tps: TParametric<T>[]) {
			super()
			this.tps = []
			const addTps = (tps: TParametric<T>[]) => {
				for (const tp of tps) {
					if (tp instanceof CompositeTP) {
						addTps(tp.tps)
					} else {
						this.tps.push(tp)
					}
				}
			}
			addTps(tps)
			this.length = this.tps.reduce((acc, tp) => acc + tp.length, 0)
		}

		part(t: number, choice: 'towards' | 'from'): { tp?: TParametric<T>; offset: number } {
			let offset = 0
			for (const tp of this.tps) {
				if (t < tp.length) return { tp, offset }
				if (choice === 'towards' && t === tp.length) return { tp, offset }
				offset += tp.length
			}
			return { offset }
		}

		from(t: number): T {
			const { tp, offset } = this.part(t, 'from')
			if (!tp) throw new Error('Invalid t')
			return tp.from(t - offset)
		}

		towards(t: number): T {
			const { tp, offset } = this.part(t, 'towards')
			if (!tp) throw new Error('Invalid t')
			return tp.towards(t - offset)
		}

		next(t: number): number {
			const { tp, offset } = this.part(t, 'from')
			if (!tp) throw new Error('Invalid t')
			return tp.next(t - offset)
		}
	}
