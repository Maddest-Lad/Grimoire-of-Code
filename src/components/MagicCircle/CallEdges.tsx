import { motion, AnimatePresence } from 'framer-motion';
import type { Edge } from './constants';

interface Props { edges: Edge[] }

export function CallEdges({ edges }: Props) {
  return (
    <AnimatePresence>
      {edges.map((edge, i) => {
        const particleDur = 2.2 + (i % 4) * 0.45;

        return (
          <g key={edge.id}>
            {/* Draw-in bezier on mount */}
            <motion.path
              d={edge.path}
              fill="none"
              stroke="#c084fc"
              strokeWidth={1.1}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.7 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2, delay: 1.4 + i * 0.12 }}
            />

            {/* Traveling light particle using native SVG animateMotion */}
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <circle r="2.5" fill="#e8c0ff" opacity="0.92">
                <animateMotion
                dur={`${particleDur}s`}
                repeatCount="indefinite"
                path={edge.path}
              />
            </circle>
          </g>
        );
      })}
    </AnimatePresence>
  );
}
