import { motion } from 'framer-motion';
import type { ModuleMetrics } from '../../types/ir';
import { BANDS } from '../../lib/layout';
import { CX, CY } from './constants';

const INNER_R = BANDS.radialBurst.inner;
const OUTER_R = BANDS.radialBurst.outer;

interface Props { metrics: ModuleMetrics }

export function RadialBurst({ metrics }: Props) {
  const { totalComplexity } = metrics;
  // More complex code → denser burst
  const N = Math.min(Math.max(24 + Math.floor(totalComplexity * 1.8), 36), 72);

  return (
    <>
      {Array.from({ length: N }, (_, i) => {
        const angle = (i / N) * 2 * Math.PI - Math.PI / 2;

        // Deterministic length via golden-ratio spread
        const variation = 0.35 + 0.65 * Math.abs(Math.sin(i * 1.6180339));
        const length = (OUTER_R - INNER_R) * variation;

        const x1 = CX + INNER_R * Math.cos(angle);
        const y1 = CY + INNER_R * Math.sin(angle);
        const x2 = CX + (INNER_R + length) * Math.cos(angle);
        const y2 = CY + (INNER_R + length) * Math.sin(angle);

        const isPrimary = i % 3 === 0;
        const strokeW  = isPrimary ? 0.8 : 0.35;
        const base     = isPrimary ? 0.7 : 0.3;

        // Every 4th line gets a flicker animation
        if (i % 4 === 0) {
          return (
            <motion.line
              key={i}
              x1={x1} y1={y1} x2={x2} y2={y2}
              stroke="#7c3aed"
              strokeWidth={strokeW}
              animate={{ opacity: [base, base * 0.2, base * 0.8, base * 0.4, base] }}
              transition={{
                duration: 1.2 + (i % 5) * 0.35,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: (i % 7) * 0.18,
              }}
            />
          );
        }

        return (
          <line
            key={i}
            x1={x1} y1={y1} x2={x2} y2={y2}
            stroke="#7c3aed"
            strokeWidth={strokeW}
            opacity={base}
          />
        );
      })}
    </>
  );
}
