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

/**
 * Gradient mode only: the fraction of the way to the first threshold at which
 * green starts giving way to yellow. Below it the colour is flat green.
 *
 * Proportional rather than a fixed character count so it tracks whatever
 * thresholds the user sets — someone warning at 400 characters should not get
 * the same 250-character run-up as someone warning at 1500. At the default
 * 750-character threshold this puts the hand-off at 500, i.e. the last 250
 * characters fade.
 *
 * Without it a gradient snaps from flat green straight to full yellow at the
 * threshold, which is a step — the one thing the gradient scale exists to
 * avoid — and it makes the threshold the only edge on an otherwise smooth ramp.
 */
export const GRADIENT_GREEN_HOLD = 2 / 3;

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
    hint:  'A continuous fade: green, easing into yellow as it nears your first threshold, then on through orange to red.',
  },
];

/** Scales that read a third threshold. Used by the settings UI to decide how many inputs to show. */
export function scaleUsesThirdStop(mode) {
  return mode === WARNING_SCALE_FOUR || mode === WARNING_SCALE_GRADIENT;
}
