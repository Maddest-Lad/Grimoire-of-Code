import type { Edge, NexusPoint } from './constants';

interface Props {
  edges: Edge[];
  nexusPoints: NexusPoint[];
}

export function CallEdges({ edges, nexusPoints }: Props) {
  return (
    <g>
      {edges.map((edge, i) => {
        const baseDur = 2.2 + (i % 4) * 0.45;
        const strokeW = Math.min(0.8 + edge.importance * 0.4, 2.5);
        const particleCount = edge.importance >= 3 ? 3 : edge.importance >= 2 ? 2 : 1;
        const opacity = 0.5 + edge.importance * 0.08;
        const delay = `${1.4 + i * 0.12}s`;

        return (
          <g key={edge.id}>
            {/* Main edge path — static with fade-in via CSS */}
            <path
              d={edge.path}
              fill="none"
              stroke="#c084fc"
              strokeWidth={strokeW}
              opacity={opacity}
              style={{ animation: `nodeEntry 1.2s ease-out ${delay} both` }}
            />

            {/* Faint glow underlay for important edges */}
            {edge.importance >= 2 && (
              <path
                d={edge.path}
                fill="none"
                stroke="#c084fc"
                strokeWidth={strokeW + 2}
                opacity={0.08}
              />
            )}

            {/* Traveling light particles — native SVG animateMotion */}
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

      {/* Nexus points — native SVG animate for pulsing */}
      {nexusPoints.map((np, i) => (
        <g key={`nexus-${i}`}>
          <circle cx={np.x} cy={np.y} r={6 + np.incomingCount}
            fill="none" stroke="#c084fc" strokeWidth={0.5} opacity={0.2}>
            <animate attributeName="opacity" values="0.1;0.3;0.1" dur="2s" repeatCount="indefinite" />
          </circle>
          <circle cx={np.x} cy={np.y} r={2.5} fill="#e8c0ff" opacity={0.7}>
            <animate attributeName="opacity" values="0.5;0.9;0.5"
              dur="1.5s" begin={`${i * 0.3}s`} repeatCount="indefinite" />
          </circle>
        </g>
      ))}
    </g>
  );
}
