import { motion } from 'framer-motion';
import type { ModuleMetrics } from '../../types/ir';
import { BANDS } from '../../lib/layout';
import { CX, CY } from './constants';

const R = BANDS.stability.radius;

interface Props { metrics: ModuleMetrics }

export function StabilityRing({ metrics }: Props) {
  const { totalTries, totalBranches, totalComplexity } = metrics;

  // Code is "unstable" when it has significant error-handling or very high branch density
  const isUnstable =
    totalTries >= 2 || (totalComplexity > 8 && totalBranches > totalComplexity * 0.5);

  if (!isUnstable) {
    return (
      <circle
        cx={CX} cy={CY} r={R}
        fill="none"
        stroke="#5030a0"
        strokeWidth={1}
        opacity={0.38}
      />
    );
  }

  // Fragmented: segment the arc based on try-count, then flicker
  const segments = Math.min(4 + totalTries * 2, 14);
  const circumference = 2 * Math.PI * R;
  const dashLen = (circumference / segments) * 0.55;
  const gapLen = (circumference / segments) * 0.45;

  return (
    <motion.circle
      cx={CX} cy={CY} r={R}
      fill="none"
      stroke="#c084fc"
      strokeWidth={1.5}
      strokeDasharray={`${dashLen} ${gapLen}`}
      animate={{ opacity: [0.2, 0.65, 0.15, 0.5, 0.7, 0.1, 0.45] }}
      transition={{
        duration: 1.8 + totalTries * 0.4,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />
  );
}
