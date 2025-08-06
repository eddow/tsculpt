// Test mesh import functionality
// This file tests importing the existing STL files in the example directory

import model from './model.stl'
// Import the existing test files
import testCube from './test-cube.stl'

console.log('Test cube mesh:', testCube)
console.log('Model mesh:', model)

// Test basic operations
const translatedCube = testCube.translate([1, 0, 0])
const scaledModel = model.scale(0.5)

console.log('Translated cube:', translatedCube)
console.log('Scaled model:', scaledModel)

export { testCube, model, translatedCube, scaledModel }
