import { toRaw } from 'vue'

/**
 * Deep equality check that handles Vue proxies and prevents infinite recursion
 */
export function deepEqual(a: any, b: any, visited = new WeakSet()): boolean {
	// Handle null/undefined cases
	if (a === b) return true
	if (a == null || b == null) return a === b

	// Unwrap Vue proxies
	const rawA = toRaw(a)
	const rawB = toRaw(b)

	// Check for circular references
	if (typeof rawA === 'object' && typeof rawB === 'object') {
		if (visited.has(rawA) || visited.has(rawB)) {
			return rawA === rawB
		}
		visited.add(rawA)
		visited.add(rawB)
	}

	// Handle different types
	if (typeof rawA !== typeof rawB) return false

	// Handle primitives
	if (typeof rawA !== 'object') return rawA === rawB

	// Handle arrays
	if (Array.isArray(rawA) !== Array.isArray(rawB)) return false
	if (Array.isArray(rawA)) {
		if (rawA.length !== rawB.length) return false
		for (let i = 0; i < rawA.length; i++) {
			if (!deepEqual(rawA[i], rawB[i], visited)) return false
		}
		return true
	}

	// Handle objects
	const keysA = Object.keys(rawA)
	const keysB = Object.keys(rawB)

	if (keysA.length !== keysB.length) return false

	for (const key of keysA) {
		if (!keysB.includes(key)) return false
		if (!deepEqual(rawA[key], rawB[key], visited)) return false
	}

	return true
}
