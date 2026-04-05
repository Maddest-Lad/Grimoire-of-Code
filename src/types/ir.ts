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

export interface ModuleMetrics {
  totalLoops: number;
  totalBranches: number;
  totalTries: number;
  totalComplexity: number;
  topLevelCount: number;
  /** Concatenated identifier list — seeds the rune bands */
  runeSeedString: string;
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
