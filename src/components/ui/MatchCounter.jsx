// Search result count display shown alongside the search bar. In single-pane
// mode renders "X matches in Y entries"; in crosstalk mode shows compact
// per-role counts (Active N · Reference N) so reference-side hits are visible.
import { Fragment } from 'react';

export function MatchCounter({ matches = [] }) {
  const total = matches.reduce((sum, m) => sum + m.matchCount, 0);
  if (!total) return null;

  if (matches.length === 1) {
    const { matchCount, entryMatchCount } = matches[0];
    return (
      <span className="match-counter">
        {matchCount} match{matchCount !== 1 ? 'es' : ''} in {entryMatchCount} entr{entryMatchCount !== 1 ? 'ies' : 'y'}
      </span>
    );
  }

  return (
    <span className="match-counter match-counter--multi">
      {matches.map((m, i) => (
        <Fragment key={m.role}>
          {i > 0 && <span className="match-counter-sep">·</span>}
          <span className="match-counter-role">{m.role}</span>
          <span className="match-counter-count">{m.matchCount}</span>
        </Fragment>
      ))}
    </span>
  );
}
