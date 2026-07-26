// Folder constants: curated colour swatches and the collapse-state vocabulary.
// Folders are a builder-only organization layer — they never reach any export.

// Pastel swatch set, chosen to sit clearly apart from the mid-saturation
// ENTRY_TYPES palette so a folder stripe can never be misread as a type colour.
// These are fill colours only — swatch dots, header stripes, indent rails.
// Pastels don't carry enough contrast to be used as text on the light theme, so
// nothing renders label text in a folder colour. Custom hex is a later addition.
export const FOLDER_COLORS = [
  { id: 'blush',      label: 'Blush',      color: '#f4b8c1' },
  { id: 'peach',      label: 'Peach',      color: '#f8cba6' },
  { id: 'butter',     label: 'Butter',     color: '#f0e4a8' },
  { id: 'sage',       label: 'Sage',       color: '#c6dcae' },
  { id: 'mint',       label: 'Mint',       color: '#a9e0cd' },
  { id: 'sky',        label: 'Sky',        color: '#a9d3ee' },
  { id: 'periwinkle', label: 'Periwinkle', color: '#bcc2f2' },
  { id: 'lilac',      label: 'Lilac',      color: '#d9bdf0' },
];

export const DEFAULT_FOLDER_COLOR = FOLDER_COLORS[0].color;

// Three collapse degrees, mirroring the Reaper track-folder behaviour:
//   full      — entries render at normal size, indented under the header
//   condensed — entries shrink to a compact name + a couple of controls
//   tucked    — entries hide entirely; the header shows a count
export const COLLAPSE_STATES = {
  FULL:      'full',
  CONDENSED: 'condensed',
  TUCKED:    'tucked',
};

export const DEFAULT_COLLAPSE_STATE = COLLAPSE_STATES.FULL;

// The order the header chevron cycles through, mirroring Reaper's three-stage
// folder button: full size → compact rows → hidden entirely.
export const COLLAPSE_CYCLE = [
  COLLAPSE_STATES.FULL,
  COLLAPSE_STATES.CONDENSED,
  COLLAPSE_STATES.TUCKED,
];

// What each state does to the entries below the header, for tooltips.
export const COLLAPSE_LABELS = {
  [COLLAPSE_STATES.FULL]:      'Entries at full size',
  [COLLAPSE_STATES.CONDENSED]: 'Entries condensed to a single line',
  [COLLAPSE_STATES.TUCKED]:    'Entries hidden',
};

// Glyph shown on the cycle button for each state.
export const COLLAPSE_GLYPHS = {
  [COLLAPSE_STATES.FULL]:      '▾',
  [COLLAPSE_STATES.CONDENSED]: '▸',
  [COLLAPSE_STATES.TUCKED]:    '▪',
};

export const NEW_FOLDER_NAME = 'New Folder';

// Label for the pseudo-target that clears an entry's folder assignment.
export const NO_FOLDER_LABEL = 'No folder';
