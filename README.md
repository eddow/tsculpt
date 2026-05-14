# tsculpt

A TypeScript-based 3D mesh generation library with CLI support for compiling sculpt files and a development server for interactive mesh editing.

## Installation

```bash
npm install tsculpt
```

## Usage

### As an npm package

Import tsculpt in your TypeScript/JavaScript projects:

```typescript
import { box, sphere, mesh } from 'tsculpt'

const myBox = box({ radius: 5 })
const mySphere = sphere({ radius: 3 })

const result = mesh`${myBox} - ${mySphere}`
```

### Configuration

tsculpt can be configured using a `tsculpt.config.json` file in your project root:

```json
{
  "defaultExport": "default",
  "defaultFormat": "stl",
  "outputDir": "./output",
  "sculptDir": ".",
  "port": "5173",
  "host": "localhost",
  "defaultParams": {
    "size": 10,
    "radius": 5
  }
}
```

Configuration options:
- `defaultExport` - Default export name to use
- `defaultFormat` - Default output format (stl, obj, amf, dxf, svg, x3d)
- `outputDir` - Default output directory
- `sculptDir` - Directory containing sculpt files (default: current directory)
- `port` - Default port for dev server
- `host` - Default host for dev server
- `defaultParams` - Default parameters for sculpt functions

CLI options override config file values.

### CLI Commands

tsculpt provides two main CLI commands:

#### 1. Compile Command

Compile a sculpt file to various 3D mesh formats:

```bash
# Compile to STL (default)
tsculpt compile my-sculpt.sculpt.ts -o output.stl

# Compile to OBJ
tsculpt compile my-sculpt.sculpt.ts -o output.obj -f obj

# Compile with parameters
tsculpt compile my-sculpt.sculpt.ts -o output.stl --params '{"radius": 10, "height": 5}'

# Supported formats: stl, obj, amf, dxf, svg, x3d
```

**Options:**
- `-o, --output <file>` - Output file path (default: stdout)
- `-f, --format <format>` - Output format (stl, obj, amf, dxf, svg, x3d)
- `-e, --export <name>` - Export name to use (default: default export)
- `--params <json>` - Parameters as JSON string
- `-c, --config <path>` - Path to config file (default: tsculpt.config.json)

#### 2. Dev Command

Start a development server for interactive sculpt file editing:

```bash
# Start dev server (default: port 5173, host localhost, sculpt directory)
tsculpt dev

# Custom port and host
tsculpt dev -p 8080 -h 0.0.0.0

# Custom sculpt directory
tsculpt dev -d my-sculpts
```

**Options:**
- `-p, --port <port>` - Port to run on (default: 5173)
- `-h, --host <host>` - Host to run on (default: localhost)
- `-d, --dir <directory>` - Directory containing sculpt files (default: current directory)
- `-e, --export <name>` - Default export name to use (default: default export)
- `-c, --config <path>` - Path to config file (default: tsculpt.config.json)

### Building

```bash
# Build the library and CLI
npm run build:lib

# Build the web application
npm run build

# Build WASM modules
npm run build:wasm
```

### Development

```bash
# Start the web development server
npm run dev

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests with UI
npm run test:ui

# Run E2E tests
npm run e2e
```

## Sculpt File Format

A sculpt file is a TypeScript file that exports a function returning a Mesh. You can use either a default export or named exports:

```typescript
import { box, sphere, mesh, type Decimal } from 'tsculpt'

// Using default export
export default ({
  'Box size': size = 5 as Decimal<1, 10>,
  'Sphere radius': radius = 3 as Decimal<1, 5>,
}) => {
  const b = box({ radius: size })
  const s = sphere({ radius })

  return mesh`${b} - ${s}`
}

// Or using named exports
export const myShape = ({
  'Box size': size = 5 as Decimal<1, 10>,
}) => {
  return box({ radius: size })
}
```

### Specifying Exports

When using named exports, specify the export name with the `-e` option:

```bash
# Compile a specific named export
tsculpt compile my-sculpt.sculpt.ts -e myShape -o output.stl

# Start dev server with a specific default export
tsculpt dev -e myShape
```

## API Reference

### Core Shapes

- `box({ radius })` - Create a box/cube
- `sphere({ radius })` - Create a sphere
- `cylinder({ radius, height })` - Create a cylinder
- `cone({ radius, height })` - Create a cone
- `torus({ radius, tube })` - Create a torus

### Mesh Operations

- `mesh${a} - ${b}` - Boolean subtraction
- `mesh${a} | ${b}` - Boolean union
- `mesh${a} & ${b}` - Boolean intersection
- `hull(...meshes)` - Create convex hull

### Extrusions

- `linearExtrude(contour, height)` - Linear extrusion
- `rotateExtrude(contour)` - Rotational extrusion
- `sweep(contour, path)` - Sweep along path
- `loft(contours)` - Loft between contours

## License

MIT
