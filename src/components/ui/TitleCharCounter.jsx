// Soft character-count warning for entry titles. Stays hidden until the title
// reaches the warn threshold, then shows an advisory "n / 50" that tiers to red
// at the cap. The cap mirrors CharSnap but is never enforced — long titles are
// still allowed, matching the app's other soft limits.
import { TITLE_CHAR_LIMIT, TITLE_WARN_YELLOW } from '../../constants/limits.js';

export function TitleCharCounter({ length }) {
  if (length < TITLE_WARN_YELLOW) return null;
  const color = length >= TITLE_CHAR_LIMIT ? 'var(--red)' : 'var(--yellow)';
  return (
    <span className="title-char-counter" style={{ color }}>
      {length} / {TITLE_CHAR_LIMIT}
    </span>
  );
}
