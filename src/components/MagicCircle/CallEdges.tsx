import { motion, AnimatePresence } from 'framer-motion';
import type { Edge, NexusPoint } from './constants';

interface Props {
  edges: Edge[];
  nexusPoints: NexusPoint[];
}

export function CallEdges({ edges, nexusPoints }: Props) {
  return (
    <AnimatePresence>
      {edges.map((edge, i) => {
        const baseDur = 2.2 + (i % 4) * 0.45;
        // Scale stroke width by importance
        const strokeW = Math.min(0.8 + edge.importance * 0.4, 2.5);
        // More important edges get more particles
        const particleCount = edge.importance >= 3 ? 3 : edge.importance >= 2 ? 2 : 1;

        return (
          <g key={edge.id}>
            {/* Draw-in bezier/arc on mount */}
            <motion.path
              d={edge.path}
              fill="none"
              stroke="#c084fc"
              strokeWidth={strokeW}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.5 + edge.importance * 0.08 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2, delay: 1.4 + i * 0.12 }}
            />

            {/* Faint glow underlay for important edges */}
            {edge.importance >= 2 && (
              <motion.path
                d={edge.path}
                fill="none"
                stroke="#c084fc"
                strokeWidth={strokeW + 2}
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.08 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.5, delay: 1.4 + i * 0.12 }}
              />
            )}

            {/* Traveling light particles */}
            {Array.from({ length: particleCount }, (_, p) => {
              const dur = baseDur + p * 0.7;
              const r = edge.importance >= 2 ? 3 : 2.5;
              return (
                <circle key={p} r={r} fill="#e8c0ff" opacity={0.85 - p * 0.15}>
                  <animateMotion
                    dur={`${dur}s`}
                    repeatCount="indefinite"
                    path={edge.path}
                    begin={`${p * (baseDur / particleCount)}s`}
                  />
                </circle>
              );
            })}
          </g>
        );
      })}

      {/* Nexus points — pulsing bright dots at heavily-targeted nodes */}
      {nexusPoints.map((np, i) => (
        <g key={`nexus-${i}`}>
          {/* Glow halo */}
          <motion.circle
            cx={np.x} cy={np.y}
            r={6 + np.incomingCount}
            fill="none"
            stroke="#c084fc"
            strokeWidth={0.5}
            animate={{ opacity: [0.1, 0.3, 0.1], r: [5 + np.incomingCount, 7 + np.incomingCount, 5 + np.incomingCount] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
          {/* Core bright dot */}
          <motion.circle
            cx={np.x} cy={np.y}
            r={2.5}
            fill="#e8c0ff"
            animate={{ opacity: [0.5, 0.9, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut', delay: i * 0.3 }}
          />
        </g>
      ))}
    </AnimatePresence>
  );
}
