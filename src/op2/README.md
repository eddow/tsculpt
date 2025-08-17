# OP2 - 2D Geometric Operations

This module provides 2D geometric operations for contours and polygons.

## Structure

- **`Engine`** - Abstract base class for 2D geometric operations
- **`clipper2.ts`** - Clipper2 WASM implementation using clipper2-wasm library
- **`tester.ts`** - Test implementation that extends the abstract Engine
- **`tester.test.ts`** - Comprehensive test suite

## Operations

The Engine class provides these abstract methods:

- `union(contour1: Contour, contour2: Contour): Contour` - Union of two contours
- `intersect(contour1: Contour, contour2: Contour): Contour` - Intersection of two contours
- `subtract(contour1: Contour, contour2: Contour): Contour` - Subtraction of contours
- `hull(contours: Contour[]): Contour` - Convex hull of multiple contours

## Implementations

### Clipper2Engine

The primary implementation using the [clipper2-wasm](https://www.npmjs.com/package/clipper2-wasm) library:

- **High Performance**: Uses WebAssembly for fast geometric operations
- **Robust**: Handles complex polygons and edge cases
- **Fallback**: Gracefully falls back to simple operations if WASM fails to load
- **Browser Ready**: Automatically copies WASM file to public directory

#### Features:
- Union, intersection, and difference operations using Clipper2's robust algorithms
- Convex hull approximation using union operations
- Automatic WASM initialization
- Error handling with fallback behavior

#### Usage:
```typescript
import engine from '@tsculpt/op2/clipper2'

const contour1 = new Contour(shape1)
const contour2 = new Contour(shape2)

const result = engine.union(contour1, contour2)
```

### TesterEngine

A mock implementation for testing purposes:

- Returns fake contours with descriptive IDs
- Tracks operation counts
- Provides helper methods for testing
- Extends the abstract Engine class

## Usage

```typescript
import engine from '@tsculpt/op2/clipper2'

const contour1 = new Contour(shape1)
const contour2 = new Contour(shape2)

const result = engine.union(contour1, contour2)
console.log(result.flatPolygons.length) // Number of polygons in result
```

## Setup

The Clipper2Engine automatically:
1. Loads the WASM module from the public directory
2. Initializes the Clipper2 library
3. Provides fallback behavior if initialization fails

Make sure the `clipper2z.wasm` file is available in the public directory (copied automatically during build).
