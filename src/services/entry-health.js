// Entry health evaluator — pure function; returns structured findings for a single entry.
// Used by: empty field warnings, duplicate detection, limit override toggles.
import { CHAR_WARN_YELLOW, CHAR_WARN_RED, TRIGGER_WARN_YELLOW, MAX_TRIGGERS } from '../constants/limits.js';

/**
 * evaluateEntry(entry, { counterTiers? })
 * counterTiers overrides the default yellow/red thresholds (from user settings).
 * Returns a plain findings object — no React, no side effects.
 */
export function evaluateEntry(entry, { counterTiers } = {}) {
  const yellowThreshold = counterTiers?.yellow ?? CHAR_WARN_YELLOW;
  const redThreshold    = counterTiers?.red    ?? CHAR_WARN_RED;
  const descLen         = entry.description?.length ?? 0;
  const trigCount       = entry.triggers?.length    ?? 0;

  return {
    emptyName:          !entry.name?.trim(),
    emptyDescription:   !entry.description?.trim(),
    emptyTriggers:      trigCount === 0,
    descOverYellow:     descLen   >= yellowThreshold,
    descOverRed:        descLen   >= redThreshold,
    triggersOverYellow: trigCount >= TRIGGER_WARN_YELLOW,
    triggersOverLimit:  trigCount >= MAX_TRIGGERS,
  };
}
