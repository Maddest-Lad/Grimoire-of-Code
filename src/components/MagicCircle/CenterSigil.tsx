import { motion } from 'framer-motion';
import { makePolygonPoints, pointsToPath, makeStarPath, CX, CY } from './constants';
import type { Language } from '../../types/ir';

const LANG_TAG: Record<string, string> = {
  javascript: 'JS',
  typescript: 'TS',
  python:     'PY',
  java:       'JV',
  cpp:        'C+',
  rust:       'RS',
  go:         'GO',
  unknown:    '??',
};

interface Props {
  topLevelCount: number;
  totalComplexity: number;
  language: Language;
}

export function CenterSigil({ topLevelCount, totalComplexity, language }: Props) {
  const outerN = Math.min(Math.max(topLevelCount, 3), 12);
  const innerN = Math.min(Math.max(Math.floor(topLevelCount / 2) + 2, 3), 8);

  const outerPts  = makePolygonPoints(outerN, 52);
  const outerStar = makeStarPath(outerPts);
  const outerPoly = pointsToPath(outerPts);

  const innerPts  = makePolygonPoints(innerN, 34);
  const innerPoly = pointsToPath(innerPts);

  const tag = LANG_TAG[language] ?? language.slice(0, 2).toUpperCase();

  // Pulse period: simple code breathes slowly, complex breathes fast
  const pulsePeriod = Math.max(2, 5 - totalComplexity * 0.07);

  return (
    <motion.g
      style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ duration: 0.7, type: 'spring', stiffness: 110, damping: 14 }}
    >
      {/* ── Layer 1: Outer polygon + star (breathes) ─────────── */}
      <motion.g
        style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
        animate={{ opacity: [0.5, 0.9, 0.5] }}
        transition={{ duration: pulsePeriod, repeat: Infinity, ease: 'easeInOut' }}
      >
        <path d={outerPoly} fill="none" stroke="#6030a0" strokeWidth={0.8} opacity={0.7} />
        {outerN >= 5 && (
          <path d={outerStar} fill="none" stroke="#8a44c8" strokeWidth={0.65} opacity={0.55} />
        )}
        {outerPts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={2.5} fill="#c084fc" opacity={0.85} />
        ))}
      </motion.g>

      {/* ── Layer 2: Middle rings ─────────────────────────────── */}
      <circle cx={CX} cy={CY} r={44} fill="none" stroke="#5030a0" strokeWidth={1} opacity={0.55} />
      <circle cx={CX} cy={CY} r={39} fill="none" stroke="#3d1a6e" strokeWidth={0.5} opacity={0.45} />

      {/* ── Layer 3: Rotating inner polygon ──────────────────── */}
      <motion.path
        d={innerPoly}
        fill="none"
        stroke="#7040b0"
        strokeWidth={0.9}
        opacity={0.65}
        style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
        animate={{ rotate: -360 }}
        transition={{ duration: 32, repeat: Infinity, ease: 'linear' }}
      />

      {/* ── Layer 4: Core ────────────────────────────────────── */}
      <circle cx={CX} cy={CY} r={25}
        fill="#1a0a2e"
        stroke="#c084fc"
        strokeWidth={2}
        filter="url(#glow-center)"
      />
      <circle cx={CX} cy={CY} r={17} fill="none" stroke="#7c3aed" strokeWidth={0.5} opacity={0.6} />

      {/* Inner cross + diagonal cross */}
      <line x1={CX - 11} y1={CY} x2={CX + 11} y2={CY} stroke="#c084fc" strokeWidth={0.5} opacity={0.6} />
      <line x1={CX} y1={CY - 11} x2={CX} y2={CY + 11} stroke="#c084fc" strokeWidth={0.5} opacity={0.6} />
      <line x1={CX - 7} y1={CY - 7} x2={CX + 7} y2={CY + 7} stroke="#a060e0" strokeWidth={0.3} opacity={0.4} />
      <line x1={CX + 7} y1={CY - 7} x2={CX - 7} y2={CY + 7} stroke="#a060e0" strokeWidth={0.3} opacity={0.4} />

      {/* Language badge */}
      <text
        x={CX} y={CY + 1}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#c084fc"
        fontSize={9}
        fontFamily="monospace"
        letterSpacing="0.08em"
      >
        {tag}
      </text>
    </motion.g>
  );
}
