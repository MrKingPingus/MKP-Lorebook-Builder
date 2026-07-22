// Applies the selected theme to the document and computes contrast for the
// custom-theme editor. Plain service — touches the DOM (the <html> data-theme
// attribute + inline custom vars) but never localStorage and never React.

import { THEME_IDS, DEFAULT_THEME, CUSTOM_CORE_TOKENS } from '../constants/themes.js';

/** Apply a theme id and, for the custom theme, its core color overrides.
 *  Built-in themes are CSS blocks keyed off data-theme; custom injects the
 *  seven core tokens inline and lets the CSS derive the rest. */
export function applyTheme(theme, customColors = {}) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const id = THEME_IDS.includes(theme) ? theme : DEFAULT_THEME;
  root.setAttribute('data-theme', id);
  // Always clear prior inline custom vars first so switching away is clean.
  for (const t of CUSTOM_CORE_TOKENS) root.style.removeProperty(t.var);
  if (id === 'custom') {
    for (const t of CUSTOM_CORE_TOKENS) {
      root.style.setProperty(t.var, customColors?.[t.var] || t.default);
    }
  }
}

// --- Contrast (WCAG relative luminance) — used by the custom editor readout ---

function channel(c) {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function parseHex(hex) {
  if (typeof hex !== 'string') return null;
  let h = hex.trim().replace(/^#/, '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (h.length !== 6 || /[^0-9a-fA-F]/.test(h)) return null;
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}

function luminance(rgb) {
  const [r, g, b] = rgb.map(channel);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio (1–21) between two hex colors, or null if unparseable. */
export function contrastRatio(hexA, hexB) {
  const a = parseHex(hexA);
  const b = parseHex(hexB);
  if (!a || !b) return null;
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** WCAG rating for body text at a given ratio. */
export function contrastRating(ratio) {
  if (ratio == null) return '';
  if (ratio >= 7)   return 'AAA';
  if (ratio >= 4.5) return 'AA';
  if (ratio >= 3)   return 'AA Large';
  return 'Fail';
}
