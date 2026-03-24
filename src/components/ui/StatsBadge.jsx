// Combined trigger/max and char/limit badge — format: "4/25 trg 438/1500 chr"
import { MAX_TRIGGERS } from '../../constants/limits.js';
import { CHAR_LIMIT }   from '../../constants/limits.js';

export function StatsBadge({ triggerCount, charCount }) {
  return (
    <span className="stats-badge">
      {triggerCount}/{MAX_TRIGGERS} trg {charCount}/{CHAR_LIMIT} chr
    </span>
  );
}
