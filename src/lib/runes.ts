/**
 * Deterministic rune/glyph encoding for the rotating band decorations.
 * All functions are pure and produce stable output for the same input.
 */

import type { NodeType } from '../types/ir';

// ─── Glyph alphabets per semantic role ──────────────────────────────────────

/** Elder Futhark runes — used for functions */
const FUTHARK = [
  'ᚠ', 'ᚢ', 'ᚦ', 'ᚨ', 'ᚱ', 'ᚲ', 'ᚷ', 'ᚹ', 'ᚺ', 'ᚾ',
  'ᛁ', 'ᛃ', 'ᛇ', 'ᛈ', 'ᛉ', 'ᛊ', 'ᛏ', 'ᛒ', 'ᛖ', 'ᛗ',
  'ᛚ', 'ᛜ', 'ᛞ', 'ᛟ',
];

/** Greek letters — used for classes */
const GREEK = [
  'α', 'β', 'γ', 'δ', 'ε', 'ζ', 'η', 'θ', 'ι', 'κ',
  'λ', 'μ', 'ν', 'ξ', 'π', 'ρ', 'σ', 'τ', 'υ', 'φ',
  'χ', 'ψ', 'ω', 'Σ', 'Δ', 'Φ', 'Ψ', 'Ω',
];

/** Planetary/astrological symbols — used for imports */
const PLANETARY = [
  '☉', '☽', '☿', '♀', '♂', '♃', '♄', '⛢', '♆', '⚳',
  '⚴', '⚵', '⚶', '⚷', '☌', '☍', '△', '□', '⚹', '☊',
  '☋', '⊕', '⊗', '⊙',
];

/** Mathematical operators — used for variables */
const MATHEMATICAL = [
  '∑', '∏', '∫', '∂', '∇', '∞', '≈', '≠', '≤', '≥',
  '∈', '∉', '⊂', '⊃', '∪', '∩', '∧', '∨', '⊕', '⊗',
  '∅', '℘', 'ℵ', 'ℶ',
];

/** Cyan-themed symbols — used for methods */
const METHOD_GLYPHS = [
  '⟐', '⟡', '⬡', '⬢', '◈', '◇', '◆', '⬟', '⎔', '⌬',
  '⏣', '⏢', '⬠', '⬣', '⎊', '⏥', '⊞', '⊟', '⊠', '⊡',
];

/** Mixed occult/geometric — general fallback */
const GENERAL_GLYPHS = [
  'ᚠ', 'ᚢ', 'ᚦ', 'ᚨ', 'ᚱ', 'ᚲ', 'ᚷ', 'ᚹ', 'ᚺ', 'ᚾ',
  'ᛁ', 'ᛃ', 'ᛇ', 'ᛈ', 'ᛉ', 'ᛊ', 'ᛏ', 'ᛒ', 'ᛖ', 'ᛗ',
  'ᛚ', 'ᛜ', 'ᛞ', 'ᛟ',
  '⊕', '⊗', '⊙', '⊚', '⊛',
  '✦', '✧', '◈', '◉', '◊', '◌',
  '☽', '☾', '⁂', '※', '∴', '∵',
  '△', '▽', '◇', '⬡', '⬟',
  '⌀', '⍟',
  'ℵ', 'ℶ', 'ℜ', 'ℑ', 'ℏ',
];

/** Map node types to their glyph alphabet */
const GLYPH_SETS: Record<string, string[]> = {
  function: FUTHARK,
  method:   METHOD_GLYPHS,
  class:    GREEK,
  import:   PLANETARY,
  variable: MATHEMATICAL,
  module:   GENERAL_GLYPHS,
  control:  GENERAL_GLYPHS,
};

// ─── Hash function ──────────────────────────────────────────────────────────

/** djb2-style 32-bit hash — stable across calls */
export function djb2(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (((hash << 5) + hash) ^ str.charCodeAt(i)) >>> 0;
  }
  return hash;
}

// ─── Encoding functions ─────────────────────────────────────────────────────

/** Encode a single name using the appropriate glyph alphabet for its node type */
export function encodeByType(name: string, type: NodeType): string {
  const glyphs = GLYPH_SETS[type] || GENERAL_GLYPHS;
  let h = djb2(name);
  let result = '';
  // Generate 2-4 glyphs per name depending on name length
  const count = Math.min(Math.max(Math.ceil(name.length / 3), 2), 4);
  for (let i = 0; i < count; i++) {
    result += glyphs[h % glyphs.length];
    h = djb2(String(h) + i);
  }
  return result;
}

/** Stable short rune string for a single identifier */
export function nameToRunes(name: string, length = 3): string {
  let h = djb2(name);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += GENERAL_GLYPHS[h % GENERAL_GLYPHS.length];
    h = djb2(String(h) + i);
  }
  return result;
}

/**
 * Generate a semantic band string from typed nodes.
 * Each node contributes glyphs from its type-specific alphabet,
 * with spacing proportional to its complexity.
 */
export function generateSemanticBand(
  nodes: Array<{ name: string; type: NodeType; complexity: number }>,
  maxGlyphs = 150,
): string {
  if (nodes.length === 0) return moduleRunes('grimoire', maxGlyphs);

  const parts: string[] = [];
  let total = 0;

  for (const node of nodes) {
    if (total >= maxGlyphs) break;

    const encoded = encodeByType(node.name, node.type);
    parts.push(encoded);

    // Spacer: fewer spaces for complex functions (denser runes), more for simple ones
    const spacerCount = Math.max(1, 3 - Math.floor(node.complexity / 4));
    parts.push(' '.repeat(spacerCount));

    total += encoded.length + spacerCount;
  }

  // If we haven't filled the band, repeat with offset
  let fillPass = 0;
  while (total < maxGlyphs && nodes.length > 0) {
    fillPass++;
    for (const node of nodes) {
      if (total >= maxGlyphs) break;
      const glyphs = GLYPH_SETS[node.type] || GENERAL_GLYPHS;
      let h = djb2(node.name + fillPass);
      const count = 2;
      let segment = '';
      for (let i = 0; i < count; i++) {
        segment += glyphs[h % glyphs.length];
        h = djb2(String(h) + i + fillPass);
      }
      parts.push(segment + ' ');
      total += count + 1;
    }
  }

  return parts.join('');
}

/**
 * Generates a rune string long enough to fill an SVG textPath band.
 * `seed` should be the concatenated list of all module identifiers.
 * `count` controls how many glyphs are generated (with spacers).
 */
export function moduleRunes(seed: string, count: number): string {
  let h = djb2(seed || 'grimoire');
  const parts: string[] = [];
  for (let i = 0; i < count; i++) {
    parts.push(GENERAL_GLYPHS[h % GENERAL_GLYPHS.length]);
    parts.push(' ');
    h = djb2(String(h) + i);
  }
  return parts.join('');
}
