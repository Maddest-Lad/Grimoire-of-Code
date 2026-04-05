import { create } from 'zustand';
import type { Language } from '../types/ir';

const DEFAULT_CODE = `import { createHash } from 'crypto'
import { readFile } from 'fs/promises'

class Codex {
  constructor(name) {
    this.name = name
    this.runes = []
  }

  add(rune) {
    this.runes.push(rune)
    return this
  }

  compile() {
    return this.runes.join('')
  }
}

function parseGrimoire(source) {
  const lines = source.split('\\n')
  const tokens = tokenize(lines.join(' '))
  return weave(tokens)
}

function tokenize(text) {
  return text.match(/[a-zA-Z_$]\\w*/g) ?? []
}

function weave(tokens) {
  return tokens.reduce((sigil, token) => {
    return sigil + encode(token)
  }, '')
}

function encode(text) {
  return text.split('').map(c => c.charCodeAt(0).toString(16)).join('')
}

function isRune(char) {
  return /[a-z_$]/i.test(char)
}

function isValid(token) {
  return token.length > 0 && isRune(token[0])
}

async function loadCodex(path) {
  const raw = await readFile(path, 'utf8')
  return parseGrimoire(raw)
}

const codex = new Codex('Arcanum')
`;

interface StoreState {
  code: string;
  selectedLanguage: Language | 'auto';
  setCode: (code: string) => void;
  setSelectedLanguage: (lang: Language | 'auto') => void;
}

export const useStore = create<StoreState>((set) => ({
  code: DEFAULT_CODE,
  selectedLanguage: 'auto',
  setCode: (code) => set({ code }),
  setSelectedLanguage: (lang) => set({ selectedLanguage: lang }),
}));
