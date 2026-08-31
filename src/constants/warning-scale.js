// Warning-colour scale modes — how a counted value (description characters,
// trigger count, title length, storage usage) becomes a colour.
//
// 'three' is the original green / yellow / red scale and stays the default, so
// nobody's existing thresholds change meaning on upgrade. 'four' inserts a
// fourth band; 'gradient' drops the steps and interpolates continuously once
// the first threshold is passed. See services/warning-color.js for how each
// metric maps its own thresholds onto the active scale — the mapping is NOT
// uniform across metrics, and the reason is documented there.
export const WARNING_SCALE_THREE    = 'three';
export const WARNING_SCALE_FOUR     = 'four';
export const WARNING_SCALE_GRADIENT = 'gradient';

export const DEFAULT_WARNING_SCALE = WARNING_SCALE_THREE;

export const WARNING_SCALES = [
  {
    id:    WARNING_SCALE_THREE,
    label: 'Three colors',
    hint:  'Green, then yellow, then red. The original scale.',
  },
  {
    id:    WARNING_SCALE_FOUR,
    label: 'Four colors',
    hint:  'Adds orange, so red is free to mean “at the limit” rather than “getting long”.',
  },
  {
    id:    WARNING_SCALE_GRADIENT,
    label: 'Gradient',
    hint:  'Green until the first threshold, then a continuous fade through orange to red.',
  },
];

/** Scales that read a third threshold. Used by the settings UI to decide how many inputs to show. */
export function scaleUsesThirdStop(mode) {
  return mode === WARNING_SCALE_FOUR || mode === WARNING_SCALE_GRADIENT;
}
