# OP2 - 2D Geometric Operations

This module provides 2D geometric operations for contours and polygons.

## Structure

- **`Engine`** - Abstract base class for 2D geometric operations
- **`tester.ts`** - Test implementation that extends the abstract Engine
- **`tester.test.ts`** - Comprehensive test suite

## Operations

The Engine class provides these abstract methods:

- `union(contour1: Contour, contour2: Contour): Contour` - Union of two contours
- `intersect(contour1: Contour, contour2: Contour): Contour` - Intersection of two contours
- `subtract(contour1: Contour, contour2: Contour): Contour` - Subtraction of contours
- `hull(contours: Contour[]): Contour` - Convex hull of multiple contours

## Tester Implementation

The tester provides a mock implementation for testing purposes:

- Returns fake contours with descriptive IDs
- Tracks operation counts
- Provides helper methods for testing
- Extends the abstract Engine class

## Usage

```typescript
import engine from '@tsculpt/op2/tester'

const contour1 = new Contour(shape1)
const contour2 = new Contour(shape2)

const result = engine.union(contour1, contour2)
console.log(engine.getOperationCount()) // 1
```
