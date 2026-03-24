// "X matches in Y entries" search result count display shown alongside the search bar
export function MatchCounter({ matchCount, entryMatchCount }) {
  if (!matchCount) return null;
  return (
    <span className="match-counter">
      {matchCount} match{matchCount !== 1 ? 'es' : ''} in {entryMatchCount} entr{entryMatchCount !== 1 ? 'ies' : 'y'}
    </span>
  );
}
