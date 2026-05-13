# Missing Features in tsculpt

Comprehensive inventory of what this CAD system is missing, based on analysis of the full codebase (core modules, types, algorithms, examples, docs, and dependencies).

See also: [`plans/ts-csg-wasm.md`](../plans/ts-csg-wasm.md) — detailed plan for the Rust/WASM CSG engine.

---

## 🔴 Critical Gaps (blocking production use)

### 1. CSG/WASM Boolean Engine [✅ IMPLEMENTED — SECONDARY]

The Rust/WASM CSG engine is built and operational. It runs as a **secondary** engine behind JSCAD.

**What was built:**
- Pure Rust BSP-tree CSG in [`crates/ts-csg/src/bsp.rs`](../crates/ts-csg/src/bsp.rs) (union, intersect, subtract, convex hull)
- Zero C/C++ dependencies — compiles to 44KB WASM binary via `wasm-pack`
- TypeScript adapter at [`src/algorithms/ts-csg.ts`](../src/algorithms/ts-csg.ts) with `CsgResultMesh` (lazy `IntermediateMesh`), `booleanReduce()` for multi-mesh ops
- 5/5 Rust tests passing (convex mesh union, intersection, subtraction, hull, coplanar robustness)
- WASM loads at startup via DI, build script: `npm run build:wasm:csg`

**Current DI order** (in [`vite.config.ts:24`](../vite.config.ts:24)):
```
ecmaPoly → earcut → jscad → clipper2 → ts-extrude → ts-csg
```
JSCAD is primary for all 3D booleans. `ts-csg` is registered last so its functions are discarded by DI's first-registered-wins.

**Promotion path:** See [`plans/ts-csg-wasm.md`](../plans/ts-csg-wasm.md) § "How to promote ts-csg to primary" for the 3 tasks needed before swapping the DI order.

**Files:**
- [`crates/ts-csg/src/bsp.rs`](../crates/ts-csg/src/bsp.rs) — BSP engine
- [`crates/ts-csg/src/lib.rs`](../crates/ts-csg/src/lib.rs) — WASM glue
- [`src/algorithms/ts-csg.ts`](../src/algorithms/ts-csg.ts) — TS adapter
- [`src/algorithms/jscad.ts`](../src/algorithms/jscad.ts) — primary engine (unchanged)
- [`src/core/ts/di.ts`](../src/core/ts/di.ts) — DI surface unchanged

### 2. 2D Offset Operation [✅ IMPLEMENTED]

Contour inset/outset is now available via Clipper2 WASM's native `InflatePathsD`.

**What was built:**
- `offset2(contour, delta)` added to the DI interface at [`src/core/ts/di.ts:8`](../src/core/ts/di.ts:8)
- Implementation in [`src/algorithms/clipper2.ts:274-292`](../src/algorithms/clipper2.ts:274-292) using Miter joins, Polygon end type
- `offsetBase()` (raw) and `offset()` (computed graph wrapper) in [`src/core/algorithms.ts:143-153`](../src/core/algorithms.ts:143-153)
- `offset(delta)` instance method on `AContour` at [`src/core/types/contour.ts:258-260`](../src/core/types/contour.ts:258-260), registered as computed method
- Positive delta = outset, negative delta = inset

**Usage:**
```typescript
const inset = contour.offset(-2)   // clearance gap
const outset = contour.offset(3)   // wall thickness
```

**Files:**
- [`src/core/ts/di.ts`](../src/core/ts/di.ts) — DI interface
- [`src/algorithms/clipper2.ts`](../src/algorithms/clipper2.ts) — Clipper2 WASM adapter
- [`src/algorithms/op2.tester.ts`](../src/algorithms/op2.tester.ts) — test DI fake
- [`src/core/algorithms.ts`](../src/core/algorithms.ts) — computed wrapper + base export
- [`src/core/types/contour.ts`](../src/core/types/contour.ts) — AContour method

### 3. No Fillet / Chamfer

No edge/vertex rounding or beveling exists for either 2D contours or 3D meshes. This is the most-requested CAD operation.

### 4. No Shell / Hollow

No operation to make a solid mesh hollow with a specified wall thickness (`shell(mesh, thickness)`).

---

## 🔵 Significant Modeling Operations Missing

### 3D Operations

| Operation | Description | Priority |
|---|---|---|
| **Mirror** | Mirror meshes across an arbitrary plane | High |
| **Array / Pattern** | Linear, circular, or grid pattern duplication | High |
| **Projection** | 3D mesh → 2D contour projection onto a plane | Medium |
| **Section / Slice** | Cut mesh with a plane → cross-section contour | Medium |
| **Thicken** | Convert a surface/thin mesh into a solid with thickness | Medium |
| **Bend / Twist (non-linear)** | Non-linear deformations beyond the linear-extrude twist | Low |

### 2D / Contour Operations

| Operation | Description | Priority |
|---|---|---|
| **Bezier / Spline curves** | Parametric curves (cubic Bezier, B-spline, NURBS) → contour | High |
| **Text-to-contour** | Vectorize text strings into 2D contours | High |
| **Polygon fillet/chamfer** | Per-vertex rounding on polygons | Medium |
| **Polygon simplification** | Douglas-Peucker or similar vertex reduction | Medium |
| **Polygon smoothing** | Chaikin subdivision for curve smoothing | Medium |
| **Contour from image** | Bitmap tracing → vector contour | Low |

### Mesh Operations

| Operation | Description | Priority |
|---|---|---|
| **Mesh validation / analysis** | Watertight/manifold check, printability assessment, volume/surface area — exposed via `AMesh.analyze()` and wired into the UI (Statistics panel + Viewer badge + pre-export dialog) | ✅ Done |
| **Subdivision surface** | Catmull-Clark, Loop, or √3 subdivision | Medium |
| **Mesh decimation** | Polygon reduction for LOD generation | Medium |
| **Mesh repair** | Hole-filling, normal fixing, manifold repair (destructive fixes — distinct from read-only validation above) | Medium |
| **Mesh smoothing** | Laplacian or Taubin smoothing | Medium |
| **Normal computation** | Compute per-face or per-vertex normals | Medium |
| **Edge split / weld** | Mesh topology editing | Low |
| **Boolean cleanup** | Degenerate face removal after boolean ops | Low |

**Files:**
- [`src/core/geometry-utils.ts`](../src/core/geometry-utils.ts) — `analyzeGeometry()`, `GeometryStats`, `Printability`
- [`src/core/types/mesh.ts`](../src/core/types/mesh.ts) — `AMesh.analyze()` method (computed)
- [`src/client/components/Parameters.vue`](../src/client/components/Parameters.vue) — Statistics panel with mesh health
- [`src/client/components/Viewer.vue`](../src/client/components/Viewer.vue) — Mesh-health badge overlay
- [`src/client/components/EntryViewer.vue`](../src/client/components/EntryViewer.vue) — Export menu with pre-export validation dialog

---

## 🟠 Import / Export Gaps

### Libraries Installed and Wired

All 6 JSCAD format libraries are connected in [`src/io/index.ts`](../src/io/index.ts:30-50) via the generic [`jscadGen`](../src/io/jscadGen.ts) adapter:

| Format | npm Package | Status |
|---|---|---|
| STL | `@jscad/stl-deserializer`, `@jscad/stl-serializer` | ✅ Wired ([`src/io/index.ts:45`](../src/io/index.ts:45)) |
| OBJ | `@jscad/obj-deserializer`, `@jscad/obj-serializer` | ✅ Wired ([`src/io/index.ts:46`](../src/io/index.ts:46)) |
| DXF | `@jscad/dxf-deserializer`, `@jscad/dxf-serializer` | ✅ Wired ([`src/io/index.ts:48`](../src/io/index.ts:48)) |
| SVG | `@jscad/svg-deserializer`, `@jscad/svg-serializer` | ✅ Wired ([`src/io/index.ts:49`](../src/io/index.ts:49)) |
| AMF | `@jscad/amf-deserializer`, `@jscad/amf-serializer` | ✅ Wired ([`src/io/index.ts:47`](../src/io/index.ts:47)) |
| X3D | `@jscad/x3d-deserializer`, `@jscad/x3d-serializer` | ✅ Wired ([`src/io/index.ts:50`](../src/io/index.ts:50)) |

No new IO wiring is needed. The formats already work through the [`jscadGen`](../src/io/jscadGen.ts) adapter pattern, which handles the JSCAD geometry ↔ MeshData conversion.

### Formats Not Available

| Format | Notes |
|---|---|
| **STEP** (AP203/AP214) | The standard CAD exchange format — absent |
| **IGES** | Legacy CAD format — absent |
| **3MF** | Modern 3D manufacturing format — absent |
| **GLTF / GLB** | Web-standard 3D format — absent |
| **Collada (DAE)** | Interchange format — absent |
| **PLY** | Point cloud / mesh format — absent |

**Files involved:**
- [`src/io/generator.ts`](../src/io/generator.ts) — likely IO entry point, needs review
- [`src/io/index.ts`](../src/io/index.ts) — IO barrel

---

## 🟡 Algorithm Robustness & Performance

### WASM Integration Issues

| Issue | Details |
|---|---|
| **ts-csg WASM** | Module lazy-initializes on first use via `ensureInitialized()` ([`ts-csg.ts:41`](../src/algorithms/ts-csg.ts:41)) — currently falls back to JSCAD because `ts-csg` is registered last in DI order ([`vite.config.ts:24`](../vite.config.ts:24)) |
| **Extrusion WASM fallback** | [`extrusion.ts:84`](../src/core/types/extrusion.ts:84) logs `console.warn('WASM extrusion failed, falling back to JS')` — JS fallback doesn't use the WASM math crate either |
| **WASM Math crate** | [`crates/ts-math/`](../crates/ts-math/) exists but no clear integration surface in TypeScript |
| **WASM Extrude crate** | [`crates/ts-extrude/`](../crates/ts-extrude/) exists and is called as the primary path, but falls back to unoptimized JS |

### Triangulation

The current triangulation goes through DI → likely JSCAD or earcut. No robustness guarantees for:
- Complex concave polygons with many vertices
- Deeply nested hole hierarchies
- Self-intersecting contours
- Nearly-degenerate triangles

---

## 🟢 Workflow & UX Gaps

### Constraint System

No geometric constraint engine. A production CAD needs:
- Dimensional constraints (distance, angle, radius)
- Geometric constraints (parallel, perpendicular, coincident, concentric, tangent, collinear, equal-length, equal-radius, horizontal, vertical)
- Constraint solver (iterative or graph-based)

### Sketching System

No interactive 2D sketch → contour workflow. Missing:
- Sketch plane selection
- Interactive line/arc/circle/spline drawing
- Dimension-driven sketching
- Sketch → contour extrusion pipeline

### Undo / Redo

No operation history stack. All mutations are immediate with no rollback.

### Measurement

No built-in measurement tools:
- Distance between points/edges/faces
- Angle between edges/faces
- Surface area / volume
- Bounding box querying (partially present in [`mesh.ts:52`](../src/core/types/mesh.ts:52) as `bbox()` but not exposed as a tool)

### Snapping

No snap system:
- Grid snap
- Endpoint / midpoint / center snap
- Intersection snap
- Tangent / perpendicular snap

### Selection / Picking

No 3D viewport selection:
- No raycasting for object selection
- No face/edge/vertex picking
- No multi-select or selection filters

### Layer / Grouping

No model organization:
- No layers
- No groups / components
- No transform hierarchy
- No naming of objects

### Parameter Editor

The UI components at [`src/client/components/Parameter.vue`](../src/client/components/Parameter.vue) and [`src/client/components/Parameters.vue`](../src/client/components/Parameters.vue) exist but appear basic. Missing:
- Parameter expression support (e.g., `width = height * 2`)
- Parameter dependencies and cascade updates
- User-defined parameters
- Parameter groups / categories

---

## 🟣 API Design / DX Gaps

### Missing Control Parameters

Only `grain` is available as a global generation parameter ([`src/core/globals.ts:10`](../src/core/globals.ts:10)). Missing user-facing controls:
- `tolerance` — chordal deviation for curve approximation
- `angleTolerance` — maximum angle between adjacent faces
- `maxEdgeLength` — cap on edge length in tessellation
- `minEdgeLength` — prevent degenerate edges

### Computed System

The computed layer described in [`docs/builders.md`](../docs/builders.md) is sophisticated but has unclear migration status:
- Some tests exist for the computed infrastructure
- But it's unclear if all user-facing APIs have been migrated from `PromiseChain` to the computed graph model
- The [`docs/builders.md`](../docs/builders.md):837 lists 8 migration steps — it's ambiguous which steps are complete

---

## 🧪 Test Coverage Holes

| Area | Test File | Coverage |
|---|---|---|
| 2D shapes | [`src/core/geometry.test.ts`](../src/core/geometry.test.ts) | ✅ Partial (circle, square, grain) |
| 3D geometries | [`src/core/geometry.test.ts`](../src/core/geometry.test.ts) | ✅ Partial (cylinder, torus, box) |
| Extrusion | [`src/core/types/extrusion.test.ts`](../src/core/types/extrusion.test.ts) | ✅ Partial |
| Loft | [`src/core/types/extrusion/loft.test.ts`](../src/core/types/extrusion/loft.test.ts) | ✅ Exists |
| Expression system | [`src/core/expression/expression.test.ts`](../src/core/expression/expression.test.ts), [`expression/linear.test.ts`](../src/core/expression/linear.test.ts) | ✅ Good |
| Computed system | [`src/core/computed/runtime.test.ts`](../src/core/computed/runtime.test.ts), [`decorators.test.ts`](../src/core/computed/decorators.test.ts) | ✅ Good |
| Boolean operations | — | ❌ None |
| Contour operations | — | ❌ None |
| Mesh operations | — | ❌ None |
| I/O formats | — | ❌ None |
| Algorithms | — | ❌ None |
| E2E | [`e2e/console-errors.spec.ts`](../e2e/console-errors.spec.ts) | ✅ Minimal |

---

## 📋 Summary — Priority Ranking

### Tier 1: Must-Have (unblocks basic CAD workflow)

| # | Feature | Reason |
|---|---|---|
| 1 | Wire up csgrs WASM for 3D booleans | Booleans are fundamental; JSCAD fallback is unreliable |
| 2 | Add 2D offset | Enables clearance, wall thickness, nesting |
| 3 | Add fillet/chamfer | Most-requested CAD operation |

### Tier 2: Should-Have (significantly improves capability)

| # | Feature | Reason |
|---|---|---|
| 4 | Add shell/hollow | Needed for 3D printing, lightweight parts |
| 5 | Add mirror | Symmetry is universal in CAD |
| 6 | Add array/pattern | Duplication is a basic workflow |
| 7 | Add text-to-contour | Essential for labels, logos, text parts |
| 8 | Add Bezier/spline curves | Needed for organic shapes |

### Tier 3: Nice-to-Have (enhances polish)

| # | Feature |
|---|---|
| 9 | Subdivision surfaces |
| 10 | Mesh decimation |
| 11 | Normal computation |
| 12 | Undo/redo |
| 13 | Constraint system |
| 14 | Measurement tools |
| 15 | Snapping |
| 16 | Mesh repair (hole-filling, normal fixing, manifold repair) |
| 17 | Additional export formats (STEP, 3MF, GLTF) |
| 18 | Test coverage for booleans, contours, and mesh operations |
