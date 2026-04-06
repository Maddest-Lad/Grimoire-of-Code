import { motion } from 'framer-motion';
import type { SatelliteCircle } from '../../types/ir';
import { moduleRunes } from '../../lib/runes';
import { circlePathD } from './constants';
import { BridgeConnector } from './BridgeConnector';

const SAT_COLORS: Record<SatelliteCircle['type'], { stroke: string; fill: string; glow: string }> = {
  loop:   { stroke: '#a855f7', fill: '#1e1040', glow: '#a855f740' },
  branch: { stroke: '#f59e0b', fill: '#2a1a10', glow: '#f59e0b40' },
  try:    { stroke: '#ef4444', fill: '#2a1010', glow: '#ef444440' },
};

// ─── Internal geometry for satellite circles ────────────────────────────────

function SatLoopGeometry({ cx, cy, r, count }: {
  cx: number; cy: number; r: number; count: number;
}) {
  const arcs = Math.min(count, 4);
  const arcR = r * 0.55;
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
        const dur = `${3.5 + i * 0.6}s`;
        return (
          <path key={i} d={d} fill="none" stroke="#a855f7" strokeWidth={1} opacity={0.55}>
            <animateTransform
              attributeName="transform" type="rotate"
              from={`0 ${cx} ${cy}`} to={`360 ${cx} ${cy}`}
              dur={dur} repeatCount="indefinite"
            />
          </path>
        );
      })}
    </>
  );
}

function SatBranchGeometry({ cx, cy, r, count }: {
  cx: number; cy: number; r: number; count: number;
}) {
  const branches = Math.min(count, 6);
  const stemLen = r * 0.4;
  const forkLen = r * 0.35;
  const spread = Math.PI * 0.7;

  return (
    <>
      <line x1={cx} y1={cy + stemLen} x2={cx} y2={cy}
        stroke="#f59e0b" strokeWidth={0.9} opacity={0.55} />
      {Array.from({ length: branches }, (_, i) => {
        const a = -Math.PI / 2 + (i / (branches - 1 || 1)) * spread - spread / 2;
        return (
          <g key={i}>
            <line x1={cx} y1={cy} x2={cx + forkLen * Math.cos(a)} y2={cy + forkLen * Math.sin(a)}
              stroke="#f59e0b" strokeWidth={0.7} opacity={0.5} />
            <circle cx={cx + forkLen * Math.cos(a)} cy={cy + forkLen * Math.sin(a)}
              r={1.5} fill="#f59e0b" opacity={0.6} />
          </g>
        );
      })}
    </>
  );
}

function SatTryGeometry({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  const innerR = r * 0.5;
  const circumference = 2 * Math.PI * innerR;

  return (
    <>
      <circle
        cx={cx} cy={cy} r={innerR}
        fill="none" stroke="#ef4444" strokeWidth={0.8}
        strokeDasharray={`${circumference / 5} ${circumference / 8}`}
        opacity={0.35}>
        <animate attributeName="opacity" values="0.25;0.55;0.2;0.45;0.25"
          dur="2.8s" repeatCount="indefinite" />
      </circle>
      <path
        d={`M ${cx - r * 0.25} ${cy} L ${cx - r * 0.1} ${cy - 2.5} L ${cx + r * 0.1} ${cy + 2.5} L ${cx + r * 0.25} ${cy}`}
        fill="none" stroke="#ef4444" strokeWidth={0.9} opacity={0.55}
      />
    </>
  );
}

// ─── Main satellite circle component ────────────────────────────────────────

interface Props {
  satellite: SatelliteCircle;
  index: number;
}

export function SatelliteCircleComponent({ satellite, index }: Props) {
  const { type, cx, cy, radius, count, parentX, parentY, runeSeed } = satellite;
  const colors = SAT_COLORS[type];

  // Mini rune band
  const runeR = radius - 3;
  const runePathId = `sat-rune-${satellite.parentId}-${type}`;
  const runeText = moduleRunes(runeSeed, 40);
  const runeD = circlePathD(cx, cy, runeR);

  // Tick marks
  const tickCount = Math.min(8 + count, 16);

  // Mini radial burst proportional to parent complexity
  const burstCount = Math.min(8 + Math.floor(satellite.parentComplexity * 0.8), 18);
  const burstInner = radius * 0.35;
  const burstOuter = radius * 0.7;

  return (
    <motion.g
      style={{ transformBox: 'view-box', transformOrigin: `${cx}px ${cy}px` }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{
        type: 'spring',
        stiffness: 180,
        damping: 20,
        delay: 1.2 + index * 0.15,
      }}
    >
      {/* Bridge connector to parent */}
      <BridgeConnector
        parentX={parentX}
        parentY={parentY}
        satelliteCx={cx}
        satelliteCy={cy}
        color={colors.stroke}
        index={index}
      />

      {/* Outer ring */}
      <circle
        cx={cx} cy={cy} r={radius}
        fill={colors.fill}
        stroke={colors.stroke}
        strokeWidth={1.2}
        opacity={0.8}
      />

      {/* Second ring (inner) */}
      <circle
        cx={cx} cy={cy} r={radius * 0.8}
        fill="none"
        stroke={colors.stroke}
        strokeWidth={0.4}
        opacity={0.35}
      />

      {/* Mini radial burst */}
      {Array.from({ length: burstCount }, (_, i) => {
        const a = (i / burstCount) * 2 * Math.PI;
        const variation = 0.5 + 0.5 * Math.abs(Math.sin(i * 1.618));
        const len = (burstOuter - burstInner) * variation;
        return (
          <line key={`burst-${i}`}
            x1={cx + burstInner * Math.cos(a)} y1={cy + burstInner * Math.sin(a)}
            x2={cx + (burstInner + len) * Math.cos(a)} y2={cy + (burstInner + len) * Math.sin(a)}
            stroke={colors.stroke} strokeWidth={0.3} opacity={0.3}
          />
        );
      })}

      {/* Tick marks on outer ring */}
      {Array.from({ length: tickCount }, (_, i) => {
        const a = (i / tickCount) * 2 * Math.PI;
        const inner = radius - 2;
        const outer = radius - 0.5;
        return (
          <line key={`tick-${i}`}
            x1={cx + inner * Math.cos(a)} y1={cy + inner * Math.sin(a)}
            x2={cx + outer * Math.cos(a)} y2={cy + outer * Math.sin(a)}
            stroke={colors.stroke} strokeWidth={0.4} opacity={0.4}
          />
        );
      })}

      {/* Mini rune band — uses native SVG animateTransform for reliable pivot */}
      <g>
        <path id={runePathId} d={runeD} fill="none" stroke="none" />
        <text
          fontSize={4}
          fill={colors.stroke}
          opacity={0.4}
          fontFamily="Georgia, serif"
          letterSpacing={1}
        >
          <textPath href={`#${runePathId}`}>{runeText}</textPath>
          <animateTransform
            attributeName="transform"
            type="rotate"
            from={`0 ${cx} ${cy}`}
            to={`-360 ${cx} ${cy}`}
            dur="30s"
            repeatCount="indefinite"
          />
        </text>
      </g>

      {/* Type-specific internal geometry */}
      {type === 'loop' && <SatLoopGeometry cx={cx} cy={cy} r={radius} count={count} />}
      {type === 'branch' && <SatBranchGeometry cx={cx} cy={cy} r={radius} count={count} />}
      {type === 'try' && <SatTryGeometry cx={cx} cy={cy} r={radius} />}

      {/* Center dot */}
      <circle cx={cx} cy={cy} r={2} fill={colors.stroke} opacity={0.7} />
    </motion.g>
  );
}
