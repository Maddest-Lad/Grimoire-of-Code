import { motion } from 'framer-motion';
import type { SubCircle as SubCircleType, LaidOutNode } from '../../types/ir';

const SUB_COLORS: Record<SubCircleType['type'], { stroke: string; fill: string }> = {
  loop:   { stroke: '#a855f7', fill: '#1e1040' },
  branch: { stroke: '#f59e0b', fill: '#2a1a10' },
  try:    { stroke: '#ef4444', fill: '#2a1010' },
};

// ─── Internal geometry per type ──────────────────────────────────────────────

function LoopGeometry({ cx, cy, r, count }: {
  cx: number; cy: number; r: number; count: number;
}) {
  const arcs = Math.min(count, 3);
  const arcR = r * 0.65;
  const span = Math.PI * 0.35;

  return (
    <>
      {Array.from({ length: arcs }, (_, i) => {
        const a1 = (i / arcs) * 2 * Math.PI;
        const a2 = a1 + span;
        const x1 = cx + arcR * Math.cos(a1);
        const y1 = cy + arcR * Math.sin(a1);
        const x2 = cx + arcR * Math.cos(a2);
        const y2 = cy + arcR * Math.sin(a2);
        const d = `M ${x1} ${y1} A ${arcR} ${arcR} 0 0 1 ${x2} ${y2}`;
        const dur = `${3 + i * 0.8}s`;

        return (
          <path key={i} d={d} fill="none" stroke="#a855f7" strokeWidth={0.8} opacity={0.6}>
            <animateTransform
              attributeName="transform"
              type="rotate"
              from={`0 ${cx} ${cy}`}
              to={`360 ${cx} ${cy}`}
              dur={dur}
              repeatCount="indefinite"
            />
          </path>
        );
      })}
    </>
  );
}

function BranchGeometry({ cx, cy, r, count }: {
  cx: number; cy: number; r: number; count: number;
}) {
  const branches = Math.min(count, 5);
  const stemLen = r * 0.5;
  const forkLen = r * 0.4;
  const spread = Math.PI * 0.6;

  return (
    <>
      {/* Central stem */}
      <line
        x1={cx} y1={cy + stemLen}
        x2={cx} y2={cy}
        stroke="#f59e0b" strokeWidth={0.7} opacity={0.6}
      />
      {/* Forking branches */}
      {Array.from({ length: branches }, (_, i) => {
        const a = -Math.PI / 2 + (i / (branches - 1 || 1)) * spread - spread / 2;
        const x2 = cx + forkLen * Math.cos(a);
        const y2 = cy + forkLen * Math.sin(a);
        return (
          <line key={i}
            x1={cx} y1={cy}
            x2={x2} y2={y2}
            stroke="#f59e0b" strokeWidth={0.6} opacity={0.5}
          />
        );
      })}
      {/* Tip dots */}
      {Array.from({ length: branches }, (_, i) => {
        const a = -Math.PI / 2 + (i / (branches - 1 || 1)) * spread - spread / 2;
        const x = cx + forkLen * Math.cos(a);
        const y = cy + forkLen * Math.sin(a);
        return (
          <circle key={`d${i}`} cx={x} cy={y} r={1} fill="#f59e0b" opacity={0.7} />
        );
      })}
    </>
  );
}

function TryGeometry({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  const innerR = r * 0.6;
  const circumference = 2 * Math.PI * innerR;

  return (
    <>
      {/* Fragmented inner ring */}
      <motion.circle
        cx={cx} cy={cy} r={innerR}
        fill="none" stroke="#ef4444" strokeWidth={0.7}
        strokeDasharray={`${circumference / 6} ${circumference / 10}`}
        animate={{ opacity: [0.3, 0.6, 0.2, 0.5, 0.3] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'linear' }}
      />
      {/* Zigzag fracture */}
      <path
        d={`M ${cx - r * 0.3} ${cy} L ${cx - r * 0.12} ${cy - 2} L ${cx + r * 0.12} ${cy + 2} L ${cx + r * 0.3} ${cy}`}
        fill="none" stroke="#ef4444" strokeWidth={0.7} opacity={0.6}
      />
    </>
  );
}

// ─── Tick marks ──────────────────────────────────────────────────────────────

function TickMarks({ cx, cy, r, count }: {
  cx: number; cy: number; r: number; count: number;
}) {
  if (r < 14) return null;
  const ticks = Math.min(count <= 2 ? 6 : 8, 12);
  const innerR = r - 2;
  const outerR = r - 0.5;

  return (
    <>
      {Array.from({ length: ticks }, (_, i) => {
        const a = (i / ticks) * 2 * Math.PI;
        return (
          <line key={i}
            x1={cx + innerR * Math.cos(a)} y1={cy + innerR * Math.sin(a)}
            x2={cx + outerR * Math.cos(a)} y2={cy + outerR * Math.sin(a)}
            stroke={SUB_COLORS.loop.stroke} strokeWidth={0.4} opacity={0.35}
          />
        );
      })}
    </>
  );
}

// ─── Main SubCircle component ────────────────────────────────────────────────

interface Props {
  subCircle: SubCircleType;
  parentNode: LaidOutNode | undefined;
  index: number;
}

export function SubCircle({ subCircle, parentNode, index }: Props) {
  const { type, cx, cy, radius, count } = subCircle;
  const colors = SUB_COLORS[type];

  return (
    <motion.g
      style={{ transformBox: 'view-box', transformOrigin: `${cx}px ${cy}px` }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{
        type: 'spring',
        stiffness: 200,
        damping: 20,
        delay: index * 0.06 + 0.8,
      }}
    >
      {/* Connector bridge from parent node to sub-circle */}
      {parentNode && (
        <line
          x1={parentNode.x} y1={parentNode.y}
          x2={cx} y2={cy}
          stroke={colors.stroke}
          strokeWidth={0.6}
          opacity={0.3}
          strokeDasharray="2 3"
        />
      )}

      {/* Outer ring */}
      <circle
        cx={cx} cy={cy} r={radius}
        fill={colors.fill}
        stroke={colors.stroke}
        strokeWidth={0.9}
        opacity={0.75}
      />

      {/* Inner tick marks */}
      <TickMarks cx={cx} cy={cy} r={radius} count={count} />

      {/* Type-specific internal geometry */}
      {type === 'loop' && <LoopGeometry cx={cx} cy={cy} r={radius} count={count} />}
      {type === 'branch' && <BranchGeometry cx={cx} cy={cy} r={radius} count={count} />}
      {type === 'try' && <TryGeometry cx={cx} cy={cy} r={radius} />}
    </motion.g>
  );
}
