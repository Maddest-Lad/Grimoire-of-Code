import type { IRNode, LaidOutNode } from '../types/ir';

export const CANVAS = { cx: 300, cy: 300, size: 600 };

const RING_RADII: Record<number, number> = { 1: 128, 2: 215, 3: 284 };
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

function layoutChildren(
  children: IRNode[],
  depth: number,
  parentAngle: number,
  nameToId: Map<string, string>,
): LaidOutNode[] {
  if (children.length === 0 || depth > 3) return [];

  const orbitR = RING_RADII[depth] ?? RING_RADII[3];
  const count = children.length;

  return children.map((child, i) => {
    let angle: number;

    if (depth === 1) {
      // Evenly distributed around the full circle, starting from the top
      angle = -Math.PI / 2 + (i / count) * 2 * Math.PI;
    } else {
      // Clustered around parent's angle
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
      children: layoutChildren(child.children, depth + 1, angle, nameToId),
    };
  });
}

export function computeLayout(ir: IRNode): LaidOutNode {
  const nameToId = buildNameToIdMap(ir);

  return {
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
    children: layoutChildren(ir.children, 1, 0, nameToId),
  };
}
