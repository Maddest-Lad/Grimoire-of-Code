import type { LaidOutNode, NodeType } from '../../types/ir';
import { djb2 } from '../../lib/runes';

export const CX = 450;
export const CY = 450;

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
  /** 1 = normal, higher = more important (more callers targeting this node) */
  importance: number;
}

export interface NexusPoint {
  x: number;
  y: number;
  /** Number of incoming edges */
  incomingCount: number;
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

// ─── Import classification ──────────────────────────────────────────────────

export type ImportCategory = 'relative' | 'scoped' | 'stdlib' | 'package';

const STDLIB_NAMES = new Set([
  // Node.js built-ins
  'fs', 'path', 'os', 'http', 'https', 'url', 'util', 'stream', 'events',
  'crypto', 'net', 'dns', 'tls', 'zlib', 'readline', 'assert', 'buffer',
  'child_process', 'cluster', 'perf_hooks', 'worker_threads', 'v8', 'vm',
  'fs/promises', 'stream/promises',
  // Python built-ins
  'os', 'sys', 'io', 'math', 'json', 'datetime', 're', 'typing', 'pathlib',
  'collections', 'functools', 'itertools', 'copy', 'hashlib', 'base64',
  'logging', 'subprocess', 'threading', 'multiprocessing', 'socket', 'http',
  'urllib', 'tempfile', 'mimetypes', 'uuid', 'time', 'random', 'struct',
  'abc', 'dataclasses', 'enum', 'contextlib', 'asyncio', 'concurrent',
]);

export function classifyImport(name: string): ImportCategory {
  if (name.startsWith('./') || name.startsWith('../') || name.startsWith('.')) return 'relative';
  if (name.startsWith('@')) return 'scoped';
  // Check base name (before any /)
  const base = name.split('/')[0];
  if (STDLIB_NAMES.has(base) || STDLIB_NAMES.has(name)) return 'stdlib';
  return 'package';
}

const IMPORT_PALETTE = ['#34d399', '#2dd4bf', '#6ee7b7', '#5eead4', '#a7f3d0'];

export function importColor(name: string, category: ImportCategory): string {
  switch (category) {
    case 'relative': return '#a78bfa';
    case 'scoped':   return '#2dd4bf';
    case 'stdlib':   return '#34d399';
    case 'package':  return IMPORT_PALETTE[djb2(name) % IMPORT_PALETTE.length];
  }
}

/**
 * Build call edges with importance scoring.
 * Uses center-pulled bezier curves (reliable) with arc-routed paths only for
 * moderate angular separations where they look clean.
 */
export function buildEdges(nodes: LaidOutNode[]): Edge[] {
  const idToNode = new Map(nodes.map((n) => [n.id, n]));
  const edges: Edge[] = [];
  const seen = new Set<string>();

  // Count incoming edges per node for importance scoring
  const incomingCount = new Map<string, number>();
  for (const node of nodes) {
    for (const callId of node.calls) {
      incomingCount.set(callId, (incomingCount.get(callId) ?? 0) + 1);
    }
  }

  const ROUTE_R = 145;

  for (const node of nodes) {
    for (const callId of node.calls) {
      const target = idToNode.get(callId);
      if (!target) continue;
      const key = [node.id, callId].sort().join('--');
      if (seen.has(key)) continue;
      seen.add(key);

      const importance = Math.max(incomingCount.get(callId) ?? 1, incomingCount.get(node.id) ?? 1);

      // Compute angular separation
      const srcAngle = Math.atan2(node.y - CY, node.x - CX);
      const tgtAngle = Math.atan2(target.y - CY, target.x - CX);
      let angleDiff = tgtAngle - srcAngle;
      while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
      while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
      const angularDist = Math.abs(angleDiff);

      let path: string;

      // Only use arc routing for moderate angular separations (PI/6 to PI/2)
      // where it creates a clean visible arc. Otherwise use center-pulled bezier.
      if (angularDist > Math.PI / 6 && angularDist < Math.PI / 2) {
        const rp1x = CX + ROUTE_R * Math.cos(srcAngle);
        const rp1y = CY + ROUTE_R * Math.sin(srcAngle);
        const rp2x = CX + ROUTE_R * Math.cos(tgtAngle);
        const rp2y = CY + ROUTE_R * Math.sin(tgtAngle);
        const sweepFlag = angleDiff > 0 ? 1 : 0;

        path = [
          `M ${node.x} ${node.y}`,
          `L ${rp1x} ${rp1y}`,
          `A ${ROUTE_R} ${ROUTE_R} 0 0 ${sweepFlag} ${rp2x} ${rp2y}`,
          `L ${target.x} ${target.y}`,
        ].join(' ');
      } else {
        // Center-pulled quadratic bezier (original approach, always reliable)
        const mx = (node.x + target.x) / 2;
        const my = (node.y + target.y) / 2;
        const cpx = mx + (CX - mx) * 0.55;
        const cpy = my + (CY - my) * 0.55;
        path = `M ${node.x} ${node.y} Q ${cpx} ${cpy} ${target.x} ${target.y}`;
      }

      edges.push({
        id: `e-${node.id}-${callId}`,
        path,
        importance,
      });
    }
  }
  return edges;
}

/** Find nodes with 3+ incoming call edges for nexus point rendering */
export function findNexusPoints(nodes: LaidOutNode[]): NexusPoint[] {
  const incomingCount = new Map<string, number>();
  const idToNode = new Map(nodes.map((n) => [n.id, n]));

  for (const node of nodes) {
    for (const callId of node.calls) {
      incomingCount.set(callId, (incomingCount.get(callId) ?? 0) + 1);
    }
  }

  const points: NexusPoint[] = [];
  for (const [id, count] of incomingCount) {
    if (count >= 3) {
      const node = idToNode.get(id);
      if (node) points.push({ x: node.x, y: node.y, incomingCount: count });
    }
  }
  return points;
}
