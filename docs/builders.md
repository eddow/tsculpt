# Computed Architecture

This document describes the architecture for the "computed" layer built on top of the existing synchronous geometry classes.

The goal is to preserve a syntax-friendly, fluent API while supporting:

- synchronous or asynchronous implementations
- transparent chaining without repeated `await`
- invalidation and recomputation
- global functions and instance methods computed in a uniform way
- automatic wrapping of returned base-class values into their corresponding computed classes

This architecture replaces the earlier `PromiseChain` direction with an explicit dependency-graph model.

## Terms

### Base class

A synchronous or maybe-asynchronous implementation class containing the real domain logic.

Examples:

- `ContourBase`
- `MeshBase`

Base classes:

- receive resolved synchronous arguments
- return a synchronous value or a promise
- do not know about invalidation, dependency graphs, or computed wrappers

### Computed class

A public facade class wrapping a computation whose resolved value is an instance of a base class.

Examples:

- `Contour = computedClass(ContourBase)`
- `Mesh = computedClass(MeshBase)`

A computed class:

- exposes the same fluent API as the corresponding base class for decorated methods
- creates computation nodes instead of eagerly executing methods
- supports invalidation and recomputation
- exposes `compute()` to resolve the current value

### `Computed<T>`

Public type-level transformation from a base class to its computed facade surface.

Example:

- `type Contour = Computed<ContourBase>`

`Computed<T>` is the public computed API surface for values based on `T`.

Internally, a computed instance is backed by a computation node. That internal runtime concept is not a `Promise<T>` and may hold:

- a cached resolved value
- a current promise for the current version
- dependency links
- invalidation listeners
- a computer function used to recompute the value

### Computed method

A base-class method marked with `@computed()` so it is exposed on the computed class.

Computed methods:

- accept computed or plain arguments at the facade level
- resolve their inputs before invoking the base implementation
- return computed wrappers instead of raw values

### Computed function

A global function created with `lift(...)`.

Example:

- `linearExtrudeBase(contour: ContourBase): MeshBase | Promise<MeshBase>`
- `const linearExtrude = lift(linearExtrudeBase)`

The computed version:

- accepts computed or plain values
- resolves dependencies
- returns a computed wrapper around the result

## High-level model

The system is a dependency graph of computations.

Each computed value is a node with:

- zero or more dependencies
- a computer function
- cached state for the current version
- an invalidation mechanism

Chaining methods does not immediately compute results. It builds a graph.

Example:

```ts
const out = new Contour(...)
  .translate(v)
  .rotate(a)
  .union(other)
```

Conceptually builds:

1. a constructor node for `new Contour(...)`
2. a `translate` node depending on the constructor node and `v`
3. a `rotate` node depending on the `translate` node and `a`
4. a `union` node depending on the `rotate` node and `other`

When `compute()` is called on the final node, dependencies are resolved recursively and the result is produced for the current version.

When a dependency is invalidated, all downstream nodes become invalid too.

## Core semantics

### `compute()`

`compute()` resolves and returns the current value for the current version.

Properties:

- returns a `Promise<T>`
- may reuse a cached promise while the node is still valid
- after invalidation, a later `compute()` may return a different promise representing a newer version

`compute()` is preferred over exposing a raw `.promise` property because promises are one-shot snapshots, while computed values can be invalidated and recomputed.

### Invalidation

Each computed node supports invalidation.

Invalidation means:

- the cached value is no longer current
- the cached promise is discarded
- dependent nodes are also invalidated
- the next `compute()` triggers a recomputation

Every computed node should expose an invalidation event.

Conceptually:

```ts
interface Computation<T> {
  compute(): Promise<T>
  invalidate(): void
  onInvalidate(listener: () => void): () => void
}
```

### Computer function

Each node owns a computer function that:

- reads the resolved values of its dependencies
- calls the underlying base method, base constructor, or computed function
- returns a synchronous or asynchronous result

Computer functions always work on resolved plain values, never on `Computed<...>` wrappers.

## Separation of concerns

### Base layer responsibilities

Base classes and base functions:

- implement real geometry behavior
- stay close to the current synchronous API
- accept resolved arguments
- return plain values or promises

They do not:

- know about invalidation
- propagate dependency changes
- wrap values in computed facades

### Computed layer responsibilities

The computed layer:

- tracks dependencies
- resolves computed arguments
- propagates invalidation
- wraps raw returned values into computed facades
- exposes the fluent public API

This keeps the domain logic separate from the computation-graph logic.

## Naming

The agreed nomenclature is:

- public computed type: `Computed<T>`
- resolution method: `compute()`
- method decorator: `@computed()`
- class transformer: `computedClass(...)`
- function transformer: `lift(...)`
- registry for base to computed classes: global computed-class registry

Examples:

```ts
class ContourBase {
  @computed()
  translate(...) { ... }
}

const Contour = computedClass(ContourBase)
type Contour = Computed<ContourBase>
```

## Type-level transformation

The guiding rule is:

- raw function or method:
  - `f(A, B) -> C | Promise<C>`
- computed function or method:
  - `f(Computed<A>, Computed<B>) -> Computed<C>`

In practice, computed call sites should also accept already-resolved values, not only computed ones.

So the accepted argument shape is conceptually:

```ts
type Computable<T> = T | Promise<T> | Computed<T>
```

Type transforms should therefore generally accept `Computable<Arg>` as input and return a computed wrapper of the result.

For classes:

- `Computed<ContourBase>` exposes fluent methods corresponding to decorated methods of `ContourBase`
- methods return computed wrappers rather than raw base values

## `computedClass(BaseClass)`

`computedClass(...)` is the main entry point for creating public computed classes from base classes.

Responsibilities:

1. Create a facade class whose instances are `Computed<BaseClass>`
2. Lift the constructor so `new Contour(...)` creates a computation node, not a resolved `ContourBase` immediately
3. Read `@computed()` metadata from the base prototype
4. Install wrapper methods on the computed class prototype
5. Register the base class to computed class mapping globally

Conceptual usage:

```ts
class ContourBase {
  @computed()
  translate(v: Vector2): ContourBase { ... }

  @computed()
  union(other: ContourBase): ContourBase | Promise<ContourBase> { ... }
}

const Contour = computedClass(ContourBase)
type Contour = Computed<ContourBase>
```

## Constructor lifting

The computed-class constructor accepts computed or plain constructor arguments.

Example:

```ts
const contour = new Contour(points, holes)
```

Conceptually means:

1. resolve constructor arguments when needed
2. call `new ContourBase(...resolvedArgs)`
3. cache the result as the current value of the node

So a computed class constructor is itself a node factory.

## `@computed()` decorator

`@computed()` is metadata-only.

It must not rewrite the base method into a computed-aware implementation.

Its role is to record:

- method name
- whether the method should appear on the computed facade
- optionally, wrapping metadata for special return handling

Why metadata-only:

- base classes remain pure domain classes
- plain base instances still behave normally
- computed behavior stays centralized in `computedClass(...)` and `lift(...)`
- debugging remains simpler

Default rule:

- a decorated instance method returning the same base-class family is rewrapped as the same computed class

Example:

- `ContourBase.translate(...) -> ContourBase`
- computed `Contour.translate(...) -> Contour`

## Method lifting semantics

Given a decorated method:

```ts
class ContourBase {
  @computed()
  rotate(angle: number): ContourBase | Promise<ContourBase> { ... }
}
```

The computed facade method behaves conceptually like:

```ts
class Contour extends Computed<ContourBase> {
  rotate(angle: Computable<number>): Contour {
    return new Contour(async () => {
      const self = await this.compute()
      const resolvedAngle = await resolve(angle)
      return self.rotate(resolvedAngle)
    })
  }
}
```

Important properties:

- the method creates a new computation node
- it does not eagerly compute unless needed
- dependencies are tracked
- invalidation propagates from inputs to the result

## Global function lifting with `lift(...)`

Global functions are computed the same way as methods.

Example:

```ts
function linearExtrudeBase(contour: ContourBase): MeshBase | Promise<MeshBase> { ... }
const linearExtrude = lift(linearExtrudeBase)
```

Computed behavior:

- accepts `Computable<ContourBase>`
- resolves arguments when computing
- calls the original base function
- wraps the returned raw value using the global registry

This allows the original base function to remain unexported if desired, while the public exported API is only the computed one.

## Global registry

Each computed class created by `computedClass(BaseClass)` must be registered globally.

Purpose:

- if a computed function or method returns an instance of a registered base class, the runtime can instantiate the corresponding computed wrapper automatically

Example registry entries:

- `ContourBase -> Contour`
- `MeshBase -> Mesh`

This solves the general wrapping problem for:

- global computed functions
- cross-class returns
- generic wrapping when the current computed class is not known statically

### Registry lookup rule

When a result is produced:

1. inspect the resolved result
2. if it is an instance of a registered base class, wrap it in the corresponding computed class
3. if needed, support prototype-chain lookup, not only exact constructor lookup
4. if no base class is registered, wrap the result in a generic `Computed<T>` value wrapper

Prototype-chain lookup is recommended so subclasses can still resolve to an appropriate registered computed class.

## Wrapping rules

### Same-class instance methods

For a decorated method on `ContourBase` returning `ContourBase`, the wrapper can directly return `Contour`.

This is the common case for:

- `translate`
- `rotate`
- `scale`
- `union`
- `intersect`
- `subtract`

### Cross-class returns

If a method or function returns another registered base class, use the registry.

Example:

- `linearExtrudeBase(contour: ContourBase): MeshBase`
- computed `linearExtrude(contour: Contour): Mesh`

### Plain value returns

If the result is not a registered base instance, return a generic computed value wrapper.

Examples:

- triangulation results
- scalar values
- plain objects
- vectors if vectors are not themselves registered as computed classes

## Fallback computed value wrapper

Not every result should become a domain-specific computed class.

For non-registered values, use a generic computed value wrapper, conceptually:

```ts
class ComputedValue<T> implements Computed<T> {
  compute(): Promise<T> { ... }
  invalidate(): void { ... }
  onInvalidate(listener: () => void): () => void { ... }
}
```

This avoids requiring every possible return type in the system to have a dedicated computed class.

## Dependency tracking

Each derived node should subscribe to invalidation events of its dependencies.

When any dependency invalidates:

1. the node marks itself invalid
2. it clears its cached current promise/value
3. it emits its own invalidation event
4. downstream nodes repeat the same behavior

This gives automatic invalidation propagation across chains.

## Caching

Each node should cache the promise or resolved value for the current version.

Expected behavior:

- repeated `compute()` calls without invalidation reuse the same current computation
- after invalidation, a new `compute()` starts a fresh computation

The cache belongs to the node version, not globally forever.

## Error behavior

If the computer function rejects:

- the current computation for that version rejects
- the node remains invalid or errored according to implementation choice
- a later invalidation must allow a fresh recomputation attempt

The important rule is that error handling must not permanently poison future versions unless that is explicitly intended.

## API design principles

### Keep base classes close to current code

Base classes should stay simple and domain-focused.

Prefer:

- sync implementations where practical
- promise returns only where operations are inherently async
- normal method signatures with resolved arguments

Avoid pushing computed-specific machinery into the base layer.

### Computed layer is the public facade

End users should generally interact with computed classes and computed functions, not the raw base functions.

This gives a uniform syntax where chaining is natural and async/invalidation concerns stay hidden behind the computation layer.

### Prefer `compute()` over exposing raw promise identity

Because invalidation can produce new promises over time, `compute()` is the stable abstraction.

### Decorators are metadata, not behavior rewriting

This keeps the separation between:

- "what this domain method does"
- "how this method is exposed in the computed layer"

## Example shape

```ts
class ContourBase {
  @computed()
  translate(v: Vector2): ContourBase {
    ...
  }

  @computed()
  rotate(angle: number): ContourBase {
    ...
  }

  @computed()
  union(...others: ContourBase[]): ContourBase | Promise<ContourBase> {
    ...
  }
}

const Contour = computedClass(ContourBase)
type Contour = Computed<ContourBase>

function linearExtrudeBase(contour: ContourBase): MeshBase | Promise<MeshBase> {
  ...
}

const linearExtrude = lift(linearExtrudeBase)

const out = new Contour(...)
  .translate(v)
  .rotate(a)
  .union(other)

const mesh = linearExtrude(out)
const resolved = await mesh.compute()
```

## Migration walkthrough

This section describes how to replace `PromiseChain` with the computed paradigm while keeping the application behavior equivalent to the current one.

The migration goal is:

- keep the same user-facing modeling behavior
- preserve the current fluent style
- make asynchronous implementations natural
- allow DI-provided implementations to be written in TypeScript today and replaced by WASM-backed implementations later

### Why `PromiseChain` should disappear

`PromiseChain` tries to make asynchronous geometry behave like a synchronous fluent object. That is attractive syntactically, but it does not model invalidation, dependency tracking, or recomputation explicitly.

This becomes especially limiting when:

- the same logical object may need to recompute after a parameter change
- asynchronous backends, such as WASM initialization or WASM calls, become normal rather than exceptional
- only part of a model should be recalculated

The computed paradigm replaces this with an explicit graph model:

- a geometry result is a computed value, not a promise-like chain
- dependencies are tracked
- invalidation is propagated
- recomputation happens on demand through `compute()`

### Compatibility target

The target is that the application still works as it does now:

- model code still builds geometry fluently
- the worker still ultimately resolves a mesh before packing it
- DI still provides algorithms behind stable domain-level names
- synchronous implementations still work
- asynchronous implementations still work

What changes is the internal contract:

- instead of pretending that a pending value already is the final domain object
- the system builds a graph of computed values and resolves it explicitly at the boundary

### Step 1: introduce computed infrastructure without changing algorithms

First, add the generic computed layer:

- `Computation<T>` runtime contract
- `Computed<T>` public type surface
- `computedClass(...)`
- `@computed()`
- `lift(...)`
- global computed-class registry

At this stage:

- existing geometry code can remain mostly unchanged
- existing algorithms can still return plain values or promises
- the computed layer simply wraps those results

The computed layer should be additive first, not a destructive rewrite.

### Step 2: define base classes explicitly

The current geometry classes should become the base layer conceptually.

Examples:

- current contour implementation becomes `ContourBase`
- current mesh implementation becomes `MeshBase`

These base classes continue to:

- accept resolved arguments
- return plain values or promises
- contain the real geometry logic

They should not be made dependency-aware.

### Step 3: create computed public classes

For each base class, create a computed public facade:

- `const Contour = computedClass(ContourBase)`
- `const Mesh = computedClass(MeshBase)`

These computed classes become the public modeling surface.

They are responsible for:

- accepting computed or plain inputs
- creating new graph nodes on method calls
- delegating actual work to base-class methods
- rewrapping results

At that point, fluent user code can keep the same feel:

```ts
const result = new Contour(...)
  .translate(v)
  .rotate(a)
  .union(other)
```

but the semantics are now graph-based rather than promise-chain-based.

### Step 4: replace `PromiseChain` return types with base returns

Current places that expose `PromiseChain<T>` should stop doing so.

Instead:

- base methods return `T | Promise<T>`
- computed methods return `Computed<T>`

So:

- `ContourBase.union(...): ContourBase | Promise<ContourBase>`
- computed `Contour.union(...): Computed<ContourBase>` which in practice is the `Contour` facade type

This change should be applied first to the public async hotspots:

- boolean operations
- triangulation
- extrusion-related helpers

The important point is that the async nature remains in the base implementation, while the public API becomes computed.

### Step 5: migrate global functions

Global functions should follow the same rule.

Keep an internal base function:

```ts
function linearExtrudeBase(contour: ContourBase): MeshBase | Promise<MeshBase>
```

and expose:

```ts
const linearExtrude = lift(linearExtrudeBase)
```

This makes global functions and methods consistent.

It also means the original base function may remain internal if desired, while the public API is entirely computed-oriented.

### Step 6: move application boundaries to `compute()`

The system should only resolve computed graphs at explicit boundaries.

For this project, the main boundary is rendering in the worker.

Today the worker already resolves a final mesh-like result before packing it. That is the right pattern to preserve.

Conceptually, the render flow becomes:

1. user code builds a graph of computed values
2. the selected entry returns a computed mesh or a plain/promised mesh
3. the render boundary normalizes that result
4. if the result is computed, call `compute()`
5. pack the resolved mesh

So the worker remains the main place where a final mesh is forced.

### Step 7: use invalidation for parameter-driven recalculation

This is one of the core benefits of the new model.

When a parameter changes:

- the parameter node invalidates
- all dependent nodes invalidate
- unrelated nodes remain valid
- the next `compute()` only recomputes the affected subgraph

This is exactly the behavior needed when a user edits a part parameter in the application.

Example:

```ts
const radius = parameter(10)
const wheel = circle(radius).extrude(5)
const axle = cylinder(2, 8)
const part = union(wheel, axle)

radius.set(12)
const updated = await part.compute()
```

Expected recomputation:

- `wheel` recomputes
- `part` recomputes
- `axle` stays cached

### DI integration

DI should remain the provider mechanism for geometry algorithms, but it must integrate with computed values cleanly.

The current DI contract is already close to what is needed:

- services may be synchronous or asynchronous
- forwarders already return `MaybePromise`
- registration may itself be asynchronous

This is good news, because WASM-backed services fit naturally into this model.

#### Rule for DI

DI services should continue to expose base-level functions.

That means:

- DI returns domain-level algorithms operating on resolved base values
- DI does not return computed wrappers directly
- computed wrappers live above DI, not inside it

So the layering becomes:

1. computed layer resolves dependencies and gets plain base values
2. base methods or lifted functions call DI forwarders
3. DI resolves to TS or WASM implementations
4. returned plain or promised base values are rewrapped by the computed layer

This separation keeps DI focused on algorithm provisioning rather than graph management.

#### Why this matters

If DI started returning computed values directly:

- dependency ownership would become ambiguous
- invalidation could be triggered in the wrong layer
- service implementations would become coupled to the public computed abstraction

Keeping DI at the base layer avoids that.

### WASM integration

The main strategic reason for this architecture is that WASM naturally behaves like a promise-oriented backend.

Typical async points include:

- loading or instantiating a WASM module
- lazy initialization of algorithm services
- asynchronous calls into a worker-backed or streamed WASM interface
- future algorithm implementations whose setup cost should remain hidden from the modeling surface

Under the computed architecture, this is no longer special.

The rule is simply:

- base code may return `T | Promise<T>`
- DI services may resolve asynchronously
- computed nodes treat all these async edges as normal inputs to `compute()`

So "WASM = Promise" becomes manageable because:

- async is explicit in the base layer
- graph recomputation is explicit in the computed layer
- user-facing modeling code remains fluent

### How DI should support WASM-backed services

The clean model is:

- keep service names stable
- allow service registration to be async
- allow each service function to remain `T | Promise<T>`
- let DI keep forwarding unresolved promises where appropriate
- let computed nodes await those results as part of normal computation

This means a service can evolve like this:

1. pure TypeScript implementation
2. TypeScript wrapper around lazily initialized WASM
3. full WASM-backed implementation

without changing the public computed API.

### Suggested migration order

To minimize breakage, migrate in this order:

1. finish the generic computed infrastructure
2. adapt the worker boundary to accept computed results and call `compute()`
3. introduce computed public facades for contour and mesh
4. convert boolean operations from `PromiseChain` to base returns plus computed wrappers
5. convert triangulation and extrusion helpers
6. keep DI services returning base values or promises
7. swap selected DI implementations to WASM-backed async versions
8. remove `PromiseChain` entirely once all public async entry points are computed-based

This order keeps the system working during the transition.

### Transitional coexistence

During migration, it is acceptable for the codebase to temporarily contain:

- old `MaybePromise`-based helpers
- DI forwarders returning `MaybePromise`
- new computed wrappers around those helpers

What should be avoided is inventing another public promise-like facade next to computed values.

The end state should be:

- base layer: plain values or promises
- computed layer: graph-based public API
- boundary layer: explicit `compute()`

### End-state mental model

After migration:

- the modeling API is computed-first
- the base layer contains the actual geometry algorithms
- DI provides algorithm implementations in TS or WASM
- async from WASM is absorbed naturally as part of computation
- invalidation lets the app recompute only what changed

This preserves the application behavior while making asynchronous backends a first-class part of the design rather than a special case papered over by `PromiseChain`.

## Summary

The agreed architecture is:

- keep raw domain logic in synchronous or maybe-asynchronous base classes and base functions
- expose public computed facades via `computedClass(...)`
- represent every public chained result as a `Computed<T>` value backed by a computation node
- resolve values with `compute()`
- propagate changes through invalidation events
- use `@computed()` to mark base methods that must appear on computed facades
- use `lift(...)` for global functions
- use a global base-to-computed-class registry so returned base values can be wrapped automatically
- fall back to a generic computed value wrapper for non-registered result types
- keep DI at the base layer so TS and WASM implementations can stay interchangeable
- let invalidation recompute only the affected subgraph after parameter changes

This yields a syntax-friendly fluent API with explicit recomputation semantics and without relying on promise-like hacks or proxy-driven magic as the core model.
