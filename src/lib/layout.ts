import type { IRNode, LaidOutNode, ModuleMetrics } from '../types/ir';

export const CANVAS = { cx: 300, cy: 300, size: 600 };

/** All radial band positions in SVG user units */
export const BANDS = {
  center:      { inner: 0,   outer: 55  },
  radialBurst: { inner: 57,  outer: 108 },
  methodOrbit: { radius: 92 },
  starPolygon: { inner: 112, outer: 162 },
  innerRune:   { inner: 174, outer: 188 },
  nodeOrbit:   { radius: 210 },
  stability:   { radius: 240 },
  outerRune:   { inner: 251, outer: 266 },
  rim:         { inner: 276, outer: 292 },
} as const;

const RING_RADII: Record<number, number> = {
  1: BANDS.nodeOrbit.radius,
  2: BANDS.methodOrbit.radius,
  3: BANDS.methodOrbit.radius,
};

const MIN_NODE_R = 6;
const MAX_NODE_R = 16;

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

function layoutChildren(
  children: IRNode[],
  depth: number,
  parentAngle: number,
  nameToId: Map<string, string>,
): LaidOutNode[] {
  if (children.length === 0 || depth > 3) return [];

  const orbitR = RING_RADII[depth] ?? RING_RADII[2];
  const count = children.length;

  return children.map((child, i) => {
    let angle: number;
    if (depth === 1) {
      angle = -Math.PI / 2 + (i / count) * 2 * Math.PI;
    } else {
      const spread = Math.min(Math.PI * 0.85, (count + 1) * 0.38);
      const startAngle = parentAngle - spread / 2;
      angle = count === 1 ? parentAngle : startAngle + (i / (count - 1)) * spread;
    }

    const x = CANVAS.cx + orbitR * Math.cos(angle);
    const y = CANVAS.cy + orbitR * Math.sin(angle);

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
      calls: child.calls.map((name) => nameToId.get(name) ?? '').filter(Boolean),
      complexity: child.complexity,
      isRecursive: child.isRecursive,
      loopCount: child.loopCount,
      branchCount: child.branchCount,
      tryCount: child.tryCount,
      returnCount: child.returnCount,
      paramCount: child.paramCount,
      nestingDepth: child.nestingDepth,
      children: layoutChildren(child.children, depth + 1, angle, nameToId),
    };
  });
}

export function computeLayout(ir: IRNode): { root: LaidOutNode; metrics: ModuleMetrics } {
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
    children: layoutChildren(ir.children, 1, 0, nameToId),
  };

  return { root, metrics };
}
