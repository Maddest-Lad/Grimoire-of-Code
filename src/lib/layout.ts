import type { IRNode, LaidOutNode, ModuleMetrics, SubCircle } from '../types/ir';

export const CANVAS = { cx: 300, cy: 300, size: 600 };

/** All radial band positions in SVG user units */
export const BANDS = {
  center:      { inner: 0,   outer: 55  },
  radialBurst: { inner: 57,  outer: 108 },
  starPolygon: { inner: 112, outer: 162 },
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
  const identifiers: string[] = [];

  function walk(node: IRNode) {
    if (node.type !== 'module') {
      totalLoops += node.loopCount;
      totalBranches += node.branchCount;
      totalTries += node.tryCount;
      totalComplexity += node.complexity;
      identifiers.push(node.name);
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
  };
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
    // Depth-1: spread evenly around the main orbit
    const orbitR = BANDS.nodeOrbit.radius;
    return children.map((child, i) => {
      const angle = -Math.PI / 2 + (i / count) * 2 * Math.PI;
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

export function computeLayout(ir: IRNode): {
  root: LaidOutNode;
  metrics: ModuleMetrics;
  subCircles: SubCircle[];
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

  const subCircles = computeSubCircles(allNodes);

  return { root, metrics, subCircles };
}
