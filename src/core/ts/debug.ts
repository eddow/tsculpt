const asserted = true

type Ctor = new (...args: any[]) => any
type IntegrityCheck<T extends Ctor> = Record<string, (this: InstanceType<T>) => any>
export const assert = asserted
	? {
			equal(a: any, b: any, message?: string) {
				if (a !== b) {
					throw new Error(`Assertion failed: ${a} !== ${b} ${message ? `: ${message}` : ''}`)
				}
			},
			integrity<T extends Ctor>(rules: IntegrityCheck<T>) {
				return (Base: T) =>
					class extends Base {
						constructor(...args: any[]) {
							super(...args)
							// Run all integrity checks after construction
							for (const [name, check] of Object.entries(rules)) {
								const checked = check.apply(this as InstanceType<T>)
								if (![true, undefined].includes(checked)) {
									console.groupCollapsed('Integrity check failure:', name)
									console.log('this:', this)
									if (checked !== false) console.log('details:', checked)
									console.groupEnd()
									throw new Error(`Integrity check failed: ${name}`)
								}
							}
						}
					}
			},
		}
	: {
			equal() {},
			integrity() {
				return () => {}
			},
		}
