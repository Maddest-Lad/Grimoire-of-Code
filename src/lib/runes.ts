/**
 * Deterministic rune/glyph encoding for the rotating band decorations.
 * All functions are pure and produce stable output for the same input.
 */

// Curated set of Unicode glyphs that look arcane when composed
const GLYPH_SET = [
  // Elder Futhark runes
  'ᚠ', 'ᚢ', 'ᚦ', 'ᚨ', 'ᚱ', 'ᚲ', 'ᚷ', 'ᚹ', 'ᚺ', 'ᚾ',
  'ᛁ', 'ᛃ', 'ᛇ', 'ᛈ', 'ᛉ', 'ᛊ', 'ᛏ', 'ᛒ', 'ᛖ', 'ᛗ',
  'ᛚ', 'ᛜ', 'ᛞ', 'ᛟ',
  // Geometric + occult symbols
  '⊕', '⊗', '⊙', '⊚', '⊛',
  '✦', '✧', '◈', '◉', '◊', '◌',
  '☽', '☾', '⁂', '※', '∴', '∵',
  // Geometric shapes
  '△', '▽', '◇', '⬡', '⬟',
  '⌀', '⍟',
  // Letterlike
  'ℵ', 'ℶ', 'ℜ', 'ℑ', 'ℏ',
];

/** djb2-style 32-bit hash — stable across calls */
export function djb2(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (((hash << 5) + hash) ^ str.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/** Stable short rune string for a single identifier (used for future per-node chips) */
export function nameToRunes(name: string, length = 3): string {
  let h = djb2(name);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += GLYPH_SET[h % GLYPH_SET.length];
    h = djb2(String(h) + i);
  }
  return result;
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
    parts.push(GLYPH_SET[h % GLYPH_SET.length]);
    parts.push(' ');
    h = djb2(String(h) + i);
  }
  return parts.join('');
}
