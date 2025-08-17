const asserted = true
export const assert = asserted
	? {
			equal(a: any, b: any, message?: string) {
				if (a !== b) {
					throw new Error(`Assertion failed: ${a} !== ${b} ${message ? `: ${message}` : ''}`)
				}
			},
		}
	: {
			equal() {},
		}
// TODO: decorator `assert` for property get boolean to validate something after construction
// Assert stuff on contours,shapes,...
