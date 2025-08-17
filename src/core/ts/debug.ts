const asserted = true

type Ctor = new (...args: any[]) => any
type IntegrityCheck<T extends Ctor> = Record<string, (this: InstanceType<T>) => boolean>
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
								if (!check.apply(this as InstanceType<T>)) {
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
// TODO: decorator `assert` for property get boolean to validate something after construction
// Assert stuff on contours,shapes,...
