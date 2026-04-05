import { motion } from 'framer-motion';
import { CX, CY } from './constants';

export function IdleCircle() {
  return (
    <div
      className="w-full h-full flex items-center justify-center"
      style={{ background: '#080814' }}
    >
      <svg
        viewBox="0 0 600 600"
        style={{ width: '100%', height: '100%', maxWidth: 600, maxHeight: 600, opacity: 0.55 }}
      >
        {[170, 125, 80].map((r, i) => (
          <motion.circle
            key={r}
            cx={CX} cy={CY} r={r}
            fill="none"
            stroke="#4a2080"
            strokeWidth={0.5}
            strokeDasharray={i === 0 ? '4 10' : '3 7'}
            opacity={0.45 - i * 0.08}
            animate={{ strokeDashoffset: [0, i % 2 ? 60 : -60] }}
            transition={{ duration: 6 + i * 3, repeat: Infinity, ease: 'linear' }}
          />
        ))}

        {/* Dim radial lines */}
        {Array.from({ length: 16 }, (_, i) => {
          const a = (i / 16) * 2 * Math.PI;
          return (
            <line key={i}
              x1={CX + 58 * Math.cos(a)} y1={CY + 58 * Math.sin(a)}
              x2={CX + 95 * Math.cos(a)} y2={CY + 95 * Math.sin(a)}
              stroke="#3d1a6e" strokeWidth={0.4} opacity={0.4}
            />
          );
        })}

        <motion.circle
          cx={CX} cy={CY} r={25}
          fill="#1a0a2e" stroke="#c084fc" strokeWidth={1.5}
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        />
        <circle cx={CX} cy={CY} r={16} fill="none" stroke="#7c3aed" strokeWidth={0.5} />

        <text
          x={CX} y={CY + 1}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#4a2080"
          fontSize={8}
          fontFamily="monospace"
        >
          grimoire
        </text>
      </svg>
    </div>
  );
}
