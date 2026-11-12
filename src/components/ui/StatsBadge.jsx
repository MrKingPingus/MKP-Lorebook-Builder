// Combined trigger/max and char/limit badge — format: "4/25 trg 438/1500 chr"
// Both halves use the same threshold coloring as TriggerChips and CharCounter.
import { MAX_TRIGGERS, CHAR_LIMIT } from '../../constants/limits.js';
import {
  warningColor, charStops, triggerStops, isGradient, WARN_GREEN,
} from '../../services/warning-color.js';

export function StatsBadge({ triggerCount, charCount, counterTiers, tieredEnabled = true, warningScale }) {
  const gradient = isGradient(warningScale);

  const trgColor = warningColor(triggerCount, triggerStops(warningScale), { gradient });
  const chrColor = tieredEnabled
    ? warningColor(charCount, charStops(counterTiers, warningScale), { gradient })
    : WARN_GREEN;

  return (
    <span className="stats-badge">
      <span style={{ color: trgColor }}>{triggerCount}/{MAX_TRIGGERS} trg</span>
      {' '}
      <span style={{ color: chrColor }}>{charCount}/{CHAR_LIMIT} chr</span>
    </span>
  );
}
