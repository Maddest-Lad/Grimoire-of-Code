import { motion } from 'framer-motion';
import type { LaidOutNode } from '../../types/ir';
import { NODE_COLORS, CX, CY } from './constants';
import { LoopArcs } from './LoopArcs';

// ─── Type-specific glyph ─────────────────────────────────────────────────────

function ClassGlyph({ nx, ny, r, colors, methodCount }: {
  nx: number; ny: number; r: number;
  colors: { fill: string; stroke: string };
  methodCount: number;
}) {
  const pts = Array.from({ length: 6 }, (_, i) => {
    const a = (i / 6) * 2 * Math.PI - Math.PI / 6;
    return `${nx + r * Math.cos(a)},${ny + r * Math.sin(a)}`;
  });
  const innerR = r * 0.42;
  const mCount = Math.min(methodCount, 8);

  return (
    <>
      <polygon points={pts.join(' ')} fill={colors.fill} stroke={colors.stroke}
        strokeWidth={1.5} filter="url(#glow)" />
      {Array.from({ length: mCount }, (_, i) => {
        const a = (i / mCount) * 2 * Math.PI - Math.PI / 2;
        return (
          <circle key={i}
            cx={nx + innerR * Math.cos(a)} cy={ny + innerR * Math.sin(a)}
            r={1.5} fill={colors.stroke} opacity={0.55}
          />
        );
      })}
    </>
  );
}

function ImportGlyph({ nx, ny, r, colors }: {
  nx: number; ny: number; r: number;
  colors: { fill: string; stroke: string };
}) {
  const dx = nx - CX, dy = ny - CY;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  const ox = dx / dist, oy = dy / dist; // outward unit vector
  const px = -oy,       py = ox;        // perpendicular

  const tip = { x: nx + ox * r,            y: ny + oy * r };
  const b1  = { x: nx - ox * r * 0.5 + px * r * 0.75, y: ny - oy * r * 0.5 + py * r * 0.75 };
  const b2  = { x: nx - ox * r * 0.5 - px * r * 0.75, y: ny - oy * r * 0.5 - py * r * 0.75 };

  return (
    <polygon
      points={`${tip.x},${tip.y} ${b1.x},${b1.y} ${b2.x},${b2.y}`}
      fill={colors.fill} stroke={colors.stroke} strokeWidth={1.5}
      filter="url(#glow)"
    />
  );
}

// ─── Branch dots (above node) ─────────────────────────────────────────────────

function BranchDots({ nx, ny, r, count, color }: {
  nx: number; ny: number; r: number; count: number; color: string;
}) {
  if (count <= 0) return null;
  const c = Math.min(count, 6);
  const spacing = 3.8;
  const totalW  = (c - 1) * spacing;
  return (
    <>
      {Array.from({ length: c }, (_, i) => (
        <circle key={i}
          cx={nx - totalW / 2 + i * spacing}
          cy={ny - r - 5.5}
          r={1.5}
          fill={color}
          opacity={0.68}
        />
      ))}
    </>
  );
}

// ─── Param dots (below node) ──────────────────────────────────────────────────

function ParamDots({ nx, ny, r, count }: {
  nx: number; ny: number; r: number; count: number;
}) {
  if (count <= 0) return null;
  const c = Math.min(count, 5);
  const spacing = 3.4;
  const totalW  = (c - 1) * spacing;
  return (
    <>
      {Array.from({ length: c }, (_, i) => (
        <circle key={i}
          cx={nx - totalW / 2 + i * spacing}
          cy={ny + r + 5.5}
          r={1.2}
          fill="#6060a0"
          opacity={0.52}
        />
      ))}
    </>
  );
}

// ─── Try/catch fracture mark ──────────────────────────────────────────────────

function TryFracture({ nx, ny, r }: { nx: number; ny: number; r: number }) {
  const hw = r * 0.6;
  const d = [
    `M ${nx - hw} ${ny}`,
    `L ${nx - hw / 2} ${ny - 3.5}`,
    `L ${nx} ${ny + 3.5}`,
    `L ${nx + hw / 2} ${ny - 3.5}`,
    `L ${nx + hw} ${ny}`,
  ].join(' ');
  return (
    <path d={d} fill="none" stroke="#f59e0b" strokeWidth={1} opacity={0.75} />
  );
}

// ─── Label ───────────────────────────────────────────────────────────────────

function NodeLabel({ node, nx, ny, r }: {
  node: LaidOutNode; nx: number; ny: number; r: number;
}) {
  if (node.depth > 2) return null;
  const dx = nx - CX, dy = ny - CY;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  const lx   = nx + (dx / dist) * (r + 12);
  const ly   = ny + (dy / dist) * (r + 12);
  const label = node.name.length > 14 ? node.name.slice(0, 13) + '…' : node.name;

  return (
    <text
      x={lx} y={ly}
      textAnchor={dx > 18 ? 'start' : dx < -18 ? 'end' : 'middle'}
      dominantBaseline={dy > 18 ? 'hanging' : dy < -18 ? 'auto' : 'middle'}
      fill="#8878a8"
      fontSize={8.5}
      fontFamily="monospace"
      letterSpacing="0.02em"
    >
      {label}
    </text>
  );
}

// ─── Main NodeChip component ──────────────────────────────────────────────────

interface Props { node: LaidOutNode; index: number }

export function NodeChip({ node, index }: Props) {
  const colors = NODE_COLORS[node.type];
  const { x: nx, y: ny } = node;
  const r = node.radius;

  // Pulse period inversely scales with complexity (complex = faster pulse)
  const pulsePeriod = Math.max(1.4, 5.5 - node.complexity * 0.18);
  const pulseScale  = 1 + Math.min(node.complexity * 0.015, 0.12);

  return (
    <motion.g
      style={{ transformBox: 'view-box', transformOrigin: `${nx}px ${ny}px` }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{
        type: 'spring',
        stiffness: 220,
        damping: 18,
        delay: index * 0.04 + 0.5,
      }}
    >
      {/* ── Recursion outer halo ── */}
      {node.isRecursive && (
        <>
          <circle cx={nx} cy={ny} r={r + 8}
            fill="none" stroke={colors.stroke}
            strokeWidth={0.5} strokeDasharray="2 3" opacity={0.55} />
          <circle cx={nx} cy={ny} r={r + 12}
            fill="none" stroke={colors.stroke}
            strokeWidth={0.3} strokeDasharray="1 4" opacity={0.3} />
        </>
      )}

      {/* ── Loop arcs (rotating) ── */}
      <LoopArcs
        count={node.loopCount}
        nodeRadius={r}
        color={colors.stroke}
        nx={nx}
        ny={ny}
      />

      {/* ── Main glyph ── */}
      {node.type === 'class' ? (
        <ClassGlyph nx={nx} ny={ny} r={r} colors={colors}
          methodCount={node.children.filter(c => c.type === 'method').length} />
      ) : node.type === 'import' ? (
        <ImportGlyph nx={nx} ny={ny} r={r} colors={colors} />
      ) : node.type === 'variable' ? (
        <rect x={nx - r} y={ny - r} width={r * 2} height={r * 2}
          fill={colors.fill} stroke={colors.stroke} strokeWidth={1.5}
          filter="url(#glow)" />
      ) : node.type === 'method' ? (
        <polygon
          points={`${nx},${ny - r} ${nx + r},${ny} ${nx},${ny + r} ${nx - r},${ny}`}
          fill={colors.fill} stroke={colors.stroke} strokeWidth={1.5}
          filter="url(#glow)"
        />
      ) : (
        <>
          <circle cx={nx} cy={ny} r={r}
            fill={colors.fill} stroke={colors.stroke} strokeWidth={1.5}
            filter="url(#glow)" />
          {node.type === 'function' && (
            <circle cx={nx} cy={ny} r={2.5} fill={colors.stroke} opacity={0.8} />
          )}
        </>
      )}

      {/* ── Try/catch fracture mark ── */}
      {node.tryCount > 0 && <TryFracture nx={nx} ny={ny} r={r} />}

      {/* ── Branch dots (above) ── */}
      <BranchDots nx={nx} ny={ny} r={r} count={node.branchCount} color={colors.stroke} />

      {/* ── Param dots (below) ── */}
      <ParamDots nx={nx} ny={ny} r={r} count={node.paramCount} />

      {/* ── Complexity pulse ring ── */}
      {node.complexity > 2 && (
        <motion.circle
          cx={nx} cy={ny} r={r + 2}
          fill="none"
          stroke={colors.stroke}
          strokeWidth={0.4}
          style={{ transformBox: 'view-box', transformOrigin: `${nx}px ${ny}px` }}
          animate={{ scale: [1, pulseScale * 1.6, 1], opacity: [0, 0.35, 0] }}
          transition={{
            duration: pulsePeriod,
            repeat: Infinity,
            ease: 'easeOut',
            repeatDelay: 0.4,
          }}
        />
      )}

      {/* ── Label ── */}
      <NodeLabel node={node} nx={nx} ny={ny} r={r} />
    </motion.g>
  );
}
