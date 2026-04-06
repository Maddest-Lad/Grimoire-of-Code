import { useMemo } from 'react';
import type { ModuleMetrics } from '../../types/ir';
import { BANDS } from '../../lib/layout';
import { CX, CY } from './constants';

const INNER_R = BANDS.radialBurst.inner;
const OUTER_R = BANDS.radialBurst.outer;

interface Props { metrics: ModuleMetrics }

export function RadialBurst({ metrics }: Props) {
  const { totalComplexity } = metrics;
  const N = Math.min(Math.max(24 + Math.floor(totalComplexity * 1.8), 36), 72);

  // Memoize all line geometry to avoid recalculating trigonometry on re-render
  const lines = useMemo(() => Array.from({ length: N }, (_, i) => {
    const angle = (i / N) * 2 * Math.PI - Math.PI / 2;
    const variation = 0.35 + 0.65 * Math.abs(Math.sin(i * 1.6180339));
    const length = (OUTER_R - INNER_R) * variation;
    const isPrimary = i % 3 === 0;
    return {
      x1: CX + INNER_R * Math.cos(angle),
      y1: CY + INNER_R * Math.sin(angle),
      x2: CX + (INNER_R + length) * Math.cos(angle),
      y2: CY + (INNER_R + length) * Math.sin(angle),
      strokeW: isPrimary ? 0.8 : 0.35,
      baseOpacity: isPrimary ? 0.7 : 0.3,
      flicker: i % 4 === 0,
      flickerDur: `${1.2 + (i % 5) * 0.35}s`,
      flickerDelay: `${(i % 7) * 0.18}s`,
    };
  }), [N]);

  return (
    <>
      {lines.map((l, i) => {
        if (l.flicker) {
          // Native SVG animate for flickering opacity — no Framer Motion overhead
          const values = `${l.baseOpacity};${l.baseOpacity * 0.2};${l.baseOpacity * 0.8};${l.baseOpacity * 0.4};${l.baseOpacity}`;
          return (
            <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
              stroke="#7c3aed" strokeWidth={l.strokeW} opacity={l.baseOpacity}>
              <animate attributeName="opacity" values={values}
                dur={l.flickerDur} begin={l.flickerDelay} repeatCount="indefinite" />
            </line>
          );
        }
        return (
          <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
            stroke="#7c3aed" strokeWidth={l.strokeW} opacity={l.baseOpacity} />
        );
      })}
    </>
  );
}
