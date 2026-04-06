import type { SatelliteCircle } from '../../types/ir';
import { SatelliteCircleComponent } from './SatelliteCircleComponent';

interface Props {
  satellites: SatelliteCircle[];
}

export function SatelliteCircleLayer({ satellites }: Props) {
  if (satellites.length === 0) return null;

  return (
    <g>
      {satellites.map((sat, i) => (
        <SatelliteCircleComponent
          key={`sat-${sat.parentId}-${sat.type}`}
          satellite={sat}
          index={i}
        />
      ))}
    </g>
  );
}
