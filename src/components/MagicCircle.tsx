import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { LaidOutNode, NodeType } from '../types/ir';
import { CANVAS } from '../lib/layout';

const { cx: CX, cy: CY } = CANVAS;

// ─── Visual constants ─────────────────────────────────────────────────────────

const NODE_COLORS: Record<NodeType, { fill: string; stroke: string }> = {
  module:   { fill: '#1a0a2e', stroke: '#c084fc' },
  function: { fill: '#1e1040', stroke: '#a855f7' },
  class:    { fill: '#0e2040', stroke: '#60a5fa' },
  method:   { fill: '#0e1830', stroke: '#22d3ee' },
  import:   { fill: '#0e2820', stroke: '#34d399' },
  variable: { fill: '#1a1a2e', stroke: '#94a3b8' },
  control:  { fill: '#2a1010', stroke: '#f59e0b' },
};

const RING_DASH: Record<number, string> = { 1: '4 10', 2: '3 7', 3: '2 5' };
const RING_SPEED: Record<number, number> = { 1: 10, 2: 16, 3: 22 };
const RING_DIR: Record<number, number>   = { 1: 100, 2: -80, 3: 60 };

// ─── Data helpers ─────────────────────────────────────────────────────────────

function flattenNodes(root: LaidOutNode): LaidOutNode[] {
  const result: LaidOutNode[] = [];
  function walk(node: LaidOutNode) {
    if (node.depth > 0) result.push(node);
    node.children.forEach(walk);
  }
  walk(root);
  return result;
}

interface Edge {
  id: string;
  path: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
}

function buildEdges(nodes: LaidOutNode[]): Edge[] {
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

      // Quadratic bezier pulled towards center
      const mx = (node.x + target.x) / 2;
      const my = (node.y + target.y) / 2;
      const cpx = mx + (CX - mx) * 0.55;
      const cpy = my + (CY - my) * 0.55;

      edges.push({
        id: `e-${node.id}-${callId}`,
        path: `M ${node.x} ${node.y} Q ${cpx} ${cpy} ${target.x} ${target.y}`,
        fromX: node.x,
        fromY: node.y,
        toX: target.x,
        toY: target.y,
      });
    }
  }
  return edges;
}

/**
 * Builds an inscribed polygon path for n sides at radius r, centered at (CX, CY).
 * For n >= 5 we also draw a star polygon (skip-one connections).
 */
function makeDecorativePaths(sides: number, r: number): string[] {
  const n = Math.min(Math.max(sides, 3), 16);
  const pts = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * 2 * Math.PI - Math.PI / 2;
    return { x: CX + r * Math.cos(a), y: CY + r * Math.sin(a) };
  });

  const polygon = `M ${pts.map((p) => `${p.x},${p.y}`).join(' L ')} Z`;
  const paths = [polygon];

  // Star polygon: connect every ⌊n/2⌋ vertex
  if (n >= 5) {
    const step = Math.floor(n / 2);
    const starPts: typeof pts = [];
    let idx = 0;
    const visited = new Set<number>();
    while (!visited.has(idx)) {
      visited.add(idx);
      starPts.push(pts[idx]);
      idx = (idx + step) % n;
    }
    if (starPts.length >= 3) {
      paths.push(`M ${starPts.map((p) => `${p.x},${p.y}`).join(' L ')} Z`);
    }
  }

  return paths;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function NodeGlyph({ node, index }: { node: LaidOutNode; index: number }) {
  const colors = NODE_COLORS[node.type];
  const dx = node.x - CX;
  const dy = node.y - CY;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  const labelOffset = node.radius + 11;
  const labelX = node.x + (dx / dist) * labelOffset;
  const labelY = node.y + (dy / dist) * labelOffset;

  const anchor = dx > 18 ? 'start' : dx < -18 ? 'end' : 'middle';
  const baseline = dy > 18 ? 'hanging' : dy < -18 ? 'auto' : 'middle';
  const label = node.name.length > 14 ? node.name.slice(0, 13) + '…' : node.name;

  return (
    <motion.g
      key={node.id}
      style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ duration: 0.35, delay: index * 0.04, type: 'spring', stiffness: 220, damping: 18 }}
    >
      {/* Recursive outer ring */}
      {node.isRecursive && (
        <circle
          cx={node.x} cy={node.y}
          r={node.radius + 5}
          fill="none"
          stroke={colors.stroke}
          strokeWidth={0.5}
          strokeDasharray="2 3"
          opacity={0.6}
        />
      )}

      {/* Main glyph */}
      <circle
        cx={node.x} cy={node.y}
        r={node.radius}
        fill={colors.fill}
        stroke={colors.stroke}
        strokeWidth={1.5}
        filter="url(#glow)"
      />

      {/* Inner dot for functions */}
      {node.type === 'function' && (
        <circle cx={node.x} cy={node.y} r={2.5} fill={colors.stroke} opacity={0.8} />
      )}

      {/* Cross mark for imports */}
      {node.type === 'import' && (
        <>
          <line x1={node.x - 3} y1={node.y} x2={node.x + 3} y2={node.y} stroke={colors.stroke} strokeWidth={1} />
          <line x1={node.x} y1={node.y - 3} x2={node.x} y2={node.y + 3} stroke={colors.stroke} strokeWidth={1} />
        </>
      )}

      {/* Label (depth 1 and 2 only) */}
      {node.depth <= 2 && (
        <text
          x={labelX}
          y={labelY}
          textAnchor={anchor}
          dominantBaseline={baseline}
          fill="#8878a8"
          fontSize={8.5}
          fontFamily="monospace"
          letterSpacing="0.02em"
        >
          {label}
        </text>
      )}
    </motion.g>
  );
}

function IdleCircle() {
  return (
    <div className="w-full h-full flex items-center justify-center" style={{ background: '#080814' }}>
      <svg
        viewBox="0 0 600 600"
        style={{ width: '100%', height: '100%', maxWidth: 600, maxHeight: 600, opacity: 0.5 }}
      >
        {[80, 130, 175].map((r, i) => (
          <motion.circle
            key={r}
            cx={CX} cy={CY} r={r}
            fill="none"
            stroke="#4a2080"
            strokeWidth={0.5}
            strokeDasharray="4 10"
            opacity={0.4 - i * 0.08}
            animate={{ strokeDashoffset: [0, i % 2 ? 60 : -60] }}
            transition={{ duration: 6 + i * 3, repeat: Infinity, ease: 'linear' }}
          />
        ))}
        <motion.circle
          cx={CX} cy={CY} r={24}
          fill="#1a0a2e" stroke="#c084fc" strokeWidth={1.5}
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        />
        <circle cx={CX} cy={CY} r={15} fill="none" stroke="#7c3aed" strokeWidth={0.5} />
        <text
          x={CX} y={CY + 1}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#4a2080"
          fontSize={8}
          fontFamily="monospace"
        >
          grimoire
        </text>
      </svg>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface MagicCircleProps {
  layout: LaidOutNode | null;
}

export function MagicCircle({ layout }: MagicCircleProps) {
  const allNodes = useMemo(
    () => (layout ? flattenNodes(layout) : []),
    [layout],
  );
  const edges = useMemo(() => buildEdges(allNodes), [allNodes]);
  const depth1Nodes = useMemo(() => allNodes.filter((n) => n.depth === 1), [allNodes]);

  const decorPaths = useMemo(
    () => (depth1Nodes.length >= 3 ? makeDecorativePaths(depth1Nodes.length, 105) : []),
    [depth1Nodes.length],
  );

  if (!layout || layout.children.length === 0) {
    return <IdleCircle />;
  }

  return (
    <div
      className="w-full h-full flex items-center justify-center"
      style={{ background: '#080814' }}
    >
      <svg
        viewBox="0 0 600 600"
        style={{ width: '100%', height: '100%', maxWidth: 600, maxHeight: 600 }}
      >
        <defs>
          <filter id="glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glow-center" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <radialGradient id="bgGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#120820" />
            <stop offset="100%" stopColor="#080814" />
          </radialGradient>
        </defs>

        {/* ── Background ──────────────────────────────────────────── */}
        <circle cx={CX} cy={CY} r={294} fill="url(#bgGrad)" />

        {/* Tick marks on outer rim */}
        {Array.from({ length: 36 }, (_, i) => {
          const angle = (i / 36) * 2 * Math.PI;
          const major = i % 3 === 0;
          const r1 = 282, r2 = major ? 292 : 287;
          return (
            <line
              key={i}
              x1={CX + r1 * Math.cos(angle)} y1={CY + r1 * Math.sin(angle)}
              x2={CX + r2 * Math.cos(angle)} y2={CY + r2 * Math.sin(angle)}
              stroke="#3d1a6e"
              strokeWidth={major ? 1.5 : 0.5}
              opacity={0.7}
            />
          );
        })}

        {/* Rune symbols at 8 intercardinal positions */}
        {['✦', '◈', '⊕', '◈', '✦', '◈', '⊕', '◈'].map((rune, i) => {
          const a = (i / 8) * 2 * Math.PI - Math.PI / 2;
          return (
            <text
              key={i}
              x={CX + 270 * Math.cos(a)}
              y={CY + 270 * Math.sin(a)}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#3d1a6e"
              fontSize={9}
              fontFamily="monospace"
              opacity={0.8}
            >
              {rune}
            </text>
          );
        })}

        {/* Outer border */}
        <circle cx={CX} cy={CY} r={293} fill="none" stroke="#2d1254" strokeWidth={1.5} />

        {/* ── Inscribed decorative polygon ────────────────────────── */}
        {decorPaths.map((d, i) => (
          <path
            key={i}
            d={d}
            fill="none"
            stroke="#3d1060"
            strokeWidth={0.5}
            opacity={i === 0 ? 0.35 : 0.2}
          />
        ))}

        {/* ── Orbital rings ────────────────────────────────────────── */}
        {[1, 2, 3].map((depth) => (
          <motion.circle
            key={depth}
            cx={CX} cy={CY} r={[0, 128, 215, 284][depth]}
            fill="none"
            stroke="#4a2080"
            strokeWidth={depth === 1 ? 1 : 0.75}
            strokeDasharray={RING_DASH[depth]}
            opacity={0.55 - depth * 0.07}
            animate={{ strokeDashoffset: [0, RING_DIR[depth]] }}
            transition={{ duration: RING_SPEED[depth], repeat: Infinity, ease: 'linear' }}
          />
        ))}

        {/* ── Spokes from center to depth-1 nodes ──────────────────── */}
        {depth1Nodes.map((node) => (
          <line
            key={`spoke-${node.id}`}
            x1={CX} y1={CY}
            x2={node.x} y2={node.y}
            stroke="#3d1a6e"
            strokeWidth={0.5}
            opacity={0.25}
          />
        ))}

        {/* ── Call edges ───────────────────────────────────────────── */}
        <AnimatePresence>
          {edges.map((edge, i) => (
            <motion.path
              key={edge.id}
              d={edge.path}
              fill="none"
              stroke="#7c3aed"
              strokeWidth={1}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.38 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2, delay: 0.6 + i * 0.08 }}
            />
          ))}
        </AnimatePresence>

        {/* ── Satellite nodes ──────────────────────────────────────── */}
        <AnimatePresence>
          {allNodes.map((node, i) => (
            <NodeGlyph key={node.id} node={node} index={i} />
          ))}
        </AnimatePresence>

        {/* ── Center glyph ─────────────────────────────────────────── */}
        <motion.g
          style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.6, type: 'spring', stiffness: 160 }}
        >
          <circle cx={CX} cy={CY} r={34} fill="none" stroke="#7c3aed" strokeWidth={0.5} opacity={0.4} />
          <circle
            cx={CX} cy={CY} r={24}
            fill="#1a0a2e"
            stroke="#c084fc"
            strokeWidth={2}
            filter="url(#glow-center)"
          />
          <circle cx={CX} cy={CY} r={16} fill="none" stroke="#7c3aed" strokeWidth={0.5} />
          <text
            x={CX} y={CY + 1}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#c084fc"
            fontSize={8}
            fontFamily="monospace"
            letterSpacing="0.03em"
          >
            {layout.name.length > 10 ? layout.name.slice(0, 9) + '…' : layout.name}
          </text>
        </motion.g>
      </svg>
    </div>
  );
}
