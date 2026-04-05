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
  /** Count of control-flow branches (cyclomatic proxy) */
  complexity: number;
  depth: number;
  isRecursive: boolean;
  lineCount: number;
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
