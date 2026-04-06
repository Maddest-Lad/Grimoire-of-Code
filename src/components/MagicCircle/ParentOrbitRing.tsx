import { motion } from 'framer-motion';

interface Props {
  cx: number;
  cy: number;
  radius: number;
}

/**
 * Mini orbit ring around a parent node that has children.
 * Renders a faint dashed circle with animated dash offset.
 */
export function ParentOrbitRing({ cx, cy, radius }: Props) {
  const circumference = 2 * Math.PI * radius;
  const dashLen = Math.max(3, circumference / 16);
  const gapLen = Math.max(5, circumference / 12);

  return (
    <motion.circle
      cx={cx}
      cy={cy}
      r={radius}
      fill="none"
      stroke="#4a2080"
      strokeWidth={0.6}
      strokeDasharray={`${dashLen} ${gapLen}`}
      opacity={0.35}
      initial={{ opacity: 0 }}
      animate={{ opacity: 0.35, strokeDashoffset: [0, circumference] }}
      transition={{
        opacity: { duration: 0.8, delay: 0.6 },
        strokeDashoffset: { duration: 18, repeat: Infinity, ease: 'linear' },
      }}
    />
  );
}
