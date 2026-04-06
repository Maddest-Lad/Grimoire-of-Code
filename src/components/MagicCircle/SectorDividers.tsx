import { BANDS } from '../../lib/layout';
import { CX, CY, circlePathD } from './constants';

interface SectorDef {
  label: string;
  /** Boundary angle in radians (the line between this sector and the next) */
  boundaryAngle: number;
  /** Mid-angle for placing the label */
  midAngle: number;
  /** Subtle tint color for the sector wedge */
  tint: string;
}

const SECTORS: SectorDef[] = [
  { label: 'INVOCATIONS',    boundaryAngle: Math.PI / 4,           midAngle: 0,                   tint: '#a855f720' },
  { label: 'BINDINGS',       boundaryAngle: (3 * Math.PI) / 4,    midAngle: Math.PI / 2,          tint: '#34d39918' },
  { label: 'FOUNDATION',     boundaryAngle: (5 * Math.PI) / 4,    midAngle: Math.PI,              tint: '#94a3b812' },
  { label: 'INNER WORKINGS', boundaryAngle: (7 * Math.PI) / 4,    midAngle: (3 * Math.PI) / 2,   tint: '#60a5fa15' },
];

const LABEL_R = (BANDS.stability.radius + BANDS.outerRune.inner) / 2;
const INNER_R = 60;
const OUTER_R = BANDS.rim.inner - 2;

export function SectorDividers() {
  return (
    <g>
      {SECTORS.map((sector, i) => {
        const a = sector.boundaryAngle - Math.PI / 2; // convert to SVG coordinates (top = -PI/2)
        const cos = Math.cos(a);
        const sin = Math.sin(a);

        return (
          <g key={i}>
            {/* Sector boundary line */}
            <line
              x1={CX + INNER_R * cos} y1={CY + INNER_R * sin}
              x2={CX + OUTER_R * cos} y2={CY + OUTER_R * sin}
              stroke="#3d1a6e"
              strokeWidth={0.6}
              opacity={0.35}
              strokeDasharray="4 6"
            />

            {/* Terminal decoration at rim */}
            <circle
              cx={CX + OUTER_R * cos}
              cy={CY + OUTER_R * sin}
              r={2.5}
              fill="#1a0a2e"
              stroke="#5030a0"
              strokeWidth={0.7}
              opacity={0.6}
            />

            {/* Terminal decoration at inner end */}
            <circle
              cx={CX + INNER_R * cos}
              cy={CY + INNER_R * sin}
              r={1.5}
              fill="#5030a0"
              opacity={0.4}
            />
          </g>
        );
      })}

      {/* Sector labels — curved text along arcs */}
      {SECTORS.map((sector, i) => {
        const a = sector.midAngle - Math.PI / 2;
        const labelPathId = `sector-label-${i}`;

        // Create a small arc path for the text to follow
        const arcR = LABEL_R;
        const span = 0.5; // radians of arc for the text
        const a1 = a - span / 2;
        const a2 = a + span / 2;
        const x1 = CX + arcR * Math.cos(a1);
        const y1 = CY + arcR * Math.sin(a1);
        const x2 = CX + arcR * Math.cos(a2);
        const y2 = CY + arcR * Math.sin(a2);

        // For bottom half, reverse the arc so text reads right-side up
        const isBottom = sector.midAngle > Math.PI / 2 && sector.midAngle < (3 * Math.PI) / 2;
        const d = isBottom
          ? `M ${x2} ${y2} A ${arcR} ${arcR} 0 0 0 ${x1} ${y1}`
          : `M ${x1} ${y1} A ${arcR} ${arcR} 0 0 1 ${x2} ${y2}`;

        return (
          <g key={`label-${i}`}>
            <path id={labelPathId} d={d} fill="none" stroke="none" />
            <text
              fontSize={5}
              fill="#4a2880"
              opacity={0.45}
              fontFamily="monospace"
              letterSpacing={3}
            >
              <textPath href={`#${labelPathId}`} startOffset="50%" textAnchor="middle">
                {sector.label}
              </textPath>
            </text>
          </g>
        );
      })}

      {/* Hidden arc path for label generation */}
      <defs>
        <path id="sector-label-arc" d={circlePathD(CX, CY, LABEL_R)} fill="none" />
      </defs>
    </g>
  );
}
