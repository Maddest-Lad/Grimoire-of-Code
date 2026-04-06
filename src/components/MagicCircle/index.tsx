import { useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { LaidOutNode, ModuleMetrics, Language, SubCircle, InscribedShape, SatelliteCircle } from '../../types/ir';
import { BANDS } from '../../lib/layout';
import { generateSemanticBand } from '../../lib/runes';
import { flattenNodes, buildEdges, findNexusPoints, CX, CY } from './constants';

import { Background }       from './Background';
import { RuneBand }         from './RuneBand';
import { StabilityRing }    from './StabilityRing';
import { StarPolygonLayer } from './StarPolygonLayer';
import { RadialBurst }      from './RadialBurst';
import { CenterSigil }      from './CenterSigil';
import { NodeChip }         from './NodeChip';
import { CallEdges }        from './CallEdges';
import { IdleCircle }       from './IdleCircle';
import { ParentOrbitRing }  from './ParentOrbitRing';
import { SubCircleLayer }   from './SubCircleLayer';
import { SectorDividers }       from './SectorDividers';
import { SatelliteCircleLayer } from './SatelliteCircleLayer';

interface MagicCircleProps {
  layout: LaidOutNode | null;
  metrics: ModuleMetrics | null;
  language: Language;
  subCircles: SubCircle[];
  inscribedShapes: InscribedShape[];
  satelliteCircles: SatelliteCircle[];
  showLabels: boolean;
}

export function MagicCircle({ layout, metrics, language, subCircles, inscribedShapes, satelliteCircles, showLabels }: MagicCircleProps) {
  const allNodes = useMemo(() => (layout ? flattenNodes(layout) : []), [layout]);
  const edges       = useMemo(() => buildEdges(allNodes), [allNodes]);
  const nexusPoints = useMemo(() => findNexusPoints(allNodes), [allNodes]);
  const depth1Nodes = useMemo(() => allNodes.filter((n) => n.depth === 1), [allNodes]);

  // Semantic rune bands: inner = functions/methods, outer = imports
  const innerBandText = useMemo(() => {
    const funcNodes = allNodes.filter(n => n.type === 'function' || n.type === 'method' || n.type === 'class');
    return funcNodes.length > 0
      ? generateSemanticBand(funcNodes.map(n => ({ name: n.name, type: n.type, complexity: n.complexity })))
      : undefined;
  }, [allNodes]);

  const outerBandText = useMemo(() => {
    const importNodes = allNodes.filter(n => n.type === 'import' || n.type === 'variable');
    return importNodes.length > 0
      ? generateSemanticBand(importNodes.map(n => ({ name: n.name, type: n.type, complexity: n.complexity })))
      : undefined;
  }, [allNodes]);

  // Build a set of nodeId:type pairs for sub-circle decoration suppression
  // Include both regular sub-circles and promoted satellite circles
  const suppressedDecorations = useMemo(() => {
    const set = new Set<string>();
    for (const sc of subCircles) {
      set.add(`${sc.parentId}:${sc.type}`);
    }
    for (const sat of satelliteCircles) {
      set.add(`${sat.parentId}:${sat.type}`);
    }
    return set;
  }, [subCircles, satelliteCircles]);

  if (!layout || layout.children.length === 0 || !metrics) {
    return <IdleCircle />;
  }

  return (
    <div
      className="w-full h-full flex items-center justify-center"
      style={{ background: '#080814' }}
    >
      <svg
        viewBox="0 0 900 900"
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

        {/* ── Extended background fill for full viewBox ──── */}
        <rect x="0" y="0" width="900" height="900" fill="#080814" />

        {/* ── Layer 0: Background ─────────────────────────────── */}
        <Background />

        {/* ── Layer 0b: Sector dividers ───────────────────────── */}
        <SectorDividers />

        {/* ── Layer 1: Star polygon (inner geometric core) ────── */}
        <motion.g
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.9, delay: 0.35 }}
        >
          <StarPolygonLayer shapes={inscribedShapes} topLevelCount={depth1Nodes.length} />
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
            semanticText={innerBandText}
          />
        </motion.g>

        {/* ── Layer 4: Main orbital ring (depth-1) ────────────── */}
        <motion.circle
          cx={CX} cy={CY} r={BANDS.nodeOrbit.radius}
          fill="none"
          stroke="#4a2080"
          strokeWidth={1}
          strokeDasharray="4 10"
          opacity={0.48}
          animate={{ strokeDashoffset: [0, 100] }}
          transition={{ duration: 16, repeat: Infinity, ease: 'linear' }}
        />

        {/* ── Layer 4b: Parent orbit rings (depth-2 mini-orbits) ─ */}
        {depth1Nodes
          .filter((n) => n.localOrbitRadius != null && n.children.length > 0)
          .map((node) => (
            <ParentOrbitRing
              key={`orbit-${node.id}`}
              cx={node.x}
              cy={node.y}
              radius={node.localOrbitRadius!}
            />
          ))}

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
            semanticText={outerBandText}
          />
        </motion.g>

        {/* ── Layer 8: Call edges with particles ──────────────── */}
        <CallEdges edges={edges} nexusPoints={nexusPoints} />

        {/* ── Layer 8b: Sub-circles (non-promoted control flow) ─── */}
        <SubCircleLayer subCircles={subCircles} allNodes={allNodes} />

        {/* ── Layer 8c: Satellite circles (promoted control flow) ── */}
        <SatelliteCircleLayer satellites={satelliteCircles} />

        {/* ── Layer 9: Satellite node chips ───────────────────── */}
        <AnimatePresence>
          {allNodes.map((node, i) => (
            <NodeChip
              key={node.id}
              node={node}
              index={i}
              suppressedDecorations={suppressedDecorations}
              showLabels={showLabels}
            />
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
