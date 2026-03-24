// Find and Replace row — second input for replacement text and a Replace All action button
import { useFindReplace } from '../../hooks/use-find-replace.js';

export function FindReplace({ entries }) {
  const { findText, setFindText, replaceText, setReplaceText, matchCount, replaceAll } =
    useFindReplace(entries);

  return (
    <div className="find-replace-row">
      <input
        className="find-input"
        value={findText}
        onChange={(e) => setFindText(e.target.value)}
        placeholder="Find…"
      />
      <input
        className="replace-input"
        value={replaceText}
        onChange={(e) => setReplaceText(e.target.value)}
        placeholder="Replace with…"
      />
      <button
        className="replace-all-btn"
        onClick={replaceAll}
        disabled={!findText || matchCount === 0}
      >
        Replace all ({matchCount})
      </button>
    </div>
  );
}
