import type { InscribedShape } from '../../types/ir';
import { makePolygonPoints, pointsToPath, makeStarPath, CX, CY } from './constants';

interface Props {
  shapes: InscribedShape[];
  topLevelCount: number;
}

/** Render a single hexagram as two counter-rotating triangles */
function Hexagram({ shape }: { shape: InscribedShape }) {
  const pts1 = makePolygonPoints(3, shape.radius, CX, CY, -Math.PI / 2);
  const pts2 = makePolygonPoints(3, shape.radius, CX, CY, Math.PI / 2);
  const path1 = pointsToPath(pts1);
  const path2 = pointsToPath(pts2);

  return (
    <>
      <g>
        <path d={path1} fill="none" stroke={shape.color} strokeWidth={0.9} opacity={shape.opacity} />
        <animateTransform attributeName="transform" type="rotate"
          from={`0 ${CX} ${CY}`} to={`360 ${CX} ${CY}`}
          dur={`${shape.rotationDuration}s`} repeatCount="indefinite" />
      </g>
      <g>
        <path d={path2} fill="none" stroke={shape.color} strokeWidth={0.9} opacity={shape.opacity} />
        <animateTransform attributeName="transform" type="rotate"
          from={`0 ${CX} ${CY}`} to={`-360 ${CX} ${CY}`}
          dur={`${shape.rotationDuration * 1.15}s`} repeatCount="indefinite" />
      </g>
      {/* Vertex dots for both triangles */}
      {[...pts1, ...pts2].map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={2} fill={shape.color} opacity={shape.opacity * 0.8} />
      ))}
    </>
  );
}

/** Render a single inscribed polygon shape */
function InscribedPolygon({ shape, index }: { shape: InscribedShape; index: number }) {
  if (shape.type === 'hexagram') return <Hexagram shape={shape} />;

  const pts = makePolygonPoints(shape.vertices, shape.radius);
  const polyPath = pointsToPath(pts);
  const starPath = shape.vertices >= 5 ? makeStarPath(pts) : null;

  // Alternate rotation direction per shape layer
  const direction = index % 2 === 0 ? -1 : 1;

  return (
    <>
      {/* Main polygon — rotating */}
      <g>
        <path d={polyPath} fill="none" stroke={shape.color} strokeWidth={1.0} opacity={shape.opacity} />
        <animateTransform attributeName="transform" type="rotate"
          from={`0 ${CX} ${CY}`} to={`${direction * 360} ${CX} ${CY}`}
          dur={`${shape.rotationDuration}s`} repeatCount="indefinite" />
      </g>

      {/* Star polygon for shapes with 5+ vertices */}
      {starPath && (
        <g>
          <path d={starPath} fill="none" stroke={shape.color} strokeWidth={0.7} opacity={shape.opacity * 0.75} />
          <animateTransform attributeName="transform" type="rotate"
            from={`0 ${CX} ${CY}`} to={`${direction * -360} ${CX} ${CY}`}
            dur={`${shape.rotationDuration * 1.3}s`} repeatCount="indefinite" />
        </g>
      )}

      {/* Vertex circles */}
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3}
          fill="#1a0a2e" stroke={shape.color} strokeWidth={0.8} opacity={shape.opacity * 0.9} />
      ))}
    </>
  );
}

export function StarPolygonLayer({ shapes, topLevelCount }: Props) {
  // Still render connector rays from center to an implicit polygon for visual grounding
  const n = Math.min(Math.max(topLevelCount, 3), 12);
  const rayPts = makePolygonPoints(n, 158);

  return (
    <>
      {/* Faint rays from center to implicit polygon — maintains visual anchor */}
      {n >= 4 && rayPts.map((p, i) => (
        <line key={`ray-${i}`} x1={CX} y1={CY} x2={p.x} y2={p.y}
          stroke="#2a0840" strokeWidth={0.3} opacity={0.2} />
      ))}

      {/* Connector lines between adjacent shapes for layered look */}
      {shapes.length >= 2 && shapes.slice(0, -1).map((s, i) => {
        const outer = makePolygonPoints(s.vertices, s.radius);
        const inner = makePolygonPoints(shapes[i + 1].vertices, shapes[i + 1].radius);
        const count = Math.min(outer.length, inner.length, 4);
        return Array.from({ length: count }, (_, j) => {
          const oIdx = Math.floor((j / count) * outer.length);
          const iIdx = Math.floor((j / count) * inner.length);
          return (
            <line key={`conn-${i}-${j}`}
              x1={outer[oIdx].x} y1={outer[oIdx].y}
              x2={inner[iIdx].x} y2={inner[iIdx].y}
              stroke="#2d0a50" strokeWidth={0.35} opacity={0.25} />
          );
        });
      })}

      {/* Inscribed shapes — each one a semantic encoding */}
      {shapes.map((shape, i) => (
        <InscribedPolygon key={`${shape.type}-${i}`} shape={shape} index={i} />
      ))}
    </>
  );
}
