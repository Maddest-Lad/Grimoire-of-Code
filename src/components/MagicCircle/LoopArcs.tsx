interface Props {
  count: number;
  nodeRadius: number;
  color: string;
  /** Absolute SVG x of the node center */
  nx: number;
  /** Absolute SVG y of the node center */
  ny: number;
}

/**
 * Renders 1–4 small arc segments that orbit the node at `(nx, ny)`.
 * Uses SVG <animateTransform> so the pivot is guaranteed to be the node center,
 * regardless of CSS transform-origin resolution.
 */
export function LoopArcs({ count, nodeRadius, color, nx, ny }: Props) {
  if (count <= 0) return null;
  const capped = Math.min(count, 4);
  const arcR   = nodeRadius + 5;
  const span   = Math.PI * 0.3; // ~54° — short enough to look like an orbiting tick

  return (
    <>
      {Array.from({ length: capped }, (_, i) => {
        // Stagger starting angle so arcs don't stack
        const a1 = (i / capped) * 2 * Math.PI;
        const a2 = a1 + span;
        const x1 = nx + arcR * Math.cos(a1);
        const y1 = ny + arcR * Math.sin(a1);
        const x2 = nx + arcR * Math.cos(a2);
        const y2 = ny + arcR * Math.sin(a2);
        const d  = `M ${x1} ${y1} A ${arcR} ${arcR} 0 0 1 ${x2} ${y2}`;

        const dur = `${2.8 + i * 0.6}s`;

        return (
          <path
            key={i}
            d={d}
            fill="none"
            stroke={color}
            strokeWidth={0.9}
            opacity={0.55}
          >
            {/* animateTransform guarantees pivot at (nx, ny) in SVG user units */}
            <animateTransform
              attributeName="transform"
              type="rotate"
              from={`0 ${nx} ${ny}`}
              to={`360 ${nx} ${ny}`}
              dur={dur}
              repeatCount="indefinite"
            />
          </path>
        );
      })}
    </>
  );
}
