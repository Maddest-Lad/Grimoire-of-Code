import { useMemo } from 'react';
import { moduleRunes } from '../../lib/runes';
import { circlePathD, CX, CY } from './constants';

interface RuneBandProps {
  r: number;
  /** Unique SVG ID for the hidden circle path used by textPath */
  pathId: string;
  seed: string;
  direction?: 1 | -1;
  duration?: number;
  fontSize?: number;
  color?: string;
  opacity?: number;
  letterSpacing?: number;
  /** Pre-computed semantic text — overrides seed-based generation when provided */
  semanticText?: string;
}

export function RuneBand({
  r,
  pathId,
  seed,
  direction = 1,
  duration = 60,
  fontSize = 9,
  color = '#5030a0',
  opacity = 0.65,
  letterSpacing = 2,
  semanticText,
}: RuneBandProps) {
  const text = useMemo(
    () => semanticText || moduleRunes(seed || 'grimoire', 150),
    [seed, semanticText],
  );
  const d = useMemo(() => circlePathD(CX, CY, r), [r]);

  const fromDeg = 0;
  const toDeg = direction * 360;

  return (
    <g>
      {/* Hidden circle path that the text follows */}
      <path id={pathId} d={d} fill="none" stroke="none" />
      <text
        fontSize={fontSize}
        fill={color}
        opacity={opacity}
        fontFamily="Georgia, 'Arial Unicode MS', 'Segoe UI Symbol', serif"
        letterSpacing={letterSpacing}
      >
        <textPath href={`#${pathId}`}>{text}</textPath>
      </text>
      {/* Native SVG rotation — immune to viewBox changes */}
      <animateTransform
        attributeName="transform"
        type="rotate"
        from={`${fromDeg} ${CX} ${CY}`}
        to={`${toDeg} ${CX} ${CY}`}
        dur={`${duration}s`}
        repeatCount="indefinite"
      />
    </g>
  );
}
