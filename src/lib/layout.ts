import type { IRNode, LaidOutNode, ModuleMetrics, SubCircle, InscribedShape, SatelliteCircle } from '../types/ir';

export const CANVAS = { cx: 450, cy: 450, size: 900 };

/** All radial band positions in SVG user units */
export const BANDS = {
  center:      { inner: 0,   outer: 55  },
  radialBurst: { inner: 57,  outer: 108 },
  starPolygon: { inner: 112, outer: 162 },
  callRouting: { radius: 145 },
  innerRune:   { inner: 174, outer: 188 },
  nodeOrbit:   { radius: 195 },
  stability:   { radius: 240 },
  outerRune:   { inner: 251, outer: 266 },
  rim:         { inner: 276, outer: 292 },
} as const;

const MIN_NODE_R = 6;
const MAX_NODE_R = 16;

function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

function nodeRadius(complexity: number, siblingsOnRing: number): number {
  const cap = siblingsOnRing > 20 ? 5 : siblingsOnRing > 15 ? 7 : MAX_NODE_R;
  return Math.min(cap, Math.max(MIN_NODE_R, MIN_NODE_R + Math.sqrt(Math.max(complexity - 1, 0)) * 2.5));
}

function buildNameToIdMap(ir: IRNode): Map<string, string> {
  const map = new Map<string, string>();
  function walk(node: IRNode) {
    map.set(node.name, node.id);
    node.children.forEach(walk);
  }
  walk(ir);
  return map;
}

/** Aggregate module-level metrics from the IR tree */
export function computeMetrics(ir: IRNode): ModuleMetrics {
  let totalLoops = 0, totalBranches = 0, totalTries = 0, totalComplexity = 0;
  let hasRecursion = false;
  const identifiers: string[] = [];
  const typesPresent = new Set<string>();

  function walk(node: IRNode) {
    if (node.type !== 'module') {
      totalLoops += node.loopCount;
      totalBranches += node.branchCount;
      totalTries += node.tryCount;
      totalComplexity += node.complexity;
      identifiers.push(node.name);
      if (node.isRecursive) hasRecursion = true;
      // Track which structural domains exist
      if (node.type === 'import') typesPresent.add('import');
      else if (node.type === 'class') typesPresent.add('class');
      else if (node.type === 'function' || node.type === 'method') typesPresent.add('function');
      else if (node.type === 'variable') typesPresent.add('variable');
    }
    node.children.forEach(walk);
  }
  walk(ir);

  return {
    totalLoops,
    totalBranches,
    totalTries,
    totalComplexity,
    topLevelCount: ir.children.length,
    runeSeedString: identifiers.join(''),
    domainCount: typesPresent.size,
    hasRecursion,
  };
}

/** Determine which inscribed geometric shapes to render based on code characteristics */
export function computeInscribedShapes(metrics: ModuleMetrics): InscribedShape[] {
  const shapes: InscribedShape[] = [];
  const band = BANDS.starPolygon;
  const radii = [band.outer - 4, band.inner + (band.outer - band.inner) * 0.6, band.inner + 8];
  let idx = 0;

  // Triangle: significant branching
  if (metrics.totalBranches >= 3) {
    shapes.push({
      type: 'triangle',
      vertices: 3,
      radius: radii[idx % radii.length],
      rotationDuration: 70,
      color: '#7c3aed',
      opacity: 0.55,
    });
    idx++;
  }

  // Square: 4+ distinct structural domains
  if (metrics.domainCount >= 4) {
    shapes.push({
      type: 'square',
      vertices: 4,
      radius: radii[idx % radii.length],
      rotationDuration: 85,
      color: '#6030a0',
      opacity: 0.5,
    });
    idx++;
  }

  // Pentagon: high cyclomatic complexity
  if (metrics.totalComplexity > 12) {
    shapes.push({
      type: 'pentagon',
      vertices: 5,
      radius: radii[idx % radii.length],
      rotationDuration: 100,
      color: '#5020a0',
      opacity: 0.45,
    });
    idx++;
  }

  // Hexagram: recursion present (two counter-rotating triangles)
  if (metrics.hasRecursion) {
    const r = idx < radii.length ? radii[idx] : (band.inner + band.outer) / 2;
    shapes.push({
      type: 'hexagram',
      vertices: 6,
      radius: r,
      rotationDuration: 60,
      color: '#8a44c8',
      opacity: 0.5,
    });
  }

  // Fallback: if no shapes qualify, use the original topLevelCount polygon
  if (shapes.length === 0) {
    const n = Math.min(Math.max(metrics.topLevelCount, 3), 12);
    shapes.push({
      type: n === 3 ? 'triangle' : n === 4 ? 'square' : 'pentagon',
      vertices: n,
      radius: (band.inner + band.outer) / 2,
      rotationDuration: 90,
      color: '#5020a0',
      opacity: 0.55,
    });
  }

  return shapes;
}

// ─── Sector system ──────────────────────────────────────────────────────────

export type SectorName = 'north' | 'east' | 'south' | 'west';

export interface Sector {
  name: SectorName;
  label: string;
  startAngle: number;  // radians, measured from top (-PI/2)
  endAngle: number;
}

/** Base sector definitions (angles measured from -PI/2 = top, clockwise) */
export const SECTOR_DEFS: Sector[] = [
  { name: 'north', label: 'INVOCATIONS',    startAngle: -Math.PI / 4,          endAngle: Math.PI / 4 },
  { name: 'east',  label: 'BINDINGS',       startAngle: Math.PI / 4,           endAngle: (3 * Math.PI) / 4 },
  { name: 'south', label: 'FOUNDATION',     startAngle: (3 * Math.PI) / 4,    endAngle: (5 * Math.PI) / 4 },
  { name: 'west',  label: 'INNER WORKINGS', startAngle: (5 * Math.PI) / 4,    endAngle: (7 * Math.PI) / 4 },
];

/** Map node type to its sector */
function sectorForType(type: string): SectorName {
  switch (type) {
    case 'function': return 'north';
    case 'import':   return 'east';
    case 'variable':
    case 'control':  return 'south';
    case 'class':
    case 'method':   return 'west';
    default:         return 'north';
  }
}

/** Assign depth-1 children to sectors and compute per-node angles */
function assignSectorAngles(children: IRNode[]): number[] {
  // Group children by sector
  const groups: Map<SectorName, number[]> = new Map([
    ['north', []], ['east', []], ['south', []], ['west', []],
  ]);
  for (let i = 0; i < children.length; i++) {
    const sector = sectorForType(children[i].type);
    groups.get(sector)!.push(i);
  }

  // Build effective sector ranges — empty sectors share their space with neighbors
  const sectorOrder: SectorName[] = ['north', 'east', 'south', 'west'];
  const occupied = sectorOrder.filter(s => groups.get(s)!.length > 0);

  // If all in one sector or no sector system benefit, fall back to even distribution
  if (occupied.length <= 1) {
    return children.map((_, i) => -Math.PI / 2 + (i / children.length) * 2 * Math.PI);
  }

  const angles = new Array<number>(children.length);
  const totalAngle = 2 * Math.PI;

  // Distribute angle proportionally to node count per occupied sector
  const totalNodes = children.length;
  let currentAngle = -Math.PI / 2; // start from top

  for (const sectorName of sectorOrder) {
    const indices = groups.get(sectorName)!;
    if (indices.length === 0) continue;

    // Each sector gets angle proportional to its share of nodes, but at least PI/6 (30deg)
    const share = Math.max(indices.length / totalNodes, 0.08);
    const sectorSpan = share * totalAngle;

    // Spread nodes within this sector's span with padding at edges
    const padding = sectorSpan * 0.08;
    const usableSpan = sectorSpan - padding * 2;

    for (let j = 0; j < indices.length; j++) {
      const t = indices.length === 1 ? 0.5 : j / (indices.length - 1);
      angles[indices[j]] = currentAngle + padding + t * usableSpan;
    }

    currentAngle += sectorSpan;
  }

  return angles;
}

/**
 * Clamp (x, y) so a node of given radius stays within viewBox with padding.
 */
function clampToViewBox(x: number, y: number, r: number, padding = 15): { x: number; y: number } {
  return {
    x: clamp(x, r + padding, CANVAS.size - r - padding),
    y: clamp(y, r + padding, CANVAS.size - r - padding),
  };
}

function layoutChildren(
  children: IRNode[],
  depth: number,
  parentAngle: number,
  parentX: number,
  parentY: number,
  nameToId: Map<string, string>,
): LaidOutNode[] {
  if (children.length === 0 || depth > 3) return [];

  const count = children.length;

  if (depth === 1) {
    // Depth-1: place in sector-aware positions around the main orbit
    const orbitR = BANDS.nodeOrbit.radius;
    const sectorAngles = assignSectorAngles(children);
    return children.map((child, i) => {
      const angle = sectorAngles[i];
      const x = CANVAS.cx + orbitR * Math.cos(angle);
      const y = CANVAS.cy + orbitR * Math.sin(angle);

      // Compute localOrbitRadius for children of this node
      const childCount = child.children.length;
      const localOrbitRadius = childCount > 0
        ? clamp(20 + childCount * 2.5, 20, 42)
        : undefined;

      return {
        id: child.id,
        type: child.type,
        name: child.name,
        x,
        y,
        radius: nodeRadius(child.complexity, count),
        angle,
        depth: child.depth,
        orbitRadius: orbitR,
        localOrbitRadius,
        calls: child.calls.map((name) => nameToId.get(name) ?? '').filter(Boolean),
        complexity: child.complexity,
        isRecursive: child.isRecursive,
        loopCount: child.loopCount,
        branchCount: child.branchCount,
        tryCount: child.tryCount,
        returnCount: child.returnCount,
        paramCount: child.paramCount,
        nestingDepth: child.nestingDepth,
        children: layoutChildren(child.children, depth + 1, angle, x, y, nameToId),
      };
    });
  }

  // Depth 2+: orbit around the PARENT node, not the global center
  const localOrbitR = clamp(20 + count * 2.5, 20, 42);

  return children.map((child, i) => {
    // Spread children evenly around the full circle of the parent
    const angle = parentAngle + (i / count) * 2 * Math.PI;
    const rawX = parentX + localOrbitR * Math.cos(angle);
    const rawY = parentY + localOrbitR * Math.sin(angle);
    const { x, y } = clampToViewBox(rawX, rawY, nodeRadius(child.complexity, count));

    return {
      id: child.id,
      type: child.type,
      name: child.name,
      x,
      y,
      radius: nodeRadius(child.complexity, count),
      angle,
      depth: child.depth,
      orbitRadius: localOrbitR,
      calls: child.calls.map((name) => nameToId.get(name) ?? '').filter(Boolean),
      complexity: child.complexity,
      isRecursive: child.isRecursive,
      loopCount: child.loopCount,
      branchCount: child.branchCount,
      tryCount: child.tryCount,
      returnCount: child.returnCount,
      paramCount: child.paramCount,
      nestingDepth: child.nestingDepth,
      children: layoutChildren(child.children, depth + 1, angle, x, y, nameToId),
    };
  });
}

/** Check if two circles overlap (with padding) */
function circlesOverlap(
  x1: number, y1: number, r1: number,
  x2: number, y2: number, r2: number,
  padding = 3,
): boolean {
  const dx = x1 - x2, dy = y1 - y2;
  const minDist = r1 + r2 + padding;
  return dx * dx + dy * dy < minDist * minDist;
}

/** Compute satellite sub-circles for nodes with significant control flow */
function computeSubCircles(allNodes: LaidOutNode[]): SubCircle[] {
  const subCircles: SubCircle[] = [];

  // Collect all existing occupied zones (nodes + their labels)
  const occupied: { x: number; y: number; r: number }[] = [];
  for (const n of allNodes) {
    occupied.push({ x: n.x, y: n.y, r: n.radius + 4 });
  }

  for (const node of allNodes) {
    if (node.type === 'import' || node.type === 'variable' || node.type === 'module') continue;

    const qualifying: { type: SubCircle['type']; count: number }[] = [];
    if (node.loopCount >= 1) qualifying.push({ type: 'loop', count: node.loopCount });
    if (node.branchCount >= 3) qualifying.push({ type: 'branch', count: node.branchCount });
    if (node.tryCount >= 1) qualifying.push({ type: 'try', count: node.tryCount });

    if (qualifying.length === 0) continue;

    const outAngle = Math.atan2(node.y - CANVAS.cy, node.x - CANVAS.cx);

    // Wider angular stagger for multiple sub-circles on the same node
    const offsets = qualifying.length === 1
      ? [0]
      : qualifying.length === 2
        ? [-0.7, 0.7]
        : [-0.9, 0, 0.9];

    for (let i = 0; i < qualifying.length; i++) {
      const { type, count } = qualifying[i];
      const subR = clamp(8 + count * 3, 10, 24);
      const gap = 5;
      const placementDist = node.radius + subR + gap;

      // Try multiple candidate angles, pick the first that doesn't collide
      let bestCx = 0, bestCy = 0, bestAngle = 0, placed = false;
      const baseAngle = outAngle + offsets[i];

      // Try the base angle, then spiral outward with increasing angular offsets
      for (let attempt = 0; attempt < 12; attempt++) {
        const nudge = attempt === 0 ? 0 : (Math.ceil(attempt / 2) * 0.35 * (attempt % 2 === 0 ? 1 : -1));
        const tryAngle = baseAngle + nudge;
        const dist = placementDist + (attempt > 6 ? 8 : 0); // push further out if desperate
        let cx = node.x + dist * Math.cos(tryAngle);
        let cy = node.y + dist * Math.sin(tryAngle);

        // Clamp to viewBox
        cx = clamp(cx, subR + 8, CANVAS.size - subR - 8);
        cy = clamp(cy, subR + 8, CANVAS.size - subR - 8);

        // Check against all placed sub-circles and occupied zones
        let collision = false;
        for (const sc of subCircles) {
          if (circlesOverlap(cx, cy, subR, sc.cx, sc.cy, sc.radius)) {
            collision = true;
            break;
          }
        }
        if (!collision) {
          for (const oz of occupied) {
            if (circlesOverlap(cx, cy, subR, oz.x, oz.y, oz.r)) {
              collision = true;
              break;
            }
          }
        }

        if (!collision) {
          bestCx = cx;
          bestCy = cy;
          bestAngle = tryAngle;
          placed = true;
          break;
        }
      }

      // Fallback: place at base angle even if colliding
      if (!placed) {
        bestAngle = baseAngle;
        bestCx = clamp(node.x + placementDist * Math.cos(baseAngle), subR + 8, CANVAS.size - subR - 8);
        bestCy = clamp(node.y + placementDist * Math.sin(baseAngle), subR + 8, CANVAS.size - subR - 8);
      }

      subCircles.push({ type, cx: bestCx, cy: bestCy, radius: subR, count, parentId: node.id, angle: bestAngle });
      // Register as occupied for future collision checks
      occupied.push({ x: bestCx, y: bestCy, r: subR });
    }
  }

  return subCircles;
}

/** Check if a node's control flow should be promoted to a satellite circle */
function shouldPromote(node: LaidOutNode, type: 'loop' | 'branch' | 'try'): boolean {
  switch (type) {
    case 'loop':
      return node.nestingDepth >= 2 && (node.loopCount + node.branchCount >= 4);
    case 'branch':
      return node.branchCount >= 5;
    case 'try':
      return node.tryCount >= 2;
  }
}

/** Compute satellite circles for promoted control flow blocks */
function computeSatelliteCircles(allNodes: LaidOutNode[]): SatelliteCircle[] {
  const satellites: SatelliteCircle[] = [];
  const occupied: { x: number; y: number; r: number }[] = [];

  // The main circle rim is at BANDS.rim.outer (292).
  // Satellites are placed tangent to the rim: center = rim + gap + satelliteR.
  const RIM = BANDS.rim.outer;
  const GAP = 4; // small gap between rim and satellite edge

  for (const node of allNodes) {
    if (node.type === 'import' || node.type === 'variable' || node.type === 'module') continue;

    const qualifying: { type: SatelliteCircle['type']; count: number }[] = [];
    if (node.loopCount >= 1 && shouldPromote(node, 'loop'))
      qualifying.push({ type: 'loop', count: node.loopCount });
    if (node.branchCount >= 3 && shouldPromote(node, 'branch'))
      qualifying.push({ type: 'branch', count: node.branchCount });
    if (node.tryCount >= 1 && shouldPromote(node, 'try'))
      qualifying.push({ type: 'try', count: node.tryCount });

    if (qualifying.length === 0) continue;

    const nodeAngle = Math.atan2(node.y - CANVAS.cy, node.x - CANVAS.cx);

    const offsets = qualifying.length === 1
      ? [0]
      : qualifying.length === 2
        ? [-0.25, 0.25]
        : [-0.35, 0, 0.35];

    for (let i = 0; i < qualifying.length; i++) {
      const { type, count } = qualifying[i];
      const satR = clamp(18 + count * 3, 20, 36);
      const angle = nodeAngle + offsets[i];

      // Tangent placement: satellite edge touches the rim
      const dist = RIM + GAP + satR;
      let bestCx = CANVAS.cx + dist * Math.cos(angle);
      let bestCy = CANVAS.cy + dist * Math.sin(angle);

      // Clamp to viewBox (0 to CANVAS.size)
      const pad = satR + 4;
      bestCx = clamp(bestCx, pad, CANVAS.size - pad);
      bestCy = clamp(bestCy, pad, CANVAS.size - pad);

      // Collision avoidance — nudge angle
      for (let attempt = 0; attempt < 8; attempt++) {
        let collision = false;
        for (const oz of occupied) {
          if (circlesOverlap(bestCx, bestCy, satR, oz.x, oz.y, oz.r, 5)) {
            collision = true;
            break;
          }
        }
        if (!collision) break;
        const nudge = (attempt + 1) * 0.2 * (attempt % 2 ? 1 : -1);
        bestCx = clamp(CANVAS.cx + dist * Math.cos(angle + nudge), pad, CANVAS.size - pad);
        bestCy = clamp(CANVAS.cy + dist * Math.sin(angle + nudge), pad, CANVAS.size - pad);
      }

      satellites.push({
        type,
        cx: bestCx,
        cy: bestCy,
        radius: satR,
        count,
        parentId: node.id,
        angle,
        parentComplexity: node.complexity,
        parentX: node.x,
        parentY: node.y,
        runeSeed: `${node.name}-${type}-${count}`,
      });
      occupied.push({ x: bestCx, y: bestCy, r: satR });
    }
  }

  return satellites;
}

export function computeLayout(ir: IRNode): {
  root: LaidOutNode;
  metrics: ModuleMetrics;
  subCircles: SubCircle[];
  inscribedShapes: InscribedShape[];
  satelliteCircles: SatelliteCircle[];
} {
  const nameToId = buildNameToIdMap(ir);
  const metrics = computeMetrics(ir);

  const root: LaidOutNode = {
    id: ir.id,
    type: ir.type,
    name: ir.name,
    x: CANVAS.cx,
    y: CANVAS.cy,
    radius: 24,
    angle: 0,
    depth: 0,
    orbitRadius: 0,
    calls: ir.calls.map((name) => nameToId.get(name) ?? '').filter(Boolean),
    complexity: ir.complexity,
    isRecursive: ir.isRecursive,
    loopCount: ir.loopCount,
    branchCount: ir.branchCount,
    tryCount: ir.tryCount,
    returnCount: ir.returnCount,
    paramCount: ir.paramCount,
    nestingDepth: ir.nestingDepth,
    children: layoutChildren(ir.children, 1, 0, CANVAS.cx, CANVAS.cy, nameToId),
  };

  // Flatten for sub-circle computation
  const allNodes: LaidOutNode[] = [];
  function walk(node: LaidOutNode) {
    allNodes.push(node);
    node.children.forEach(walk);
  }
  root.children.forEach(walk);

  const satelliteCircles = computeSatelliteCircles(allNodes);

  // Nodes that have promoted satellites should not also get regular sub-circles for the same type
  const promotedKeys = new Set(satelliteCircles.map(s => `${s.parentId}:${s.type}`));
  const subCircles = computeSubCircles(allNodes).filter(sc => !promotedKeys.has(`${sc.parentId}:${sc.type}`));

  const inscribedShapes = computeInscribedShapes(metrics);

  return { root, metrics, subCircles, inscribedShapes, satelliteCircles };
}
