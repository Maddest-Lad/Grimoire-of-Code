import { useState, memo } from 'react';
import type { LaidOutNode } from '../../types/ir';
import { NODE_COLORS, CX, CY, classifyImport, importColor } from './constants';
import { LoopArcs } from './LoopArcs';

// ─── Micro magic circle internals for function/method glyphs ─────────────────

function InternalRings({ nx, ny, r, count }: {
  nx: number; ny: number; r: number; count: number;
}) {
  const capped = Math.min(count, 3);
  if (capped <= 0) return null;
  return (
    <>
      {Array.from({ length: capped }, (_, i) => {
        const ringR = r * (0.35 + i * 0.2);
        return (
          <circle key={i}
            cx={nx} cy={ny} r={ringR}
            fill="none" stroke="#a855f7" strokeWidth={0.4}
            opacity={0.3 + i * 0.08}
          />
        );
      })}
    </>
  );
}

function MicroSpokes({ nx, ny, r, count, color }: {
  nx: number; ny: number; r: number; count: number; color: string;
}) {
  const capped = Math.min(count, 6);
  if (capped <= 0) return null;
  const innerR = r * 0.2;
  const outerR = r * 0.85;
  return (
    <>
      {Array.from({ length: capped }, (_, i) => {
        const a = (i / capped) * 2 * Math.PI - Math.PI / 2;
        return (
          <line key={i}
            x1={nx + innerR * Math.cos(a)} y1={ny + innerR * Math.sin(a)}
            x2={nx + outerR * Math.cos(a)} y2={ny + outerR * Math.sin(a)}
            stroke={color} strokeWidth={0.4} opacity={0.35}
          />
        );
      })}
    </>
  );
}

function CenterPolygon({ nx, ny, r, paramCount, color }: {
  nx: number; ny: number; r: number; paramCount: number; color: string;
}) {
  if (paramCount < 3) return null;
  const n = Math.min(paramCount, 6);
  const polyR = r * 0.3;
  const pts = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * 2 * Math.PI - Math.PI / 2;
    return `${nx + polyR * Math.cos(a)},${ny + polyR * Math.sin(a)}`;
  });
  return (
    <polygon
      points={pts.join(' ')}
      fill="none" stroke={color} strokeWidth={0.5} opacity={0.4}
    />
  );
}

function FunctionGlyph({ nx, ny, r, colors, node }: {
  nx: number; ny: number; r: number;
  colors: { fill: string; stroke: string };
  node: { loopCount: number; branchCount: number; paramCount: number; nestingDepth: number };
}) {
  const hasDetail = r >= 10;
  const detailOpacity = hasDetail ? Math.min(0.3 + node.nestingDepth * 0.15, 0.9) : 0;

  return (
    <>
      <circle cx={nx} cy={ny} r={r}
        fill={colors.fill} stroke={colors.stroke} strokeWidth={1.5}
        filter="url(#glow)" />
      {/* Center dot */}
      <circle cx={nx} cy={ny} r={hasDetail ? 1.8 : 2.5} fill={colors.stroke} opacity={0.8} />
      {/* Internal detail for larger nodes */}
      {hasDetail && (
        <g opacity={detailOpacity}>
          <InternalRings nx={nx} ny={ny} r={r} count={node.loopCount} />
          <MicroSpokes nx={nx} ny={ny} r={r} count={node.branchCount} color={colors.stroke} />
          <CenterPolygon nx={nx} ny={ny} r={r} paramCount={node.paramCount} color={colors.stroke} />
        </g>
      )}
    </>
  );
}

function MethodGlyph({ nx, ny, r, colors, node }: {
  nx: number; ny: number; r: number;
  colors: { fill: string; stroke: string };
  node: { loopCount: number; branchCount: number; paramCount: number; nestingDepth: number };
}) {
  const hasDetail = r >= 10;
  const detailOpacity = hasDetail ? Math.min(0.3 + node.nestingDepth * 0.15, 0.9) : 0;

  return (
    <>
      <polygon
        points={`${nx},${ny - r} ${nx + r},${ny} ${nx},${ny + r} ${nx - r},${ny}`}
        fill={colors.fill} stroke={colors.stroke} strokeWidth={1.5}
              />
      {hasDetail && (
        <g opacity={detailOpacity}>
          <InternalRings nx={nx} ny={ny} r={r * 0.7} count={node.loopCount} />
          <MicroSpokes nx={nx} ny={ny} r={r * 0.7} count={node.branchCount} color={colors.stroke} />
        </g>
      )}
    </>
  );
}

// ─── Type-specific glyphs ────────────────────────────────────────────────────

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

function ImportGlyph({ nx, ny, r, name }: {
  nx: number; ny: number; r: number; name: string;
}) {
  const category = classifyImport(name);
  const color = importColor(name, category);
  const fill = category === 'relative' ? '#1a1030' : category === 'scoped' ? '#0e2028' : '#0e2820';

  const dx = nx - CX, dy = ny - CY;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  const ox = dx / dist, oy = dy / dist;
  const px = -oy, py = ox;

  if (category === 'relative') {
    // Inward-pointing arrow (small, muted)
    const tip = { x: nx - ox * r * 0.8, y: ny - oy * r * 0.8 };
    const b1  = { x: nx + ox * r * 0.5 + px * r * 0.65, y: ny + oy * r * 0.5 + py * r * 0.65 };
    const b2  = { x: nx + ox * r * 0.5 - px * r * 0.65, y: ny + oy * r * 0.5 - py * r * 0.65 };
    return (
      <polygon
        points={`${tip.x},${tip.y} ${b1.x},${b1.y} ${b2.x},${b2.y}`}
        fill={fill} stroke={color} strokeWidth={1.2}       />
    );
  }

  if (category === 'scoped') {
    // Pentagon
    const pts = Array.from({ length: 5 }, (_, i) => {
      const a = (i / 5) * 2 * Math.PI - Math.PI / 2;
      return `${nx + r * Math.cos(a)},${ny + r * Math.sin(a)}`;
    });
    return (
      <polygon
        points={pts.join(' ')}
        fill={fill} stroke={color} strokeWidth={1.3}       />
    );
  }

  if (category === 'stdlib') {
    // Rounded square
    const half = r * 0.85;
    return (
      <rect
        x={nx - half} y={ny - half} width={half * 2} height={half * 2}
        rx={3} ry={3}
        fill={fill} stroke={color} strokeWidth={1.3}       />
    );
  }

  // Package: outward triangle (default)
  const tip = { x: nx + ox * r, y: ny + oy * r };
  const b1  = { x: nx - ox * r * 0.5 + px * r * 0.75, y: ny - oy * r * 0.5 + py * r * 0.75 };
  const b2  = { x: nx - ox * r * 0.5 - px * r * 0.75, y: ny - oy * r * 0.5 - py * r * 0.75 };
  return (
    <polygon
      points={`${tip.x},${tip.y} ${b1.x},${b1.y} ${b2.x},${b2.y}`}
      fill={fill} stroke={color} strokeWidth={1.5}     />
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
  const label = node.name.length > 14 ? node.name.slice(0, 13) + '\u2026' : node.name;

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

interface Props {
  node: LaidOutNode;
  index: number;
  /** Set of "nodeId:type" keys — skip inline decoration when sub-circle exists */
  suppressedDecorations?: Set<string>;
  /** Whether labels are always visible (false = hover-only) */
  showLabels?: boolean;
}

export const NodeChip = memo(function NodeChip({ node, index, suppressedDecorations, showLabels = true }: Props) {
  const [hovered, setHovered] = useState(false);
  const colors = NODE_COLORS[node.type];
  const { x: nx, y: ny } = node;
  const r = node.radius;

  const suppressLoop   = suppressedDecorations?.has(`${node.id}:loop`);
  const suppressBranch = suppressedDecorations?.has(`${node.id}:branch`);
  const suppressTry    = suppressedDecorations?.has(`${node.id}:try`);

  const labelVisible = showLabels || hovered;

  // CSS animation delay for staggered entry (replaces Framer Motion spring)
  const delay = `${index * 0.04 + 0.5}s`;

  return (
    <g
      style={{ cursor: 'pointer', animation: `nodeEntry 0.4s ease-out ${delay} both` }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
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

      {/* ── Loop arcs (rotating) — suppressed when sub-circle exists ── */}
      {!suppressLoop && (
        <LoopArcs
          count={node.loopCount}
          nodeRadius={r}
          color={colors.stroke}
          nx={nx}
          ny={ny}
        />
      )}

      {/* ── Main glyph ── */}
      {node.type === 'class' ? (
        <ClassGlyph nx={nx} ny={ny} r={r} colors={colors}
          methodCount={node.children.filter(c => c.type === 'method').length} />
      ) : node.type === 'import' ? (
        <ImportGlyph nx={nx} ny={ny} r={r} name={node.name} />
      ) : node.type === 'variable' ? (
        <rect x={nx - r} y={ny - r} width={r * 2} height={r * 2}
          fill={colors.fill} stroke={colors.stroke} strokeWidth={1.5}
          filter="url(#glow)" />
      ) : node.type === 'method' ? (
        <MethodGlyph nx={nx} ny={ny} r={r} colors={colors} node={node} />
      ) : node.type === 'function' ? (
        <FunctionGlyph nx={nx} ny={ny} r={r} colors={colors} node={node} />
      ) : (
        <circle cx={nx} cy={ny} r={r}
          fill={colors.fill} stroke={colors.stroke} strokeWidth={1.5}
          filter="url(#glow)" />
      )}

      {/* ── Try/catch fracture mark — suppressed when sub-circle exists ── */}
      {node.tryCount > 0 && !suppressTry && <TryFracture nx={nx} ny={ny} r={r} />}

      {/* ── Branch dots (above) — suppressed when sub-circle exists ── */}
      {!suppressBranch && (
        <BranchDots nx={nx} ny={ny} r={r} count={node.branchCount} color={colors.stroke} />
      )}

      {/* ── Param dots (below) ── */}
      <ParamDots nx={nx} ny={ny} r={r} count={node.paramCount} />


      {/* ── Label (always-on or hover-only) ── */}
      {labelVisible && <NodeLabel node={node} nx={nx} ny={ny} r={r} />}

      {/* Invisible hit area for hover (larger than the visible glyph) */}
      {!showLabels && (
        <circle cx={nx} cy={ny} r={Math.max(r + 6, 12)} fill="transparent" />
      )}
    </g>
  );
});
