# Files System

This directory contains a standardized file I/O system for handling mesh files (STL, OBJ, etc.) that can be used by Vite plugins.

## Structure

- `index.ts` - Main exports and registry for file handlers
- `stl.ts` - STL file handler
- `obj.ts` - OBJ file handler
- `generator.ts` - Source code generator for Vite plugins
- `vite-plugin-mesh.ts` - Vite plugin for mesh file imports

## Usage

### Importing Mesh Files

```typescript
// Import STL files (converted to Mesh objects at build time)
import cubeMesh from './cube.stl'
import modelMesh from './model.stl'

// Import OBJ files (converted to Mesh objects at build time)
import sphereMesh from './sphere.obj'

// Use the meshes directly
const translatedCube = cubeMesh.translate([1, 0, 0])
const scaledModel = modelMesh.scale(2)
```

### Adding New File Formats

1. Create a new handler file (e.g., `ply.ts`):

```typescript
import { type FileHandler, type MeshData, type Vector3 } from './index'

const plyHandler: FileHandler = {
	extension: 'ply',

	read(data: ArrayBuffer | string): MeshData {
		// Parse PLY file and return MeshData
		return { faces: [] }
	},

	write(meshData: MeshData): ArrayBuffer {
		// Convert MeshData to PLY format
		return new ArrayBuffer(0)
	}
}

export default plyHandler
```

2. Register the handler in `index.ts`:

```typescript
import plyHandler from './ply'
registerHandler(plyHandler)
```

### Vite Plugin Integration

The `vite-plugin-mesh.ts` plugin automatically:
- Detects mesh file imports
- Converts them to TypeScript source code
- Generates proper Mesh objects
- Falls back to fake meshes if parsing fails

### File Handler Interface

```typescript
interface FileHandler {
	extension: string
	read: (data: ArrayBuffer | string) => MeshData
	write: (meshData: MeshData) => ArrayBuffer | string
}

interface MeshData {
	faces: [Vector3, Vector3, Vector3][]
	vertices?: Vector3[]
}

interface Vector3 {
	x: number
	y: number
	z: number
}
```

## Supported Formats

- **STL** - Stereolithography files
- **OBJ** - Wavefront OBJ files

## Generator Functions

- `generateMeshSource(meshData, meshName)` - Generate TypeScript source from mesh data
- `generateFakeMeshSource(meshName)` - Generate a fake cube mesh for testing
- `generateMeshDataFromFaces(faces)` - Convert face data to MeshData format
