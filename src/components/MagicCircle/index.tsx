import { useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { LaidOutNode, ModuleMetrics, Language } from '../../types/ir';
import { BANDS } from '../../lib/layout';
import { flattenNodes, buildEdges, CX, CY } from './constants';

import { Background }       from './Background';
import { RuneBand }         from './RuneBand';
import { StabilityRing }    from './StabilityRing';
import { StarPolygonLayer } from './StarPolygonLayer';
import { RadialBurst }      from './RadialBurst';
import { CenterSigil }      from './CenterSigil';
import { NodeChip }         from './NodeChip';
import { CallEdges }        from './CallEdges';
import { IdleCircle }       from './IdleCircle';

interface MagicCircleProps {
  layout: LaidOutNode | null;
  metrics: ModuleMetrics | null;
  language: Language;
}

export function MagicCircle({ layout, metrics, language }: MagicCircleProps) {
  const allNodes = useMemo(() => (layout ? flattenNodes(layout) : []), [layout]);
  const edges    = useMemo(() => buildEdges(allNodes), [allNodes]);
  const depth1Nodes = useMemo(() => allNodes.filter((n) => n.depth === 1), [allNodes]);

  if (!layout || layout.children.length === 0 || !metrics) {
    return <IdleCircle />;
  }

  const orbitDepths = [1, 2, 3] as const;

  return (
    <div
      className="w-full h-full flex items-center justify-center"
      style={{ background: '#080814' }}
    >
      <svg
        viewBox="0 0 600 600"
        style={{ width: '100%', height: '100%' }}
      >
        {/* ── Shared definitions ──────────────────────────────── */}
        <defs>
          <filter id="glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glow-center" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <radialGradient id="bgGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#130920" />
            <stop offset="100%" stopColor="#080814" />
          </radialGradient>
        </defs>

        {/* ── Layer 0: Background ─────────────────────────────── */}
        <Background />

        {/* ── Layer 1: Star polygon (inner geometric core) ────── */}
        <motion.g
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.9, delay: 0.35 }}
        >
          <StarPolygonLayer topLevelCount={depth1Nodes.length} />
        </motion.g>

        {/* ── Layer 2: Radial burst ────────────────────────────── */}
        <motion.g
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.2 }}
        >
          <RadialBurst metrics={metrics} />
        </motion.g>

        {/* ── Layer 3: Inner rune band ─────────────────────────── */}
        <motion.g
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.2, delay: 0.45 }}
        >
          <RuneBand
            r={BANDS.innerRune.inner + 7}
            pathId="rune-inner"
            seed={metrics.runeSeedString}
            direction={-1}
            duration={42}
            fontSize={7.5}
            color="#4a2880"
            opacity={0.55}
            letterSpacing={1.5}
          />
        </motion.g>

        {/* ── Layer 4: Orbital dashed rings ───────────────────── */}
        {orbitDepths.map((depth) => {
          const r = [0, BANDS.nodeOrbit.radius, BANDS.methodOrbit.radius, 284][depth];
          const dashes = ['', '4 10', '3 7', '2 5'][depth];
          const op = 0.55 - depth * 0.07;
          const offset = depth % 2 === 0 ? -80 : 100;
          return (
            <motion.circle
              key={depth}
              cx={CX} cy={CY} r={r}
              fill="none"
              stroke="#4a2080"
              strokeWidth={depth === 1 ? 1 : 0.75}
              strokeDasharray={dashes}
              opacity={op}
              animate={{ strokeDashoffset: [0, offset] }}
              transition={{ duration: 10 + depth * 6, repeat: Infinity, ease: 'linear' }}
            />
          );
        })}

        {/* ── Layer 5: Stability ring ──────────────────────────── */}
        <StabilityRing metrics={metrics} />

        {/* ── Layer 6: Spokes to depth-1 nodes ────────────────── */}
        {depth1Nodes.map((node) => (
          <line
            key={`spoke-${node.id}`}
            x1={CX} y1={CY}
            x2={node.x} y2={node.y}
            stroke="#3d1a6e"
            strokeWidth={0.5}
            opacity={0.2}
          />
        ))}

        {/* ── Layer 7: Outer rune band (behind node labels) ───── */}
        <motion.g
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.4, delay: 0.55 }}
        >
          <RuneBand
            r={BANDS.outerRune.inner + 7}
            pathId="rune-outer"
            seed={metrics.runeSeedString}
            direction={1}
            duration={58}
            fontSize={9}
            color="#5030a0"
            opacity={0.65}
            letterSpacing={2}
          />
        </motion.g>

        {/* ── Layer 8: Call edges with particles ──────────────── */}
        <CallEdges edges={edges} />

        {/* ── Layer 9: Satellite node chips ───────────────────── */}
        <AnimatePresence>
          {allNodes.map((node, i) => (
            <NodeChip key={node.id} node={node} index={i} />
          ))}
        </AnimatePresence>

        {/* ── Layer 10: Center sigil (always on top) ──────────── */}
        <CenterSigil
          topLevelCount={depth1Nodes.length}
          totalComplexity={metrics.totalComplexity}
          language={language}
        />
      </svg>
    </div>
  );
}
