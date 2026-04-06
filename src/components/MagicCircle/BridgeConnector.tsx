import { motion } from 'framer-motion';
import { CX, CY } from './constants';

interface Props {
  parentX: number;
  parentY: number;
  satelliteCx: number;
  satelliteCy: number;
  color: string;
  index: number;
}

export function BridgeConnector({ parentX, parentY, satelliteCx, satelliteCy, color, index }: Props) {
  // Simple curved bridge from parent to satellite, pulled toward center
  const mx = (parentX + satelliteCx) / 2;
  const my = (parentY + satelliteCy) / 2;
  const cpx = mx + (CX - mx) * 0.25;
  const cpy = my + (CY - my) * 0.25;

  const path = `M ${parentX} ${parentY} Q ${cpx} ${cpy} ${satelliteCx} ${satelliteCy}`;

  // Gateway decoration at midpoint
  const gateX = (parentX + satelliteCx) / 2;
  const gateY = (parentY + satelliteCy) / 2;

  const dur = 2.5 + (index % 3) * 0.4;

  return (
    <g>
      {/* Glow underlay */}
      <motion.path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={3}
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.06 }}
        transition={{ duration: 1.5, delay: 1.0 + index * 0.15 }}
      />

      {/* Main bridge line */}
      <motion.path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 0.55 }}
        transition={{ duration: 1.0, delay: 0.8 + index * 0.15 }}
      />

      {/* Gateway decoration at midpoint */}
      <circle
        cx={gateX} cy={gateY} r={2.5}
        fill="#1a0a2e" stroke={color} strokeWidth={0.8} opacity={0.6}
      />
      <circle
        cx={gateX} cy={gateY} r={1}
        fill={color} opacity={0.5}
      />

      {/* Traveling particle along bridge */}
      <circle r={2} fill={color} opacity={0.8}>
        <animateMotion
          dur={`${dur}s`}
          repeatCount="indefinite"
          path={path}
        />
      </circle>
    </g>
  );
}
