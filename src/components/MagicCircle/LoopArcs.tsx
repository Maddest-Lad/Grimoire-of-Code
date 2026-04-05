import { motion } from 'framer-motion';

interface Props {
  count: number;
  nodeRadius: number;
  color: string;
  /** Absolute SVG x of the node center */
  nx: number;
  /** Absolute SVG y of the node center */
  ny: number;
}

/**
 * Renders 1–6 small arc segments orbiting the node at `(nx, ny)`.
 * Each arc rotates independently — the loop is literally animated.
 */
export function LoopArcs({ count, nodeRadius, color, nx, ny }: Props) {
  if (count <= 0) return null;
  const capped = Math.min(count, 6);
  const arcR   = nodeRadius + 5.5;
  const span   = Math.PI * 0.42; // ~75° arc

  return (
    <>
      {Array.from({ length: capped }, (_, i) => {
        const a1 = (i / capped) * 2 * Math.PI;
        const a2 = a1 + span;
        const x1 = nx + arcR * Math.cos(a1);
        const y1 = ny + arcR * Math.sin(a1);
        const x2 = nx + arcR * Math.cos(a2);
        const y2 = ny + arcR * Math.sin(a2);
        const d  = `M ${x1} ${y1} A ${arcR} ${arcR} 0 0 1 ${x2} ${y2}`;

        return (
          <motion.path
            key={i}
            d={d}
            fill="none"
            stroke={color}
            strokeWidth={1.2}
            opacity={0.7}
            // Rotate around the node center using SVG view-box coordinates
            style={{ transformBox: 'view-box', transformOrigin: `${nx}px ${ny}px` }}
            animate={{ rotate: 360 }}
            transition={{
              duration: 2.2 + i * 0.55,
              repeat: Infinity,
              ease: 'linear',
            }}
          />
        );
      })}
    </>
  );
}
