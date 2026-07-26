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

// The order the header chevron cycles through. Three-stage mirrors Reaper's
// folder button (full size → compact rows → hidden entirely); two-stage drops
// the middle step for people who only ever want open or shut. Chosen in
// Settings → Folders; see `folderCollapseStages`.
export const COLLAPSE_CYCLES = {
  three: [COLLAPSE_STATES.FULL, COLLAPSE_STATES.CONDENSED, COLLAPSE_STATES.TUCKED],
  two:   [COLLAPSE_STATES.FULL, COLLAPSE_STATES.TUCKED],
};

export const DEFAULT_COLLAPSE_STAGES = 'three';

export const COLLAPSE_STAGE_OPTIONS = [
  { id: 'three', label: 'Three stages (full · condensed · hidden)' },
  { id: 'two',   label: 'Two stages (full · hidden)' },
];

export const COLLAPSE_CYCLE = COLLAPSE_CYCLES[DEFAULT_COLLAPSE_STAGES];

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

// How many folder levels deep nesting may go (1 = top level). Each level costs
// 21px of indent, and a crosstalk pane is only ~360px wide, so an uncapped tree
// would let a user nest their way into rows too narrow to read. Three covers
// the Reaper-style master → group → contents shape with room to spare.
export const MAX_FOLDER_DEPTH = 3;

// Collapse states ranked by how much they hide. A child renders at the most
// collapsed of its own state and whatever it inherits from an ancestor, so a
// condensed parent compacts its subtree without overwriting what each child
// had set for itself.
export const COLLAPSE_SEVERITY = {
  [COLLAPSE_STATES.FULL]:      0,
  [COLLAPSE_STATES.CONDENSED]: 1,
  [COLLAPSE_STATES.TUCKED]:    2,
};

export const TOP_LEVEL_LABEL = 'Top level';

// Label for the pseudo-target that clears an entry's folder assignment.
export const NO_FOLDER_LABEL = 'No folder';
