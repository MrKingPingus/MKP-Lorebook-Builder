// Search query state, filtered entry derivation, highlight positions, and match count
import { useUiStore } from '../state/ui-store.js';
import { escapeRegex } from '../services/html-escape.js';

export function useSearch(entries) {
  const searchQuery  = useUiStore((s) => s.searchQuery);
  const setSearchQuery = useUiStore((s) => s.setSearchQuery);

  const query = searchQuery.trim();

  let filteredEntries = entries;
  let matchCount = 0;
  let entryMatchCount = 0;

  if (query) {
    const pattern = new RegExp(escapeRegex(query), 'gi');
    filteredEntries = entries.filter((e) => {
      const inName    = pattern.test(e.name);        pattern.lastIndex = 0;
      const inTrigger = e.triggers.some((t) => { const m = pattern.test(t); pattern.lastIndex = 0; return m; });
      const inDesc    = pattern.test(e.description); pattern.lastIndex = 0;
      return inName || inTrigger || inDesc;
    });

    for (const e of filteredEntries) {
      let entryMatches = 0;
      const countIn = (str) => {
        const m = str.match(new RegExp(escapeRegex(query), 'gi'));
        return m ? m.length : 0;
      };
      entryMatches += countIn(e.name);
      e.triggers.forEach((t) => { entryMatches += countIn(t); });
      entryMatches += countIn(e.description);
      if (entryMatches > 0) {
        matchCount += entryMatches;
        entryMatchCount++;
      }
    }
  }

  return { searchQuery, setSearchQuery, filteredEntries, matchCount, entryMatchCount, query };
}
