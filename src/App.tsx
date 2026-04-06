import { useMemo } from 'react';
import { useStore } from './store/useStore';
import { detectLanguage } from './lib/detect';
import { parseCode } from './lib/parser';
import { computeLayout } from './lib/layout';
import { Editor } from './components/Editor';
import { MagicCircle } from './components/MagicCircle';
import type { IRNode, Language } from './types/ir';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function countNodes(ir: IRNode): number {
  return 1 + ir.children.reduce((sum, child) => sum + countNodes(child), 0);
}

const LANGUAGES: { value: Language | 'auto'; label: string }[] = [
  { value: 'auto',       label: 'Auto' },
  { value: 'javascript', label: 'JS' },
  { value: 'typescript', label: 'TS' },
  { value: 'python',     label: 'Python' },
  { value: 'java',       label: 'Java' },
  { value: 'cpp',        label: 'C++' },
  { value: 'rust',       label: 'Rust' },
  { value: 'go',         label: 'Go' },
];

// ─── Language selector ────────────────────────────────────────────────────────

interface LangSelectorProps {
  selected: Language | 'auto';
  detected: Language;
  onChange: (lang: Language | 'auto') => void;
}

function LanguageSelector({ selected, detected, onChange }: LangSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      {selected === 'auto' && (
        <span
          className="text-xs font-mono px-1.5 py-0.5 rounded"
          style={{ color: '#34d399', background: '#0e2820' }}
        >
          ~{detected}
        </span>
      )}
      <select
        value={selected}
        onChange={(e) => onChange(e.target.value as Language | 'auto')}
        className="text-xs font-mono rounded px-2 py-1 outline-none cursor-pointer"
        style={{ background: '#1a0a2e', border: '1px solid #4a2080', color: '#c8b8e8' }}
        onFocus={(e) => (e.currentTarget.style.borderColor = '#7c3aed')}
        onBlur={(e)  => (e.currentTarget.style.borderColor = '#4a2080')}
      >
        {LANGUAGES.map((l) => (
          <option key={l.value} value={l.value}>{l.label}</option>
        ))}
      </select>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const { code, selectedLanguage, showLabels, setCode, setSelectedLanguage, setShowLabels } = useStore();

  const effectiveLanguage = useMemo<Language>(() => {
    if (selectedLanguage !== 'auto') return selectedLanguage;
    return detectLanguage(code);
  }, [code, selectedLanguage]);

  const ir = useMemo(() => {
    if (code.trim().length < 5) return null;
    return parseCode(code, effectiveLanguage);
  }, [code, effectiveLanguage]);

  const layoutResult = useMemo(() => {
    if (!ir) return null;
    return computeLayout(ir);
  }, [ir]);

  const layout           = layoutResult?.root             ?? null;
  const metrics          = layoutResult?.metrics          ?? null;
  const subCircles       = layoutResult?.subCircles       ?? [];
  const inscribedShapes  = layoutResult?.inscribedShapes  ?? [];
  const satelliteCircles = layoutResult?.satelliteCircles ?? [];

  const nodeCount = useMemo(() => (ir ? countNodes(ir) - 1 : 0), [ir]);

  return (
    <div
      className="flex h-full w-full overflow-hidden"
      style={{ background: '#080814', color: '#e2e8f0' }}
    >
      {/* ── Left pane: editor ──────────────────────────────── */}
      <div
        className="flex flex-col"
        style={{ width: '42%', borderRight: '1px solid #2d1254' }}
      >
        <div
          className="flex items-center justify-between px-4 py-2 shrink-0"
          style={{ background: '#0d0820', borderBottom: '1px solid #2d1254' }}
        >
          <span className="font-mono text-sm font-bold" style={{ color: '#c084fc' }}>
            ✦ Grimoire of Code
          </span>
          <LanguageSelector
            selected={selectedLanguage}
            detected={effectiveLanguage}
            onChange={setSelectedLanguage}
          />
        </div>
        <div className="flex-1 min-h-0">
          <Editor code={code} language={effectiveLanguage} onChange={setCode} />
        </div>
      </div>

      {/* ── Right pane: visualization ──────────────────────── */}
      <div className="flex flex-col" style={{ flex: 1 }}>
        <div
          className="flex items-center justify-between px-4 py-2 shrink-0"
          style={{ background: '#0d0820', borderBottom: '1px solid #2d1254' }}
        >
          <div className="flex items-center gap-3">
            {ir && ir.lineCount > 0 ? (
              <>
                <Stat label="nodes"    value={nodeCount} />
                <Stat label="lines"    value={ir.lineCount} />
                {metrics && metrics.totalLoops > 0 &&
                  <Stat label="loops"    value={metrics.totalLoops} />}
                {metrics && metrics.totalBranches > 0 &&
                  <Stat label="branches" value={metrics.totalBranches} />}
                {metrics && metrics.totalTries > 0 &&
                  <Stat label="try"      value={metrics.totalTries} />}
              </>
            ) : (
              <span className="font-mono text-xs" style={{ color: '#3d2860' }}>
                awaiting incantation…
              </span>
            )}
          </div>
          <button
            onClick={() => setShowLabels(!showLabels)}
            className="font-mono text-xs px-2 py-1 rounded cursor-pointer"
            style={{
              background: showLabels ? '#1e0a3e' : '#0d0820',
              border: '1px solid #4a2080',
              color: showLabels ? '#c084fc' : '#4a2880',
            }}
            title={showLabels ? 'Hide labels (hover to reveal)' : 'Show all labels'}
          >
            {showLabels ? 'Aa' : 'Aa'}
          </button>
        </div>
        <div className="flex-1 min-h-0">
          <MagicCircle layout={layout} metrics={metrics} language={effectiveLanguage} subCircles={subCircles} inscribedShapes={inscribedShapes} satelliteCircles={satelliteCircles} showLabels={showLabels} />
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <span className="font-mono text-xs" style={{ color: '#6b4f9e' }}>
      <span style={{ color: '#9b79c8' }}>{value}</span>
      {' '}{label}
    </span>
  );
}
