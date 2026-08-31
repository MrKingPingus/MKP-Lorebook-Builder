// Tiered color-coded character count — format: "438 / 1500"
import { CHAR_LIMIT } from '../../constants/limits.js';
import { warningColor, charStops, isGradient, WARN_GREEN } from '../../services/warning-color.js';

export function CharCounter({ count, limit = CHAR_LIMIT, tiers, tieredEnabled = true, warningScale }) {
  const color = tieredEnabled
    ? warningColor(count, charStops(tiers, warningScale, limit), { gradient: isGradient(warningScale) })
    : WARN_GREEN;
  return (
    <span className="char-counter" style={{ color }}>
      {count} / {limit}
    </span>
  );
}
