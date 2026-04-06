import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { moduleRunes } from '../../lib/runes';
import { circlePathD, CX, CY } from './constants';

interface RuneBandProps {
  r: number;
  /** Unique SVG ID for the hidden circle path used by textPath */
  pathId: string;
  seed: string;
  direction?: 1 | -1;
  duration?: number;
  fontSize?: number;
  color?: string;
  opacity?: number;
  letterSpacing?: number;
}

export function RuneBand({
  r,
  pathId,
  seed,
  direction = 1,
  duration = 60,
  fontSize = 9,
  color = '#5030a0',
  opacity = 0.65,
  letterSpacing = 2,
}: RuneBandProps) {
  const text = useMemo(() => moduleRunes(seed || 'grimoire', 150), [seed]);
  const d = useMemo(() => circlePathD(CX, CY, r), [r]);

  return (
    <motion.g
      // transformBox: view-box ensures transformOrigin uses SVG user-unit coordinates
      style={{ transformBox: 'view-box', transformOrigin: `${CX}px ${CY}px` }}
      animate={{ rotate: direction * 360 }}
      transition={{ duration, repeat: Infinity, ease: 'linear' }}
    >
      {/* Hidden circle path that the text follows */}
      <path id={pathId} d={d} fill="none" stroke="none" />
      <text
        fontSize={fontSize}
        fill={color}
        opacity={opacity}
        fontFamily="Georgia, 'Arial Unicode MS', 'Segoe UI Symbol', serif"
        letterSpacing={letterSpacing}
      >
        <textPath href={`#${pathId}`}>{text}</textPath>
      </text>
    </motion.g>
  );
}
