// Theme registry. Built-in themes are CSS token-override blocks in style.css
// (:root[data-theme="…"]); this file only names them and defines the curated
// set of core tokens the Custom theme lets the user edit. Custom values are
// injected inline on <html>; the [data-theme="custom"] CSS block derives the
// rest of the palette from them (see style.css).

export const THEMES = [
  { id: 'dark',          label: 'Dark',          hint: 'The original dark palette.' },
  { id: 'light',         label: 'Light',         hint: 'Light background, dark text.' },
  { id: 'high-contrast', label: 'High contrast', hint: 'Maximum contrast for readability.' },
  { id: 'custom',        label: 'Custom',        hint: 'Pick your own colors.' },
];

export const THEME_IDS = THEMES.map((t) => t.id);
export const DEFAULT_THEME = 'dark';

// The seven core tokens editable in Custom mode. Defaults mirror the Dark
// palette, so a fresh Custom theme starts looking like Dark until edited. Every
// other token is derived from these in the [data-theme="custom"] CSS block.
export const CUSTOM_CORE_TOKENS = [
  { var: '--bg',      label: 'Background',   default: '#0f172a' },
  { var: '--surface', label: 'Panel',        default: '#111827' },
  { var: '--border',  label: 'Border',       default: '#374151' },
  { var: '--text',    label: 'Text',         default: '#e5e7eb' },
  { var: '--muted',   label: 'Muted text',   default: '#6b7280' },
  { var: '--accent',  label: 'Accent',       default: '#ef4444' },
  { var: '--blue',    label: 'Link / active', default: '#60a5fa' },
];
