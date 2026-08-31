// Turns a counted value into a warning colour. One place, so the three scales
// (green/yellow/red, +orange, gradient) apply everywhere at once.
//
// Before this file the green/yellow/red ternary was hand-copied into seven call
// sites across six components, which is why the char-count textarea border was
// still reading the CONSTANT thresholds while its own counter read the user's.
//
// ── Why each metric builds its own stops ────────────────────────────────────
// The fourth colour is not inserted in the same place for every metric, because
// the three-colour scales did not all put red in the same place:
//
//   description chars  red sat at the user's danger threshold, well below the
//                      1500 cap — so four-colour APPENDS a new stop at the cap,
//                      which is exactly what GitHub #131 asked for.
//   triggers / title   red already sat at the hard cap — so four-colour INSERTS
//                      a middle stop and leaves red where it is.
//   storage            red sat at 85%, below full — so it appends, like chars.
//
// Getting this wrong would silently move an existing user's red, so the stop
// builders below are explicit per metric rather than sharing one rule.
import {
  CHAR_LIMIT, CHAR_WARN_YELLOW, CHAR_WARN_RED,
  MAX_TRIGGERS, TRIGGER_WARN_YELLOW, TRIGGER_WARN_ORANGE,
  TITLE_CHAR_LIMIT, TITLE_WARN_YELLOW, TITLE_WARN_ORANGE,
  STORAGE_WARN_THRESHOLD, STORAGE_DANGER_THRESHOLD, STORAGE_CRITICAL_THRESHOLD,
} from '../constants/limits.js';
import {
  WARNING_SCALE_GRADIENT,
  DEFAULT_WARNING_SCALE,
  scaleUsesThirdStop,
} from '../constants/warning-scale.js';

export const WARN_GREEN  = 'var(--green)';
export const WARN_YELLOW = 'var(--yellow)';
export const WARN_ORANGE = 'var(--orange)';
export const WARN_RED    = 'var(--red)';

/** Blend two CSS colours. oklab keeps the yellow→red path perceptually even —
 *  sRGB mixing dips through a muddy brown around the midpoint. Both operands
 *  are theme tokens, so a custom or high-contrast palette blends its own
 *  colours rather than hardcoded hexes. */
function mix(from, to, t) {
  const pct = Math.round(Math.max(0, Math.min(1, t)) * 100);
  if (pct <= 0)   return from;
  if (pct >= 100) return to;
  return `color-mix(in oklab, ${from} ${100 - pct}%, ${to} ${pct}%)`;
}

/** Position of `value` within [from, to], guarding a zero-or-inverted span
 *  (thresholds are user-editable and nothing stops someone typing red < yellow). */
function progress(value, from, to) {
  const span = to - from;
  if (!(span > 0)) return 1;
  return (value - from) / span;
}

/**
 * warningColor(value, stops, { gradient, base })
 *
 * `stops` is an ascending array of thresholds:
 *   [warn, danger]            → base / yellow / red
 *   [warn, danger, critical]  → base / yellow / orange / red
 *
 * `gradient` requires three stops and fades yellow→orange→red across them.
 * `base` is the below-first-threshold colour — green for entry counters, but
 * the storage ring's resting colour is muted, not green.
 */
export function warningColor(value, stops, { gradient = false, base = WARN_GREEN } = {}) {
  const [warn, danger, critical] = stops;
  if (!(value >= warn)) return base;

  if (gradient && critical != null) {
    if (value >= critical) return WARN_RED;
    if (value >= danger)   return mix(WARN_ORANGE, WARN_RED, progress(value, danger, critical));
    return mix(WARN_YELLOW, WARN_ORANGE, progress(value, warn, danger));
  }

  if (critical != null) {
    if (value >= critical) return WARN_RED;
    return value >= danger ? WARN_ORANGE : WARN_YELLOW;
  }

  return value >= danger ? WARN_RED : WARN_YELLOW;
}

export function isGradient(mode) {
  return mode === WARNING_SCALE_GRADIENT;
}

// ── Stop builders, one per metric ───────────────────────────────────────────

/**
 * Description characters. The stored `counterTiers` is the user's own set.
 *
 * Its shape grew a third number: `{ yellow, red }` became `{ yellow, orange, red }`
 * where orange is the danger stop the old `red` used to be and `red` moved up to
 * the cap. App.jsx migrates stored settings on boot; the fallback here covers a
 * value read before that runs, and treats a legacy `red` as the danger stop it
 * was — never as the new top stop, which would move the user's red by 500.
 */
export function charStops(counterTiers, mode = DEFAULT_WARNING_SCALE, limit = CHAR_LIMIT) {
  const yellow = counterTiers?.yellow ?? CHAR_WARN_YELLOW;
  const legacy = counterTiers?.orange == null;
  const danger = legacy ? (counterTiers?.red ?? CHAR_WARN_RED) : counterTiers.orange;
  const top    = legacy ? limit : (counterTiers.red ?? limit);
  return scaleUsesThirdStop(mode) ? [yellow, danger, top] : [yellow, danger];
}

/** Trigger count. Red stays at MAX_TRIGGERS in every scale; orange is inserted below it. */
export function triggerStops(mode = DEFAULT_WARNING_SCALE) {
  return scaleUsesThirdStop(mode)
    ? [TRIGGER_WARN_YELLOW, TRIGGER_WARN_ORANGE, MAX_TRIGGERS]
    : [TRIGGER_WARN_YELLOW, MAX_TRIGGERS];
}

/** Entry title length. Same shape as triggers — red is already the cap. */
export function titleStops(mode = DEFAULT_WARNING_SCALE) {
  return scaleUsesThirdStop(mode)
    ? [TITLE_WARN_YELLOW, TITLE_WARN_ORANGE, TITLE_CHAR_LIMIT]
    : [TITLE_WARN_YELLOW, TITLE_CHAR_LIMIT];
}

/** Storage usage, as a 0–1 fraction of the quota. Appends a near-full stop. */
export function storageStops(mode = DEFAULT_WARNING_SCALE) {
  return scaleUsesThirdStop(mode)
    ? [STORAGE_WARN_THRESHOLD, STORAGE_DANGER_THRESHOLD, STORAGE_CRITICAL_THRESHOLD]
    : [STORAGE_WARN_THRESHOLD, STORAGE_DANGER_THRESHOLD];
}
