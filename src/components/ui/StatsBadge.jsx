// Combined trigger/max and char/limit badge — format: "4/25 trg 438/1500 chr"
// Both halves use the same threshold coloring as TriggerChips and CharCounter.
import { MAX_TRIGGERS, TRIGGER_WARN_YELLOW, CHAR_LIMIT } from '../../constants/limits.js';

export function StatsBadge({ triggerCount, charCount, counterTiers, tieredEnabled = true }) {
  const { yellow: charYellow = 750, red: charRed = 1000 } = counterTiers ?? {};

  const trgColor = triggerCount >= MAX_TRIGGERS      ? 'var(--red)'
    : triggerCount >= TRIGGER_WARN_YELLOW             ? 'var(--yellow)'
    : 'var(--green)';

  const chrColor = tieredEnabled
    ? (charCount >= charRed    ? 'var(--red)'
      : charCount >= charYellow ? 'var(--yellow)'
      : 'var(--green)')
    : 'var(--muted2)';

  return (
    <span className="stats-badge">
      <span style={{ color: trgColor }}>{triggerCount}/{MAX_TRIGGERS} trg</span>
      {' '}
      <span style={{ color: chrColor }}>{charCount}/{CHAR_LIMIT} chr</span>
    </span>
  );
}
