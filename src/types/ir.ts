export type NodeType =
  | 'module'
  | 'function'
  | 'class'
  | 'method'
  | 'import'
  | 'variable'
  | 'control';

export interface IRNode {
  id: string;
  type: NodeType;
  name: string;
  children: IRNode[];
  /** Names of top-level nodes this node calls */
  calls: string[];
  /** Sum of control-flow branches (cyclomatic proxy) */
  complexity: number;
  depth: number;
  isRecursive: boolean;
  lineCount: number;
  /** for / while / do-while count (capped at 6) */
  loopCount: number;
  /** if / else / switch / ternary / && / || count (capped at 8) */
  branchCount: number;
  /** try block count */
  tryCount: number;
  /** return statement count */
  returnCount: number;
  /** parameter count (capped at 6) */
  paramCount: number;
  /** max nesting depth of control structures */
  nestingDepth: number;
}

export interface LaidOutNode {
  id: string;
  type: NodeType;
  name: string;
  x: number;
  y: number;
  /** Visual radius of the glyph */
  radius: number;
  angle: number;
  depth: number;
  /** Radius of the orbital ring this node sits on */
  orbitRadius: number;
  /** For parent nodes: radius of the mini-orbit their children sit on */
  localOrbitRadius?: number;
  /** IDs of called nodes (resolved from names) */
  calls: string[];
  complexity: number;
  isRecursive: boolean;
  children: LaidOutNode[];
  loopCount: number;
  branchCount: number;
  tryCount: number;
  returnCount: number;
  paramCount: number;
  nestingDepth: number;
}

/** A satellite sub-circle representing control flow attached to a node */
export interface SubCircle {
  type: 'loop' | 'branch' | 'try';
  /** SVG center x */
  cx: number;
  /** SVG center y */
  cy: number;
  /** Visual radius (10-24) */
  radius: number;
  /** The raw count (loopCount, branchCount, or tryCount) */
  count: number;
  /** ID of the parent node this sub-circle belongs to */
  parentId: string;
  /** Placement angle from parent (radians) */
  angle: number;
}

export interface ModuleMetrics {
  totalLoops: number;
  totalBranches: number;
  totalTries: number;
  totalComplexity: number;
  topLevelCount: number;
  /** Concatenated identifier list — seeds the rune bands */
  runeSeedString: string;
  /** Number of distinct structural domains present (imports, classes, functions, variables) */
  domainCount: number;
  /** Whether any node in the tree is recursive */
  hasRecursion: boolean;
}

/** A promoted sub-circle rendered as its own mini magic circle outside the main rim */
export interface SatelliteCircle {
  type: 'loop' | 'branch' | 'try';
  /** SVG center x */
  cx: number;
  /** SVG center y */
  cy: number;
  /** Visual radius of the satellite circle */
  radius: number;
  /** The raw control flow count */
  count: number;
  /** ID of the parent node */
  parentId: string;
  /** Angle from global center */
  angle: number;
  /** Complexity of the parent function (drives internal detail density) */
  parentComplexity: number;
  /** Parent node position for bridge connector */
  parentX: number;
  parentY: number;
  /** Rune seed for this satellite's mini rune band */
  runeSeed: string;
}

export type InscribedShapeType = 'triangle' | 'square' | 'pentagon' | 'hexagram';

export interface InscribedShape {
  type: InscribedShapeType;
  vertices: number;
  radius: number;
  rotationDuration: number;
  color: string;
  opacity: number;
}

export type Language =
  | 'javascript'
  | 'typescript'
  | 'python'
  | 'java'
  | 'cpp'
  | 'rust'
  | 'go'
  | 'unknown';
