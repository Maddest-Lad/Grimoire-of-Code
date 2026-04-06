import { useMemo } from 'react';
import type { SubCircle as SubCircleType, LaidOutNode } from '../../types/ir';
import { SubCircle } from './SubCircle';

interface Props {
  subCircles: SubCircleType[];
  allNodes: LaidOutNode[];
}

export function SubCircleLayer({ subCircles, allNodes }: Props) {
  const nodeMap = useMemo(() => {
    const map = new Map<string, LaidOutNode>();
    for (const node of allNodes) map.set(node.id, node);
    return map;
  }, [allNodes]);

  if (subCircles.length === 0) return null;

  return (
    <g>
      {subCircles.map((sc, i) => (
        <SubCircle
          key={`${sc.parentId}-${sc.type}`}
          subCircle={sc}
          parentNode={nodeMap.get(sc.parentId)}
          index={i}
        />
      ))}
    </g>
  );
}
