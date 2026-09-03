// Soft character-count warning for entry titles. Stays hidden until the title
// reaches the warn threshold, then shows an advisory "n / 50" that tiers up to
// red at the cap. The cap mirrors CharSnap but is never enforced — long titles
// are still allowed, matching the app's other soft limits.
//
// Because the counter is hidden below the first threshold it never paints its
// base colour, which is why nothing here passes one.
import { TITLE_CHAR_LIMIT, TITLE_WARN_YELLOW } from '../../constants/limits.js';
import { warningColor, titleStops, isGradient } from '../../services/warning-color.js';

export function TitleCharCounter({ length, warningScale }) {
  if (length < TITLE_WARN_YELLOW) return null;
  const color = warningColor(length, titleStops(warningScale), { gradient: isGradient(warningScale) });
  return (
    <span className="title-char-counter" style={{ color }}>
      {length} / {TITLE_CHAR_LIMIT}
    </span>
  );
}
