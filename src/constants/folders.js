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

// Which sizes the header button cycles through, chosen in Settings → Folders
// as a set of checkboxes. Stored as an array of states in this canonical order.
//
// `full` is always part of the cycle: it is the state every folder returns to,
// and a cycle without it could never show a folder's entries at normal size
// again. Beyond that the user picks freely, so the meaningful choice is which
// of condensed/hidden to include — and at least one must be, or the button
// would have nothing to cycle to.
export const COLLAPSE_STAGE_ORDER = [
  COLLAPSE_STATES.FULL,
  COLLAPSE_STATES.CONDENSED,
  COLLAPSE_STATES.TUCKED,
];

// Open or shut, no middle step. The condensed stage is genuinely useful but it
// is the less obvious of the two, and a two-stage button is what most people
// expect from a folder.
export const DEFAULT_COLLAPSE_STAGES = [COLLAPSE_STATES.FULL, COLLAPSE_STATES.TUCKED];

export const COLLAPSE_STAGE_LABELS = {
  [COLLAPSE_STATES.FULL]:      'Full size',
  [COLLAPSE_STATES.CONDENSED]: 'Condensed',
  [COLLAPSE_STATES.TUCKED]:    'Hidden',
};

export const COLLAPSE_STAGE_HINTS = {
  [COLLAPSE_STATES.FULL]:      'Entries at normal size — always available',
  [COLLAPSE_STATES.CONDENSED]: 'Entries shrunk to a single line each',
  [COLLAPSE_STATES.TUCKED]:    'Entries hidden, header shows the count',
};

// Read a stored setting into a usable cycle, tolerating anything: the legacy
// 'three'/'two' strings from before this was a checkbox set, a partial array,
// junk, or nothing at all. Always returns full plus at least one other stage,
// in canonical order, so the cycle can never be empty or one-state.
export function normalizeCollapseStages(value) {
  if (value === 'three') return [...COLLAPSE_STAGE_ORDER];
  if (value === 'two')   return [...DEFAULT_COLLAPSE_STAGES];

  const wanted = new Set(Array.isArray(value) ? value : []);
  const picked = COLLAPSE_STAGE_ORDER.filter(
    (state) => state === COLLAPSE_STATES.FULL || wanted.has(state),
  );
  return picked.length > 1 ? picked : [...DEFAULT_COLLAPSE_STAGES];
}

export const COLLAPSE_CYCLE = DEFAULT_COLLAPSE_STAGES;

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

// Folder filter vocabulary. `UNFILED_FILTER_ID` is a sentinel, not a folder id —
// it selects every entry sitting outside any folder, which is the "what haven't
// I organized yet" view. It can never collide with a real folder id because
// those come from `uid()`.
export const UNFILED_FILTER_ID    = '__unfiled__';
export const UNFILED_FILTER_LABEL = 'Unfiled entries';
export const ALL_FOLDERS_LABEL    = 'All folders';
export const FOLDER_FILTER_LABEL  = 'Folder';

// Label for the pseudo-target that clears an entry's folder assignment.
export const NO_FOLDER_LABEL = 'No folder';
