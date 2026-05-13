import { describe, expect, it } from 'vitest'
import { AContour, AShape } from '../types/contour'
import { AMesh } from '../types/mesh'
import { getComputedMethodOptions } from './decorators'

describe('computed decorator metadata', () => {
	it('should expose the contour and shape methods that feed the computed facade', () => {
		const contourOptions = getComputedMethodOptions(AContour.prototype)
		const shapeOptions = getComputedMethodOptions(AShape.prototype)

		expect(contourOptions.get('transform')).toEqual({})
		expect(contourOptions.get('translate')).toEqual({})
		expect(contourOptions.get('scale')).toEqual({})
		expect(contourOptions.get('rotate')).toEqual({})
		expect(contourOptions.get('union')).toEqual({})
		expect(contourOptions.get('intersect')).toEqual({})
		expect(contourOptions.get('hull')).toEqual({})
		expect(contourOptions.get('subtract')).toEqual({})
		expect(contourOptions.get('subtractFrom')).toEqual({})
		expect(contourOptions.get('triangulate')).toEqual({ returns: 'value' })

		expect(shapeOptions.get('mapVertex')).toEqual({})
		expect(shapeOptions.get('triangulate')).toEqual({ returns: 'value' })
	})

	it('should expose the mesh methods that feed the computed facade', () => {
		const meshOptions = getComputedMethodOptions(AMesh.prototype)

		expect(meshOptions.get('map')).toEqual({})
		expect(meshOptions.get('translate')).toEqual({})
		expect(meshOptions.get('scale')).toEqual({})
		expect(meshOptions.get('bbox')).toEqual({ returns: 'value' })
		expect(meshOptions.get('transform')).toEqual({})
		expect(meshOptions.get('rotateX')).toEqual({})
		expect(meshOptions.get('rotateY')).toEqual({})
		expect(meshOptions.get('rotateZ')).toEqual({})
		expect(meshOptions.get('rotate')).toEqual({})
		expect(meshOptions.get('union')).toEqual({})
		expect(meshOptions.get('subtract')).toEqual({})
		expect(meshOptions.get('subtractFrom')).toEqual({})
		expect(meshOptions.get('intersect')).toEqual({})
		expect(meshOptions.get('hull')).toEqual({})
	})
})
