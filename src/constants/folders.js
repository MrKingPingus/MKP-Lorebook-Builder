// Folder constants: curated colour swatches and the collapse-state vocabulary.
// Folders are a builder-only organization layer — they never reach any export.

// Theme-safe swatch set. Deliberately distinct from ENTRY_TYPES colours so a
// folder stripe never reads as a type colour, and picked to stay legible on
// both the dark and light themes. Custom hex is a later addition.
export const FOLDER_COLORS = [
  { id: 'slate',   label: 'Slate',   color: '#94a3b8' },
  { id: 'rose',    label: 'Rose',    color: '#fb7185' },
  { id: 'amber',   label: 'Amber',   color: '#f59e0b' },
  { id: 'lime',    label: 'Lime',    color: '#a3e635' },
  { id: 'emerald', label: 'Emerald', color: '#34d399' },
  { id: 'cyan',    label: 'Cyan',    color: '#22d3ee' },
  { id: 'indigo',  label: 'Indigo',  color: '#818cf8' },
  { id: 'fuchsia', label: 'Fuchsia', color: '#e879f9' },
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

// The order the header chevron cycles through. `condensed` needs a genuine
// compact EntryCard variant, so it stays out of the cycle until that exists —
// the state itself is already understood by the renderer.
export const COLLAPSE_CYCLE = [COLLAPSE_STATES.FULL, COLLAPSE_STATES.TUCKED];

// Glyph shown on the cycle button for each state.
export const COLLAPSE_GLYPHS = {
  [COLLAPSE_STATES.FULL]:      '▾',
  [COLLAPSE_STATES.CONDENSED]: '▸',
  [COLLAPSE_STATES.TUCKED]:    '▪',
};

export const NEW_FOLDER_NAME = 'New Folder';

// Label for the pseudo-target that clears an entry's folder assignment.
export const NO_FOLDER_LABEL = 'No folder';
