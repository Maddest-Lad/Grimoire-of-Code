import type { LaidOutNode, NodeType } from '../../types/ir';

export const CX = 300;
export const CY = 300;

export const NODE_COLORS: Record<NodeType, { fill: string; stroke: string }> = {
  module:   { fill: '#1a0a2e', stroke: '#c084fc' },
  function: { fill: '#1e1040', stroke: '#a855f7' },
  class:    { fill: '#0e2040', stroke: '#60a5fa' },
  method:   { fill: '#0e1830', stroke: '#22d3ee' },
  import:   { fill: '#0e2820', stroke: '#34d399' },
  variable: { fill: '#1a1a2e', stroke: '#94a3b8' },
  control:  { fill: '#2a1010', stroke: '#f59e0b' },
};

/** SVG circle path via two semicircles (SVG spec requires two arcs for a full circle) */
export function circlePathD(cx: number, cy: number, r: number): string {
  return [
    `M ${cx} ${cy - r}`,
    `A ${r} ${r} 0 1 1 ${cx} ${cy + r}`,
    `A ${r} ${r} 0 1 1 ${cx} ${cy - r}`,
  ].join(' ');
}

export function makePolygonPoints(
  n: number,
  r: number,
  cx = CX,
  cy = CY,
  startAngle = -Math.PI / 2,
): Array<{ x: number; y: number }> {
  const clamped = Math.min(Math.max(n, 3), 16);
  return Array.from({ length: clamped }, (_, i) => {
    const a = startAngle + (i / clamped) * 2 * Math.PI;
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  });
}

export function pointsToPath(pts: Array<{ x: number; y: number }>): string {
  return `M ${pts.map((p) => `${p.x},${p.y}`).join(' L ')} Z`;
}

/** Star polygon connecting every floor(n/2) vertex */
export function makeStarPath(pts: Array<{ x: number; y: number }>): string {
  const n = pts.length;
  if (n < 5) return pointsToPath(pts);
  const step = Math.floor(n / 2);
  const starPts: typeof pts = [];
  let idx = 0;
  const visited = new Set<number>();
  while (!visited.has(idx)) {
    visited.add(idx);
    starPts.push(pts[idx]);
    idx = (idx + step) % n;
  }
  if (starPts.length < 3) return pointsToPath(pts);
  return `M ${starPts.map((p) => `${p.x},${p.y}`).join(' L ')} Z`;
}

export interface Edge {
  id: string;
  path: string;
}

export function flattenNodes(root: LaidOutNode): LaidOutNode[] {
  const result: LaidOutNode[] = [];
  function walk(node: LaidOutNode) {
    if (node.depth > 0) result.push(node);
    node.children.forEach(walk);
  }
  walk(root);
  return result;
}

export function buildEdges(nodes: LaidOutNode[]): Edge[] {
  const idToNode = new Map(nodes.map((n) => [n.id, n]));
  const edges: Edge[] = [];
  const seen = new Set<string>();

  for (const node of nodes) {
    for (const callId of node.calls) {
      const target = idToNode.get(callId);
      if (!target) continue;
      const key = [node.id, callId].sort().join('--');
      if (seen.has(key)) continue;
      seen.add(key);

      const mx = (node.x + target.x) / 2;
      const my = (node.y + target.y) / 2;
      const cpx = mx + (CX - mx) * 0.55;
      const cpy = my + (CY - my) * 0.55;

      edges.push({
        id: `e-${node.id}-${callId}`,
        path: `M ${node.x} ${node.y} Q ${cpx} ${cpy} ${target.x} ${target.y}`,
      });
    }
  }
  return edges;
}
