// Example: Importing mesh files using the new files system
// This will work with the Vite plugin that converts mesh files to TypeScript

// Import STL files (will be converted to Mesh objects at build time)
import cubeMesh from './test-cube.stl'
import modelMesh from './model.stl'

// Import OBJ files (will be converted to Mesh objects at build time)
// import sphereMesh from './sphere.obj'



// Export individual meshes
export { cubeMesh, modelMesh }
