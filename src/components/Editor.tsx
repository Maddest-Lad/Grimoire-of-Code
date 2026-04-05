import MonacoEditor, { type Monaco } from '@monaco-editor/react';
import { useCallback, useRef } from 'react';
import type { Language } from '../types/ir';

const MONACO_LANG: Record<string, string> = {
  javascript: 'javascript',
  typescript: 'typescript',
  python: 'python',
  java: 'java',
  cpp: 'cpp',
  rust: 'rust',
  go: 'go',
  unknown: 'plaintext',
};

function defineGrimoireTheme(monaco: Monaco) {
  monaco.editor.defineTheme('grimoire', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'keyword', foreground: 'a78bfa' },
      { token: 'string', foreground: '6ee7b7' },
      { token: 'comment', foreground: '4a3868', fontStyle: 'italic' },
      { token: 'number', foreground: 'fbbf24' },
      { token: 'type', foreground: '60a5fa' },
    ],
    colors: {
      'editor.background': '#0d0820',
      'editor.foreground': '#c8b8e8',
      'editor.lineHighlightBackground': '#1a1030',
      'editorLineNumber.foreground': '#3d2860',
      'editorLineNumber.activeForeground': '#7c5aaa',
      'editor.selectionBackground': '#3d1a6e60',
      'editor.inactiveSelectionBackground': '#2d1254',
      'editorCursor.foreground': '#c084fc',
      'editorIndentGuide.background1': '#1a1030',
      'editorIndentGuide.activeBackground1': '#3d2060',
    },
  });
}

interface EditorProps {
  code: string;
  language: Language;
  onChange: (code: string) => void;
}

export function Editor({ code, language, onChange }: EditorProps) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = useCallback(
    (value: string | undefined) => {
      if (value === undefined) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => onChange(value), 300);
    },
    [onChange],
  );

  return (
    <MonacoEditor
      height="100%"
      language={MONACO_LANG[language] ?? 'plaintext'}
      value={code}
      onChange={handleChange}
      theme="grimoire"
      beforeMount={defineGrimoireTheme}
      options={{
        fontSize: 13,
        fontFamily: "'Cascadia Code', 'Fira Code', Consolas, monospace",
        fontLigatures: true,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        lineNumbers: 'on',
        glyphMargin: false,
        folding: false,
        lineDecorationsWidth: 0,
        lineNumbersMinChars: 3,
        padding: { top: 10, bottom: 10 },
        automaticLayout: true,
        wordWrap: 'on',
        renderLineHighlight: 'line',
        scrollbar: {
          vertical: 'auto',
          horizontal: 'hidden',
          verticalScrollbarSize: 4,
        },
        overviewRulerLanes: 0,
        hideCursorInOverviewRuler: true,
        renderWhitespace: 'none',
      }}
    />
  );
}
