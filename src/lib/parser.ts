import type { IRNode, Language, NodeType } from '../types/ir';

// ─── ID generation ───────────────────────────────────────────────────────────

let _idCounter = 0;

function newId(): string {
  return `n${_idCounter++}`;
}

function makeNode(type: NodeType, name: string, depth: number): IRNode {
  return {
    id: newId(),
    type,
    name,
    children: [],
    calls: [],
    complexity: 1,
    depth,
    isRecursive: false,
    lineCount: 0,
    loopCount: 0,
    branchCount: 0,
    tryCount: 0,
    returnCount: 0,
    paramCount: 0,
    nestingDepth: 0,
  };
}

// ─── Body analysis ────────────────────────────────────────────────────────────

interface BodyAnalysis {
  complexity: number;
  loopCount: number;
  branchCount: number;
  tryCount: number;
  returnCount: number;
  nestingDepth: number;
}

function analyzeBody(body: string): BodyAnalysis {
  const loopCount = Math.min(
    (body.match(/\bfor\b/g)?.length ?? 0) +
    (body.match(/\bwhile\b/g)?.length ?? 0) +
    (body.match(/\bdo\b/g)?.length ?? 0),
    6,
  );
  const branchCount = Math.min(
    (body.match(/\bif\b/g)?.length ?? 0) +
    (body.match(/\belse\b/g)?.length ?? 0) +
    (body.match(/\bswitch\b/g)?.length ?? 0) +
    (body.match(/\bcase\b/g)?.length ?? 0) +
    (body.match(/\?\s*[^:?]/g)?.length ?? 0) +
    (body.match(/&&/g)?.length ?? 0) +
    (body.match(/\|\|/g)?.length ?? 0) +
    (body.match(/\?\?/g)?.length ?? 0),
    8,
  );
  const tryCount = body.match(/\btry\b/g)?.length ?? 0;
  const returnCount = body.match(/\breturn\b/g)?.length ?? 0;

  let depth = 0, maxDepth = 0;
  for (const ch of body) {
    if (ch === '{') { depth++; if (depth > maxDepth) maxDepth = depth; }
    else if (ch === '}') depth--;
  }

  const complexity = Math.min(1 + loopCount + branchCount + tryCount, 20);
  return { complexity, loopCount, branchCount, tryCount, returnCount, nestingDepth: maxDepth };
}

function analyzeBodyPython(body: string): BodyAnalysis {
  const loopCount = Math.min(
    (body.match(/\bfor\b/g)?.length ?? 0) +
    (body.match(/\bwhile\b/g)?.length ?? 0),
    6,
  );
  const branchCount = Math.min(
    (body.match(/\bif\b/g)?.length ?? 0) +
    (body.match(/\belif\b/g)?.length ?? 0) +
    (body.match(/\belse\b/g)?.length ?? 0) +
    (body.match(/\band\b/g)?.length ?? 0) +
    (body.match(/\bor\b/g)?.length ?? 0),
    8,
  );
  const tryCount = body.match(/\btry\b/g)?.length ?? 0;
  const returnCount = body.match(/\breturn\b/g)?.length ?? 0;

  const lines = body.split('\n').filter((l) => l.trim());
  let maxIndent = 0;
  for (const line of lines) {
    const indent = line.length - line.trimStart().length;
    if (indent > maxIndent) maxIndent = indent;
  }

  const complexity = Math.min(1 + loopCount + branchCount + tryCount, 20);
  return { complexity, loopCount, branchCount, tryCount, returnCount, nestingDepth: Math.round(maxIndent / 4) };
}

function applyAnalysis(node: IRNode, analysis: BodyAnalysis): void {
  node.complexity = analysis.complexity;
  node.loopCount = analysis.loopCount;
  node.branchCount = analysis.branchCount;
  node.tryCount = analysis.tryCount;
  node.returnCount = analysis.returnCount;
  node.nestingDepth = analysis.nestingDepth;
}

// ─── Parameter count ──────────────────────────────────────────────────────────

function extractParamCount(line: string): number {
  const start = line.indexOf('(');
  if (start === -1) return 0;
  let depth = 0, end = -1;
  for (let i = start; i < line.length; i++) {
    if (line[i] === '(') depth++;
    else if (line[i] === ')') { depth--; if (depth === 0) { end = i; break; } }
  }
  if (end === -1) return 0;
  const inner = line.slice(start + 1, end).trim();
  if (!inner) return 0;
  let d = 0, count = 1;
  for (const ch of inner) {
    if (ch === '(' || ch === '[' || ch === '<') d++;
    else if (ch === ')' || ch === ']' || ch === '>') d--;
    else if (ch === ',' && d === 0) count++;
  }
  return Math.min(count, 6);
}

// ─── Utility helpers ─────────────────────────────────────────────────────────

/** Returns the brace delta (+/-) for a single line, ignoring string contents. */
function braceDelta(line: string): number {
  const noComment = line.replace(/\/\/.*$/, '');
  let inStr = false;
  let strChar = '';
  let count = 0;
  for (let i = 0; i < noComment.length; i++) {
    const ch = noComment[i];
    if (inStr) {
      if (ch === strChar && noComment[i - 1] !== '\\') inStr = false;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { inStr = true; strChar = ch; continue; }
    if (ch === '{') count++;
    else if (ch === '}') count--;
  }
  return count;
}

function extractBlock(
  lines: string[],
  startLine: number,
): { content: string; endLine: number } | null {
  let depth = 0;
  let started = false;
  for (let i = startLine; i < lines.length; i++) {
    const line = lines[i];
    if (!started && line.includes('{')) started = true;
    depth += braceDelta(line);
    if (started && depth === 0) {
      return { content: lines.slice(startLine, i + 1).join('\n'), endLine: i };
    }
  }
  return null;
}

// ─── JS/TS keyword exclusions ─────────────────────────────────────────────────

const JS_KEYWORDS = new Set([
  'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue',
  'return', 'throw', 'try', 'catch', 'finally', 'new', 'delete', 'typeof',
  'instanceof', 'void', 'yield', 'await', 'async', 'function', 'class',
  'extends', 'super', 'this', 'const', 'let', 'var', 'import', 'export',
  'default', 'from', 'of', 'in', 'true', 'false', 'null', 'undefined',
  'console', 'window', 'document', 'process', 'require', 'module', 'exports',
  'Object', 'Array', 'String', 'Number', 'Boolean', 'Promise', 'Math', 'JSON',
  'Error', 'Map', 'Set', 'Symbol', 'Date', 'RegExp',
  'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval',
  'fetch', 'URL', 'URLSearchParams', 'parseInt', 'parseFloat', 'isNaN',
]);

function detectCalls(body: string, knownNames: Set<string>): string[] {
  const calls = new Set<string>();
  const pat = /(?<![.\w])([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g;
  let m: RegExpExecArray | null;
  while ((m = pat.exec(body)) !== null) {
    const name = m[1];
    if (knownNames.has(name) && !JS_KEYWORDS.has(name)) calls.add(name);
  }
  return Array.from(calls);
}

function detectRecursion(nodes: IRNode[]): void {
  const nameToNode = new Map(nodes.map((n) => [n.name, n]));
  for (const node of nodes) {
    if (node.calls.includes(node.name)) node.isRecursive = true;
    for (const callName of node.calls) {
      const callee = nameToNode.get(callName);
      if (callee?.calls.includes(node.name)) {
        node.isRecursive = true;
        callee.isRecursive = true;
      }
    }
  }
}

// ─── Class method extraction ──────────────────────────────────────────────────

function parseClassMethods(classBody: string, classNode: IRNode): void {
  const lines = classBody.split('\n');
  const constructorPat = /^\s{2,}constructor\s*\(/;
  const methodPat =
    /^\s{2,}(?:(?:static|async|get|set|public|private|protected|override|abstract|readonly)\s+)*(?:async\s+)?([#a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (constructorPat.test(line)) {
      const method = makeNode('method', 'constructor', classNode.depth + 1);
      const bodySlice = lines.slice(i).join('\n').slice(0, 800);
      applyAnalysis(method, analyzeBody(bodySlice));
      method.paramCount = extractParamCount(line);
      classNode.children.push(method);
      continue;
    }

    const m = line.match(methodPat);
    if (m && m[1] !== 'constructor') {
      const method = makeNode('method', m[1], classNode.depth + 1);
      const bodySlice = lines.slice(i).join('\n').slice(0, 800);
      applyAnalysis(method, analyzeBody(bodySlice));
      method.paramCount = extractParamCount(line);
      classNode.children.push(method);
    }
  }
}

// ─── JavaScript / TypeScript parser ──────────────────────────────────────────

type IRNodeWithBody = IRNode & { _body?: string };

function parseJS(code: string): IRNode {
  _idCounter = 0;
  const root = makeNode('module', 'module', 0);
  root.lineCount = code.split('\n').length;

  const lines = code.split('\n');
  const topLevelNames = new Set<string>();
  const topLevelNodes: IRNodeWithBody[] = [];
  let skipUntilLine = -1;

  for (let i = 0; i < lines.length; i++) {
    if (i <= skipUntilLine) continue;

    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed || line[0] === ' ' || line[0] === '\t') continue;
    if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) continue;

    // import … from '…'
    const importMatch = trimmed.match(
      /^import\s+(?:type\s+)?(?:.+?\s+from\s+)?['"]([^'"]+)['"]/,
    );
    if (importMatch) {
      root.children.push(makeNode('import', importMatch[1], 1));
      continue;
    }

    // require('…')
    const requireMatch = trimmed.match(
      /^(?:const|let|var)\s+(?:\{[^}]+\}|\w+)\s*=\s*require\s*\(\s*['"]([^'"]+)['"]\s*\)/,
    );
    if (requireMatch) {
      root.children.push(makeNode('import', requireMatch[1], 1));
      continue;
    }

    // class …
    const classMatch = trimmed.match(
      /^(?:export\s+(?:default\s+)?)?(?:abstract\s+)?class\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/,
    );
    if (classMatch) {
      const node = makeNode('class', classMatch[1], 1);
      topLevelNames.add(classMatch[1]);
      topLevelNodes.push(node);
      root.children.push(node);
      const block = extractBlock(lines, i);
      if (block) {
        parseClassMethods(block.content, node);
        node.complexity = node.children.length + 1;
        skipUntilLine = block.endLine;
      }
      continue;
    }

    // function declaration
    const funcMatch = trimmed.match(
      /^(?:export\s+(?:default\s+)?)?(?:async\s+)?function\s*\*?\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/,
    );
    if (funcMatch) {
      const node: IRNodeWithBody = makeNode('function', funcMatch[1], 1);
      topLevelNames.add(funcMatch[1]);
      topLevelNodes.push(node);
      root.children.push(node);
      const block = extractBlock(lines, i);
      if (block) {
        applyAnalysis(node, analyzeBody(block.content));
        node.paramCount = extractParamCount(trimmed);
        node._body = block.content;
        skipUntilLine = block.endLine;
      }
      continue;
    }

    // Arrow / function-expression assignment
    const arrowMatch = trimmed.match(
      /^(?:export\s+)?(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:async\s+)?(?:\([^)]*\)|[a-zA-Z_$]\w*)\s*=>/,
    );
    const fnExprMatch =
      !arrowMatch &&
      trimmed.match(
        /^(?:export\s+)?(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:async\s+)?function/,
      );
    const fnMatch = arrowMatch ?? fnExprMatch;
    if (fnMatch) {
      const node: IRNodeWithBody = makeNode('function', fnMatch[1], 1);
      topLevelNames.add(fnMatch[1]);
      topLevelNodes.push(node);
      root.children.push(node);
      const block = extractBlock(lines, i);
      if (block) {
        applyAnalysis(node, analyzeBody(block.content));
        node.paramCount = extractParamCount(trimmed);
        node._body = block.content;
        skipUntilLine = block.endLine;
      }
      continue;
    }

    // Top-level variable (non-function)
    const varMatch = trimmed.match(
      /^(?:export\s+)?(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*[=;]/,
    );
    if (varMatch && !trimmed.includes('=>') && !trimmed.includes('function')) {
      const node = makeNode('variable', varMatch[1], 1);
      topLevelNodes.push(node);
      root.children.push(node);
    }
  }

  // Second pass: resolve calls
  for (const node of topLevelNodes) {
    if (node._body) {
      node.calls = detectCalls(node._body, topLevelNames);
      delete node._body;
    }
  }
  detectRecursion(topLevelNodes.filter((n) => n.type === 'function'));
  return root;
}

// ─── Python parser ────────────────────────────────────────────────────────────

const PYTHON_KEYWORDS = new Set([
  'if', 'elif', 'else', 'for', 'while', 'with', 'try', 'except', 'finally',
  'return', 'yield', 'raise', 'pass', 'break', 'continue', 'import', 'from',
  'as', 'class', 'def', 'lambda', 'and', 'or', 'not', 'in', 'is',
  'True', 'False', 'None', 'global', 'nonlocal', 'del', 'assert', 'async', 'await',
  'print', 'len', 'range', 'list', 'dict', 'set', 'tuple', 'str', 'int',
  'float', 'bool', 'type', 'isinstance', 'hasattr', 'getattr', 'setattr',
  'callable', 'super', 'object', 'enumerate', 'zip', 'map', 'filter',
  'sorted', 'reversed', 'sum', 'min', 'max', 'abs', 'round', 'open', 'input',
]);

function parsePython(code: string): IRNode {
  _idCounter = 0;
  const root = makeNode('module', 'module', 0);
  root.lineCount = code.split('\n').length;

  const lines = code.split('\n');
  type StackEntry = { node: IRNode; indent: number };
  const stack: StackEntry[] = [{ node: root, indent: -1 }];
  const topLevelNames = new Set<string>();
  const functionBodies = new Map<string, string>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim() || line.trim().startsWith('#')) continue;

    const indent = line.length - line.trimStart().length;
    const trimmed = line.trim();

    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
      stack.pop();
    }
    const parent = stack[stack.length - 1].node;

    // import / from…import
    const importMatch =
      trimmed.match(/^import\s+(\S+)/) ?? trimmed.match(/^from\s+(\S+)\s+import/);
    if (importMatch && indent === 0) {
      root.children.push(makeNode('import', importMatch[1], 1));
      continue;
    }

    // def
    const defMatch = trimmed.match(/^(?:async\s+)?def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/);
    if (defMatch) {
      const name = defMatch[1];
      const nodeType: NodeType = parent.type === 'class' ? 'method' : 'function';
      const node = makeNode(nodeType, name, parent.depth + 1);
      node.paramCount = extractParamCount(trimmed);
      parent.children.push(node);
      if (indent === 0) topLevelNames.add(name);
      stack.push({ node, indent });

      const bodyLines: string[] = [];
      for (let j = i + 1; j < lines.length; j++) {
        const bl = lines[j];
        if (!bl.trim()) { bodyLines.push(bl); continue; }
        if ((bl.length - bl.trimStart().length) <= indent) break;
        bodyLines.push(bl);
      }
      const body = bodyLines.join('\n');
      applyAnalysis(node, analyzeBodyPython(body));
      if (indent === 0) functionBodies.set(name, body);
      continue;
    }

    // class
    const classMatch = trimmed.match(/^class\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
    if (classMatch) {
      const name = classMatch[1];
      const node = makeNode('class', name, parent.depth + 1);
      parent.children.push(node);
      if (indent === 0) topLevelNames.add(name);
      stack.push({ node, indent });
    }
  }

  // Detect calls
  for (const node of root.children) {
    if (node.type !== 'function') continue;
    const body = functionBodies.get(node.name) ?? '';
    if (!body) continue;
    const pat = /(?<![.\w])([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g;
    const calls = new Set<string>();
    let m: RegExpExecArray | null;
    while ((m = pat.exec(body)) !== null) {
      if (topLevelNames.has(m[1]) && !PYTHON_KEYWORDS.has(m[1])) calls.add(m[1]);
    }
    node.calls = Array.from(calls);
  }

  detectRecursion(root.children.filter((n) => n.type === 'function'));
  return root;
}

// ─── Generic fallback parser ──────────────────────────────────────────────────

function parseGeneric(code: string): IRNode {
  _idCounter = 0;
  const root = makeNode('module', 'module', 0);
  root.lineCount = code.split('\n').length;

  const funcPatterns = [
    /^(?:pub\s+)?(?:async\s+)?fn\s+([a-zA-Z_]\w*)/,
    /^func\s+([a-zA-Z_]\w*)/,
    /^def\s+([a-zA-Z_]\w*)/,
  ];

  for (const line of code.split('\n')) {
    const trimmed = line.trim();
    for (const pat of funcPatterns) {
      const m = trimmed.match(pat);
      if (m?.[1]) {
        const node = makeNode('function', m[1], 1);
        node.paramCount = extractParamCount(trimmed);
        root.children.push(node);
        break;
      }
    }
    const classMatch = trimmed.match(
      /^(?:pub\s+)?(?:struct|class|interface|type|enum)\s+([A-Z][a-zA-Z0-9_]*)/,
    );
    if (classMatch) root.children.push(makeNode('class', classMatch[1], 1));

    const importMatch = trimmed.match(
      /^(?:use|using|include|require|import)\s+['"<]?([a-zA-Z_./][a-zA-Z0-9_./]*)['">;]?/,
    );
    if (importMatch) root.children.push(makeNode('import', importMatch[1], 1));
  }

  return root;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function parseCode(code: string, language: Language): IRNode {
  const trimmed = code.trim();
  if (!trimmed) {
    _idCounter = 0;
    const empty = makeNode('module', 'module', 0);
    empty.lineCount = 0;
    return empty;
  }
  switch (language) {
    case 'javascript':
    case 'typescript':
      return parseJS(code);
    case 'python':
      return parsePython(code);
    default:
      return parseGeneric(code);
  }
}
