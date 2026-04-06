# Grimoire of Code — Visual Enhancement Plan

## Overview

Six visual improvements to make the magic circle visualization richer, more meaningful, and more faithful to traditional magic circle aesthetics. Ordered by implementation dependency.

---

## Improvement 1: Linked Satellite Circles for Complex Control Flow

**Goal**: Promote complex control flow (deep loops, heavy branching, multiple try blocks) from tiny sub-circle icons into their own linked mini magic circles positioned outside the main rim.

**Promotion threshold**:
- Loop: parent has `nestingDepth >= 2` AND `loopCount + branchCount >= 4`
- Branch: `branchCount >= 5`
- Try: `tryCount >= 2`

**Visual treatment**: Each satellite is a scaled-down magic circle (own rune band, center glyph, tick marks, mini radial burst). Connected to parent by a thick bridge arc with traveling particle and gateway decoration at the rim.

**Layout**: Satellites orbit outside `BANDS.rim.outer` at staggered distances (310, 340, 370). ViewBox expands from 600 to ~800. Sector-aware angular placement matches parent function position.

**Files**: `src/types/ir.ts` (new `SatelliteCircle` type), `src/lib/layout.ts` (new `computeSatelliteCircles()`), new `SatelliteCircle.tsx` + `BridgeConnector.tsx` components, `index.tsx` (new layer + viewBox).

---

## Improvement 2: Inscribed Geometric Shapes as Semantic Grammar

**Goal**: Replace the single-purpose `StarPolygonLayer` with layered inscribed shapes that encode code characteristics.

**Shape rules**:
- Triangle: significant 3-way branching (`totalBranches >= 3`)
- Square: 4+ structural domains (imports, classes, functions, variables each present)
- Pentagon: high cyclomatic complexity (`totalComplexity > 12`)
- Hexagram (two counter-rotating triangles): recursion present

Multiple shapes stack at different radii (112-162) and counter-rotate at different speeds (70s, 85s, 100s).

**Files**: `src/types/ir.ts` (new `InscribedShape` type, extend `ModuleMetrics`), `src/lib/layout.ts` (new `computeInscribedShapes()`), rewrite `StarPolygonLayer.tsx`, update `index.tsx`.

---

## Improvement 3: Sector Division with Visual Atmosphere

**Goal**: Divide the circle into 4 named semantic sectors, each with a subtle visual identity.

**Sectors** (measured from top, clockwise):
- North (-45deg to 45deg): Functions — "INVOCATIONS"
- East (45deg to 135deg): Imports — "BINDINGS"
- South (135deg to 225deg): Variables + control — "FOUNDATION"
- West (225deg to 315deg): Classes + methods — "INNER WORKINGS"

Depth-1 nodes are placed within their type's sector angular range instead of evenly around 360deg. Empty sectors cause neighbors to expand.

**Files**: `src/lib/layout.ts` (sector-aware `layoutChildren`), new `SectorDividers.tsx` (boundary lines, terminals, curved labels, faint gradient wedges), update `index.tsx`.

---

## Improvement 4: Enriched Node Glyphs (Micro Magic Circles)

**Goal**: Give function/method nodes internal geometry reflecting their complexity. Only for nodes with radius >= 10.

**Internal geometry**:
- Concentric rings: count = `min(loopCount, 3)`
- Radial micro-spokes: count = `min(branchCount, 6)`
- Central polygon: vertices = `min(paramCount, 6)`
- Detail opacity scales with `nestingDepth`

**Files**: `NodeChip.tsx` — extract new `FunctionGlyph` component with internal detail. Rendering-only change, no layout modifications.

---

## Improvement 5: Arc-Routed Call Edges (Energy Conduits)

**Goal**: Route call edges along circle geometry instead of straight bezier cuts. Scale width by importance.

**Routing**: 3-segment path — radial inward to routing ring (r=145), arc along ring, radial outward to target. Shorter arc direction chosen automatically.

**Importance scaling**: Width 1.0-2.5 based on incoming edge count. Nexus points (pulsing bright dots) at nodes with 3+ callers. Multiple particles for hot paths. Comet-tail glow trail.

**Files**: `src/components/MagicCircle/constants.ts` (new `buildArcEdges()`), rewrite `CallEdges.tsx`, add `callRouting` band to `BANDS`.

---

## Improvement 6: Rune Band Semantic Encoding

**Goal**: Make rune bands encode actual code information with type-specific alphabets.

**Encoding**:
- Inner band: function/method signatures. Segment size proportional to complexity. Dense runes for complex functions.
- Outer band: import paths and dependency names.
- Alphabets: Futhark for functions, Greek for classes, planetary symbols for imports, mathematical operators for variables.

**Files**: `src/lib/runes.ts` (new `GLYPH_SETS`, `encodeByType()`, `generateSemanticBand()`), update `RuneBand.tsx` (accept semantic text), update `index.tsx`.

---

## Future Work

### Improvement 7: Vesica Piscis Coupling
Overlapping circles for tightly-coupled function pairs (mutual callers). Shared almond-shaped region. Flower-of-life patterns for 3+ coupled functions.

### Improvement 8: Depth Stacking (Pseudo-3D)
Nested scopes as translucent stacked circles with vertical offset. Outermost scope = base. Each deeper level = smaller, more transparent, offset upward. Connected by vertical energy columns.

---

## Implementation Order

1. Architecture document (architecture.md)
2. Improvement 2 — Inscribed Shapes (self-contained, high visual impact)
3. Improvement 4 — Enriched Glyphs (rendering-only, moderate impact)
4. Improvement 3 — Sector Division (layout change, backwards-compatible)
5. Improvement 6 — Rune Band Encoding (parser + rendering)
6. Improvement 5 — Arc-Routed Edges (moderate complexity)
7. Improvement 1 — Satellite Circles (largest: new layout, components, viewBox)
