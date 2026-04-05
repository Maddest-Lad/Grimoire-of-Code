import { CX, CY } from './constants';

export function Background() {
  return (
    <>
      {/* Filled background disc */}
      <circle cx={CX} cy={CY} r={294} fill="url(#bgGrad)" />

      {/* Tick marks on the outer rim (36 marks, every 10°) */}
      {Array.from({ length: 36 }, (_, i) => {
        const angle = (i / 36) * 2 * Math.PI;
        const major = i % 3 === 0;
        const r1 = 278, r2 = major ? 292 : 285;
        return (
          <line
            key={i}
            x1={CX + r1 * Math.cos(angle)} y1={CY + r1 * Math.sin(angle)}
            x2={CX + r2 * Math.cos(angle)} y2={CY + r2 * Math.sin(angle)}
            stroke="#3d1a6e"
            strokeWidth={major ? 1.5 : 0.5}
            opacity={0.75}
          />
        );
      })}

      {/* Cardinal + intercardinal symbols */}
      {(['✦', '◈', '⊕', '◈', '✦', '◈', '⊕', '◈'] as const).map((sym, i) => {
        const a = (i / 8) * 2 * Math.PI - Math.PI / 2;
        return (
          <text
            key={i}
            x={CX + 268 * Math.cos(a)}
            y={CY + 268 * Math.sin(a)}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#3d1a6e"
            fontSize={9}
            fontFamily="monospace"
            opacity={0.85}
          >
            {sym}
          </text>
        );
      })}

      {/* Outer border ring */}
      <circle cx={CX} cy={CY} r={293} fill="none" stroke="#2d1254" strokeWidth={1.5} />

      {/* Second outer ring (faint) */}
      <circle cx={CX} cy={CY} r={275} fill="none" stroke="#1e0a3e" strokeWidth={0.5} opacity={0.5} />
    </>
  );
}
