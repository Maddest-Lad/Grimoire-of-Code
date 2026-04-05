import { motion } from 'framer-motion';
import { makePolygonPoints, pointsToPath, makeStarPath, CX, CY } from './constants';

interface Props { topLevelCount: number }

export function StarPolygonLayer({ topLevelCount }: Props) {
  const n = Math.min(Math.max(topLevelCount, 3), 12);

  const outerPts = makePolygonPoints(n, 158);
  const outerPath = pointsToPath(outerPts);
  const starPath  = makeStarPath(outerPts);

  const innerN = Math.max(n >= 4 ? n - 1 : 3, 3);
  const innerPts = makePolygonPoints(innerN, 118);
  const innerPath = pointsToPath(innerPts);

  // Mid polygon for layered look
  const midPts = makePolygonPoints(n, 138);
  const midPath = pointsToPath(midPts);

  return (
    <>
      {/* Outer polygon */}
      <path d={outerPath} fill="none" stroke="#5020a0" strokeWidth={1.2} opacity={0.65} />

      {/* Star polygon — the centrepiece of the inner decoration */}
      {n >= 5 && (
        <path d={starPath} fill="none" stroke="#7c3aed" strokeWidth={0.9} opacity={0.6} />
      )}

      {/* Mid polygon (faint) */}
      <path d={midPath} fill="none" stroke="#3d1060" strokeWidth={0.5} opacity={0.4} />

      {/* Vertex circles on outer polygon */}
      {outerPts.map((p, i) => (
        <circle
          key={i}
          cx={p.x} cy={p.y} r={3.5}
          fill="#1a0a2e"
          stroke="#a855f7"
          strokeWidth={1}
          opacity={0.8}
        />
      ))}

      {/* Vertex dots on inner polygon */}
      {innerPts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={1.5} fill="#5020a0" opacity={0.5} />
      ))}

      {/* Inner polygon — counter-rotating */}
      <motion.path
        d={innerPath}
        fill="none"
        stroke="#3d1060"
        strokeWidth={0.6}
        opacity={0.5}
        style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
        animate={{ rotate: -360 }}
        transition={{ duration: 90, repeat: Infinity, ease: 'linear' }}
      />

      {/* Faint connector lines: outer vertices → inner vertices (alternating) */}
      {outerPts.slice(0, Math.floor(n / 2)).map((p, i) => {
        const t = innerPts[i * 2 % innerPts.length];
        return (
          <line
            key={i}
            x1={p.x} y1={p.y} x2={t.x} y2={t.y}
            stroke="#2d0a50"
            strokeWidth={0.35}
            opacity={0.3}
          />
        );
      })}

      {/* Secondary star connecting outer to CX/CY — very faint "ray" effect */}
      {n >= 4 && outerPts.map((p, i) => (
        <line
          key={`ray-${i}`}
          x1={CX} y1={CY} x2={p.x} y2={p.y}
          stroke="#2a0840"
          strokeWidth={0.3}
          opacity={0.2}
        />
      ))}
    </>
  );
}
