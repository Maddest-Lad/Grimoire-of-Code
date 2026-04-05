import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import python from 'highlight.js/lib/languages/python';
import java from 'highlight.js/lib/languages/java';
import cpp from 'highlight.js/lib/languages/cpp';
import rust from 'highlight.js/lib/languages/rust';
import go from 'highlight.js/lib/languages/go';

import type { Language } from '../types/ir';

hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('python', python);
hljs.registerLanguage('java', java);
hljs.registerLanguage('cpp', cpp);
hljs.registerLanguage('rust', rust);
hljs.registerLanguage('go', go);

const LANG_MAP: Record<string, Language> = {
  javascript: 'javascript',
  typescript: 'typescript',
  python: 'python',
  java: 'java',
  cpp: 'cpp',
  c: 'cpp',
  rust: 'rust',
  go: 'go',
};

export function detectLanguage(code: string): Language {
  if (code.trim().length < 15) return 'javascript';

  // TypeScript-specific patterns (highlight.js often misidentifies as JS)
  if (
    /:\s*(string|number|boolean|void|never|any|unknown)\b/.test(code) ||
    /\binterface\b/.test(code) ||
    /\btype\s+\w+\s*=/.test(code) ||
    /<[A-Z]\w*>/.test(code) ||
    /\bas\s+(string|number|boolean|any)\b/.test(code)
  ) {
    return 'typescript';
  }

  try {
    const result = hljs.highlightAuto(code, [
      'javascript',
      'typescript',
      'python',
      'java',
      'cpp',
      'rust',
      'go',
    ]);
    return LANG_MAP[result.language ?? ''] ?? 'javascript';
  } catch {
    return 'javascript';
  }
}
