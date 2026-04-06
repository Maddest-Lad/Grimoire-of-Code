import { create } from 'zustand';
import type { Language } from '../types/ir';

const DEFAULT_CODE = `import { createHash } from 'crypto'
import { readFile } from 'fs/promises'
import './rituals/bindings'
import '@arcane/sigil-core'
import chalk from 'chalk'

const MAX_DEPTH = 7

class Grimoire {
  constructor(name, author, tradition) {
    this.name = name
    this.chapters = []
  }

  addChapter(ch) {
    this.chapters.push(ch)
    return this
  }

  compile(format, target, opts) {
    for (const ch of this.chapters) {
      try {
        const out = encode(ch.text)
        if (validate(out)) return out
      } catch (e) {}
    }
  }
}

function invokeSpell(source, format, depth) {
  if (depth > MAX_DEPTH) return null
  const tokens = tokenize(source)
  for (const tok of tokens) {
    for (let i = 0; i < tok.length; i++) {
      if (isRune(tok[i])) {
        try {
          const enc = encode(tok)
          if (validate(enc)) return enc
          else if (format === 'strict') throw new Error(tok)
        } catch (e) {
          return invokeSpell(tok, format, (depth ?? 0) + 1)
        }
      }
    }
  }
  return weave(tokens)
}

function tokenize(text) {
  return text.match(/[a-zA-Z_$]\\w*/g) ?? []
}

function weave(tokens) {
  return tokens.reduce((s, t) => s + encode(t), '')
}

function encode(text) {
  return createHash('sha256').update(text).digest('hex').slice(0, 8)
}

function isRune(ch) {
  return /[a-z_$]/i.test(ch)
}

function validate(encoded) {
  if (!encoded || encoded.length === 0) return false
  return /^[0-9a-f]+$/.test(encoded)
}

async function loadGrimoire(filePath, opts, fallback) {
  try {
    const raw = await readFile(filePath, 'utf8')
    return JSON.parse(raw)
  } catch (e) {
    try {
      return JSON.parse(await readFile(filePath + '.bak', 'utf8'))
    } catch (inner) {
      return null
    }
  }
}

const arcanum = new Grimoire('Arcanum', 'Unknown', 'Hermetic')
`;

interface StoreState {
  code: string;
  selectedLanguage: Language | 'auto';
  showLabels: boolean;
  setCode: (code: string) => void;
  setSelectedLanguage: (lang: Language | 'auto') => void;
  setShowLabels: (show: boolean) => void;
}

export const useStore = create<StoreState>((set) => ({
  code: DEFAULT_CODE,
  selectedLanguage: 'auto',
  showLabels: true,
  setCode: (code) => set({ code }),
  setSelectedLanguage: (lang) => set({ selectedLanguage: lang }),
  setShowLabels: (show) => set({ showLabels: show }),
}));
