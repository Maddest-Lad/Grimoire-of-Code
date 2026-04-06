# Grimoire of Code — Architecture Reference

## Pipeline Overview

```
Code (string)  -->  Parser  -->  IR Tree  -->  Layout Engine  -->  LaidOut Tree  -->  React SVG Renderer
                  (parser.ts)   (IRNode)    (layout.ts)        (LaidOutNode)     (MagicCircle/*)
```

The app is a **split-pane layout**: Monaco editor on the left, live SVG magic circle on the right. State flows through Zustand, and the pipeline is fully synchronous (no web workers yet despite the plan mentioning them).

---

## File Map

### Types
| File | Purpose |
|------|---------|
| `src/types/ir.ts` | All core type definitions: `IRNode`, `LaidOutNode`, `SubCircle`, `ModuleMetrics`, `NodeType`, `Language` |

### Core Logic
| File | Purpose |
|------|---------|
| `src/lib/parser.ts` | Regex-based code parser. Produces `IRNode` tree from source string. Supports JS/TS (`parseJS`), Python (`parsePython`), and generic fallback (`parseGeneric`). |
| `src/lib/layout.ts` | Converts `IRNode` tree into positioned `LaidOutNode` tree. Defines radial band system (`BANDS`), computes node positions, sub-circles, and module metrics. |
| `src/lib/runes.ts` | Deterministic glyph generation via djb2 hash. `moduleRunes()` generates rune band text from seed string. |
| `src/lib/detect.ts` | Language autodetection via highlight.js. |

### State
| File | Purpose |
|------|---------|
| `src/store/useStore.ts` | Zustand store: `code`, `selectedLanguage`, setters. Contains default code sample. |

### App Shell
| File | Purpose |
|------|---------|
| `src/App.tsx` | Root component. Orchestrates: detect language -> parse code -> compute layout -> render. Contains `LanguageSelector` and stats bar. |
| `src/components/Editor.tsx` | Monaco editor wrapper. |

### Magic Circle Components
| File | Purpose |
|------|---------|
| `src/components/MagicCircle/index.tsx` | Main SVG container. Orchestrates all layers in z-order. Props: `layout`, `metrics`, `language`, `subCircles`. |
| `src/components/MagicCircle/constants.ts` | Shared constants: `CX`/`CY` (300,300), `NODE_COLORS`, polygon/star path builders, `flattenNodes()`, `buildEdges()`, import classification. |
| `src/components/MagicCircle/Background.tsx` | Background disc, rim tick marks (36 at 10deg intervals), cardinal symbols, border rings. |
| `src/components/MagicCircle/StarPolygonLayer.tsx` | Inner geometric core: outer polygon, star polygon, mid polygon, inner counter-rotating polygon. Vertex count = `topLevelCount` (clamped 3-12). |
| `src/components/MagicCircle/RadialBurst.tsx` | Radiating spokes from inner to outer burst band. 24-72 lines, density proportional to `totalComplexity`. Every 4th line flickers. |
| `src/components/MagicCircle/RuneBand.tsx` | Rotating text along circular SVG path. Takes seed string, generates runes via `moduleRunes()`. Inner band: CCW 42s. Outer band: CW 58s. |
| `src/components/MagicCircle/StabilityRing.tsx` | Status indicator at r=240. Stable: solid ring. Unstable (tries>=2 or high branch density): fragmented flickering ring. |
| `src/components/MagicCircle/CenterSigil.tsx` | Central emblem: outer polygon+star, middle rings, rotating inner polygon, core circle with language badge. Breathes at rate proportional to complexity. |
| `src/components/MagicCircle/NodeChip.tsx` | Individual node glyph. Dispatches to type-specific sub-components: `ClassGlyph` (hexagon), `ImportGlyph` (4 import categories), function (circle+dot), method (diamond), variable (square). Decorations: `LoopArcs`, `BranchDots`, `TryFracture`, `ParamDots`, recursion halo, label. |
| `src/components/MagicCircle/LoopArcs.tsx` | 1-4 rotating arc segments orbiting a node. Uses SVG `animateTransform` for stable pivot. |
| `src/components/MagicCircle/SubCircle.tsx` | Control flow satellite: outer ring + type-specific internal geometry (`LoopGeometry`, `BranchGeometry`, `TryGeometry`). Connected to parent by dashed line. |
| `src/components/MagicCircle/SubCircleLayer.tsx` | Container that renders all SubCircle components with parent node lookup. |
| `src/components/MagicCircle/CallEdges.tsx` | Quadratic bezier curves between caller/callee. Traveling light particle via SVG `animateMotion`. |
| `src/components/MagicCircle/ParentOrbitRing.tsx` | Faint dashed mini-orbit ring for parent nodes with depth-2 children. |
| `src/components/MagicCircle/IdleCircle.tsx` | Placeholder shown when no code is entered. Three concentric rings + dim radial lines + pulsing center. |

---

## Type Definitions (src/types/ir.ts)

### NodeType
`'module' | 'function' | 'class' | 'method' | 'import' | 'variable' | 'control'`

### IRNode
The parser's output. A tree rooted at a `module` node.
- `id`, `type`, `name`, `children: IRNode[]`, `calls: string[]`
- `complexity` (1 + loops + branches + tries, capped at 20)
- `depth` (0=module, 1=top-level, 2=class methods, etc.)
- `isRecursive`, `lineCount`
- Control flow: `loopCount` (cap 6), `branchCount` (cap 8), `tryCount`, `returnCount`, `paramCount` (cap 6), `nestingDepth`

### LaidOutNode
Post-layout. Same fields as IRNode plus:
- `x`, `y` (SVG coordinates in 600x600 viewBox)
- `radius` (visual radius, 6-16px)
- `angle` (radians from top)
- `orbitRadius` (radius of the ring this node sits on)
- `localOrbitRadius?` (for parents: radius of children's mini-orbit)
- `children: LaidOutNode[]`

### SubCircle
Control flow satellite attached to a node.
- `type: 'loop' | 'branch' | 'try'`
- `cx`, `cy`, `radius` (10-24px), `count`, `parentId`, `angle`

### ModuleMetrics
Aggregated stats: `totalLoops`, `totalBranches`, `totalTries`, `totalComplexity`, `topLevelCount`, `runeSeedString`.

---

## Radial Band System (layout.ts BANDS)

The SVG viewBox is 600x600, center at (300, 300). All geometry lives within concentric bands:

```
Band            Inner    Outer    Purpose
─────────────── ──────── ──────── ─────────────────────────────────
center          0        55       Root module / CenterSigil
radialBurst     57       108      Radiating spoke lines
starPolygon     112      162      Inscribed polygon geometry
innerRune       174      188      Inner rotating rune text band
nodeOrbit       —        r=195    Main orbital ring (depth-1 nodes)
stability       —        r=240    Stability indicator ring
outerRune       251      266      Outer rotating rune text band
rim             276      292      Tick marks, cardinal symbols, border
```

---

## Layout Algorithm (layout.ts)

### Depth-1 nodes
- Spread evenly around `nodeOrbit.radius` (195)
- Start angle: `-PI/2` (top), clockwise
- Node radius: `6-16px` based on complexity and sibling count
- Each parent node gets `localOrbitRadius = clamp(20 + childCount * 2.5, 20, 42)`

### Depth-2+ nodes
- Orbit around their **parent** (not the global center)
- Spread evenly around parent at `localOrbitRadius`
- Clamped to viewBox bounds

### Sub-circles
- Created for nodes with: `loopCount >= 1`, `branchCount >= 3`, or `tryCount >= 1`
- Positioned radially from parent at `node.radius + subR + 5px`
- 12-attempt spiral collision avoidance against all existing nodes and sub-circles
- Radius: `clamp(8 + count * 3, 10, 24)`

### Call edges
- Built from `node.calls` resolved to node IDs
- Quadratic bezier: midpoint pulled 55% toward center for curve control point
- Deduplicated by sorted ID pair

---

## Rendering Layer Order (index.tsx)

1. Background (disc + rim + tick marks)
2. StarPolygonLayer (inner geometric core)
3. RadialBurst (radiating spokes)
4. RuneBand inner (CCW rotation, 42s period)
5. Main orbital ring (dashed circle at r=195)
6. ParentOrbitRings (mini-orbits for depth-2 children)
7. StabilityRing (r=240, stable or flickering)
8. Spokes (faint lines from center to depth-1 nodes)
9. RuneBand outer (CW rotation, 58s period)
10. CallEdges (bezier curves + traveling particles)
11. SubCircleLayer (control flow satellites)
12. NodeChips (all node glyphs, AnimatePresence)
13. CenterSigil (central emblem, always on top)

---

## Node Visual System (NodeChip.tsx)

### Glyph by type
- **function**: Circle + center dot. Glow filter.
- **class**: Hexagon (`ClassGlyph`). Inner circles for methods (up to 8).
- **method**: Diamond (4-point polygon).
- **import**: `ImportGlyph` dispatches by category:
  - `relative` (./..): inward arrow
  - `scoped` (@-prefix): pentagon
  - `stdlib`: rounded square
  - `package`: outward triangle
- **variable**: Square.

### Decorations (suppressed when corresponding SubCircle exists)
- **LoopArcs**: 1-4 rotating arc segments (2.8-5.2s periods)
- **BranchDots**: 1-6 dots above node (when branchCount >= 1)
- **TryFracture**: Zigzag line across node
- **ParamDots**: 1-5 dots below node
- **Recursion halo**: Two dashed concentric circles (r+8, r+12)
- **Label**: Monospace text, truncated to 14 chars, positioned radially outward

---

## Color Palette (constants.ts)

| Type     | Fill      | Stroke    |
|----------|-----------|-----------|
| module   | `#1a0a2e` | `#c084fc` |
| function | `#1e1040` | `#a855f7` |
| class    | `#0e2040` | `#60a5fa` |
| method   | `#0e1830` | `#22d3ee` |
| import   | `#0e2820` | `#34d399` |
| variable | `#1a1a2e` | `#94a3b8` |
| control  | `#2a1010` | `#f59e0b` |

Sub-circle colors: loop=purple (`#a855f7`), branch=amber (`#f59e0b`), try=red (`#ef4444`).

Import sub-colors: relative=`#a78bfa`, scoped=`#2dd4bf`, stdlib=`#34d399`, package=varies by djb2 hash.

---

## Parser System (parser.ts)

### JS/TS (`parseJS`)
- Line-by-line regex scanning of top-level declarations
- Recognizes: `import`, `require`, `class`, `function`, `const/let/var = () =>`, `const/let/var = function`
- Class methods extracted via `parseClassMethods()` (constructor + method patterns)
- Body analysis: regex counting of `for/while/do`, `if/else/switch/case/?/&&/||/??`, `try`, `return`
- Brace-depth tracking for nesting depth
- Call detection: second pass via regex `identifier(` matching against known top-level names
- Recursion: direct self-call or mutual two-way call detection

### Python (`parsePython`)
- Indent-stack based parsing
- Recognizes: `import/from`, `class`, `def/async def`
- Body analysis: indent-based nesting depth, same keyword counting
- Call detection same as JS but with Python keyword exclusions

### Generic fallback (`parseGeneric`)
- Regex patterns for `fn/func/def` (functions), `struct/class/interface/type/enum` (classes), `use/using/include/require/import`
- No call detection or body analysis

---

## Rune System (runes.ts)

- `GLYPH_SET`: 50+ Unicode characters (Elder Futhark runes, geometric symbols, letterlike symbols)
- `djb2(str)`: Deterministic 32-bit hash
- `nameToRunes(name, length)`: Maps identifier to short rune string
- `moduleRunes(seed, count)`: Generates long rune string for band decoration

---

## Animation Patterns

All animations use Framer Motion or native SVG `animateTransform`/`animateMotion`:
- **Spring entries**: Nodes scale from 0 with staggered delays (`index * 0.04 + 0.5s`)
- **Continuous rotations**: Rune bands (42s/58s), inner polygon (90s), center sigil polygon (32s)
- **Breathing/pulsing**: Center sigil opacity (`max(2, 5 - complexity * 0.07)s` period)
- **Traveling particles**: Call edge particles via `animateMotion` (`2.2 + (i%4) * 0.45s`)
- **Flickering**: Radial burst lines, stability ring, try geometry
- **Dash animation**: Orbital rings and parent orbit rings via `strokeDashoffset`

---

## Data Flow (App.tsx)

```
useStore().code
  -> detectLanguage(code)         [lib/detect.ts]
  -> parseCode(code, language)    [lib/parser.ts]  -> IRNode tree
  -> computeLayout(ir)            [lib/layout.ts]  -> { root: LaidOutNode, metrics, subCircles }
  -> <MagicCircle layout={root} metrics={metrics} language={lang} subCircles={subCircles} />
```

All computation is `useMemo`-wrapped. The editor debounces via Monaco's own change events.
