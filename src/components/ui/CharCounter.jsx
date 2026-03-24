// Tiered color-coded character count — format: "438 / 1500"
import { CHAR_LIMIT } from '../../constants/limits.js';

export function CharCounter({ count, limit = CHAR_LIMIT, tiers }) {
  const { yellow = 400, red = 600 } = tiers ?? {};
  const color = count >= red ? 'var(--red)' : count >= yellow ? 'var(--yellow)' : 'var(--green)';
  return (
    <span className="char-counter" style={{ color }}>
      {count} / {limit}
    </span>
  );
}
